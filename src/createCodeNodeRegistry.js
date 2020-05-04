// @ts-check
const { boldDeclarations, italicDeclarations, underlineDeclarations } = require('./factory/css');
const { getThemePrefixedTokenClassName, concatConditionalThemes } = require('./themeUtils');
const { getTokenDataFromMetadata } = require('../lib/vscode/modes');
const { declaration } = require('./renderers/css');

/**
 * @template {Keyable} TKey
 * @param {CodeNodeRegistryOptions=} options
 * @returns {CodeNodeRegistry<TKey>}
 */
function createCodeNodeRegistry({ prefixAllClassNames } = {}) {
  /** @type {Map<TKey, RegisteredCodeNodeData>} */
  const blockMap = new Map();
  /** @type {Map<TKey, RegisteredCodeNodeData>} */
  const spanMap = new Map();
  /** @type {ConditionalTheme[]} */
  let themes = [];
  /** @type {Map<string, { colorMap: string[], settings: Record<string, string> }>} */
  const themeColors = new Map();
  /** @type {Map<string, Map<string, string>>} */
  let themeTokenClassNameMap;
  /** @type {Map<TKey, Token[][][]>} */
  let zippedLines;

  return {
    register: (key, data) => {
      const map = key.type === 'code' ? blockMap : spanMap;
      map.set(key, { ...data, index: map.size });
      themes = concatConditionalThemes(themes, data.possibleThemes);
      data.tokenizationResults.forEach(({ theme, colorMap, settings }) =>
        themeColors.set(theme.identifier, { colorMap, settings })
      );
    },
    forEachLine: (node, action) => blockMap.get(node).lines.forEach(action),
    forEachToken: (node, lineIndex, tokenAction) => {
      generateClassNames();
      const map = node.type === 'code' ? blockMap : spanMap;
      const { tokenizationResults, isTokenized, lines } = map.get(node);
      if (!isTokenized) {
        return;
      }

      const line = lines[lineIndex];
      const zipped = zippedLines.get(node)[lineIndex];

      zipped.forEach(tokens => {
        /** @type {grvsc.gql.GRVSCThemeTokenData} */
        let defaultThemeTokenData;
        /** @type {grvsc.gql.GRVSCThemeTokenData[]} */
        const additionalThemeTokenData = [];

        tokens.forEach(({ metadata }, i) => {
          const { theme } = tokenizationResults[i];
          const themeClassNames = themeTokenClassNameMap.get(theme.identifier);
          const tokenData = getTokenDataFromMetadata(metadata);
          const { colorMap } = themeColors.get(theme.identifier);
          const isDefaultTheme = theme.conditions.some(c => c.condition === 'default');
          const data = {
            themeIdentifier: theme.identifier,
            className: tokenData.classNames.map(c => themeClassNames.get(c)).join(' '),
            bold: tokenData.bold,
            italic: tokenData.italic,
            underline: tokenData.underline,
            meta: metadata,
            color: getColorFromColorMap(colorMap, tokenData.classNames[0])
          };
          if (isDefaultTheme) {
            defaultThemeTokenData = data;
          } else {
            additionalThemeTokenData.push(data);
          }
        });

        tokenAction({
          text: line.text.slice(tokens[0].start, tokens[0].end),
          startIndex: tokens[0].start,
          endIndex: tokens[0].end,
          scopes: tokens[0].scopes,
          defaultThemeTokenData,
          additionalThemeTokenData
        });
      });
    },
    forEachCodeBlock: blockMap.forEach.bind(blockMap),
    forEachCodeSpan: spanMap.forEach.bind(spanMap),
    getAllPossibleThemes: () => themes.map(theme => ({ theme, settings: themeColors.get(theme.identifier).settings })),
    getTokenStylesForTheme: themeIdentifier => {
      /** @type {ReturnType<CodeNodeRegistry['getTokenStylesForTheme']>} */
      const result = [];
      const colors = themeColors.get(themeIdentifier);
      const classNameMap = themeTokenClassNameMap && themeTokenClassNameMap.get(themeIdentifier);
      if (classNameMap) {
        classNameMap.forEach((className, canonicalClassName) => {
          if (canonicalClassName === 'mtkb') {
            result.unshift({ className, css: boldDeclarations });
          } else if (canonicalClassName === 'mtki') {
            result.unshift({ className, css: italicDeclarations });
          } else if (canonicalClassName === 'mtku') {
            result.unshift({
              className,
              css: underlineDeclarations
            });
          } else {
            result.push({
              className,
              css: [declaration('color', getColorFromColorMap(colors.colorMap, canonicalClassName))]
            });
          }
        });
      }

      return result;
    }
  };

  function generateClassNames() {
    if (themeTokenClassNameMap) return;
    themeTokenClassNameMap = new Map();
    zippedLines = new Map();
    blockMap.forEach(generate);
    spanMap.forEach(generate);

    /**
     * @param {RegisteredCodeNodeData} data
     * @param {TKey} node
     */
    function generate({ lines, tokenizationResults, isTokenized }, node) {
      if (!isTokenized) return;
      /** @type {Token[][][]} */
      const zippedLinesForNode = [];
      zippedLines.set(node, zippedLinesForNode);
      lines.forEach((_, lineIndex) => {
        const zipped = zipLineTokens(tokenizationResults.map(t => t.lines[lineIndex]));
        zippedLinesForNode[lineIndex] = zipped;
        zipped.forEach(tokensAtPosition => {
          tokensAtPosition.forEach((token, themeIndex) => {
            const canonicalClassNames = getTokenDataFromMetadata(token.metadata).classNames;
            const { theme } = tokenizationResults[themeIndex];
            let themeClassNames = themeTokenClassNameMap.get(theme.identifier);
            if (!themeClassNames) {
              themeClassNames = new Map();
              themeTokenClassNameMap.set(theme.identifier, themeClassNames);
            }
            canonicalClassNames.forEach(canonicalClassName => {
              themeClassNames.set(
                canonicalClassName,
                prefixAllClassNames || tokensAtPosition.length > 1
                  ? getThemePrefixedTokenClassName(canonicalClassName, theme.identifier)
                  : canonicalClassName
              );
            });
          });
        });
      });
    }
  }
}

/**
 * @param {Token[][]} lineTokenSets
 * @returns {Token[][]}
 * @example
 *
 * normalizeLineTokens([
 *   [{ start: 0, end: 10, metadata: X }],
 *   [{ start: 0, end:  5, metadata: Y }, { start: 5, end: 10, metadata: Z }]
 * ]);
 *
 * // Result:
 * [
 *   [{ start: 0, end:  5, metadata: X }, { start: 0, end:  5, metadata: Y }],
 *   [{ start: 5, end: 10, metadata: X }, { start: 5, end: 10, metadata: Z }]
 * ]
 */
function zipLineTokens(lineTokenSets) {
  lineTokenSets = lineTokenSets.map(lineTokens => lineTokens.slice());
  /** @type {Token[][]} */
  const result = [];
  let start = 0;
  while (true) {
    const end = Math.min(...lineTokenSets.map(lineTokens => (lineTokens[0] ? lineTokens[0].end : 0)));
    if (start >= end) break;

    /** @type {Token[]} */
    const tokensAtPosition = [];
    for (let i = 0; i < lineTokenSets.length; i++) {
      const token = lineTokenSets[i].shift();
      if (token.start === start && token.end === end) {
        tokensAtPosition.push(token);
      } else {
        tokensAtPosition.push({ start, end, metadata: token.metadata, scopes: token.scopes });
        lineTokenSets[i].unshift(token);
      }
    }
    result.push(tokensAtPosition);
    start = end;
  }

  return result;
}

/**
 * @param {string[]} colorMap
 * @param {string} canonicalClassName
 */
function getColorFromColorMap(colorMap, canonicalClassName) {
  const index = +canonicalClassName.slice('mtk'.length);
  if (!Number.isInteger(index) || index < 1) {
    throw new Error(
      `Canonical class name must be in form 'mtk{Integer greater than 0}'. Received '${canonicalClassName}'.`
    );
  }
  return colorMap[index];
}

module.exports = createCodeNodeRegistry;
