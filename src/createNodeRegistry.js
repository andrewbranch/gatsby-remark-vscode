// @ts-check
const { getThemePrefixedTokenClassName, concatConditionalThemes } = require('./utils');
const { getClassNameFromMetadata } = require('../lib/vscode/modes');

/**
 * @returns {NodeRegistry}
 */
function createNodeRegistry() {
  /** @type {Map<MDASTNode, RegisteredNodeData>} */
  const nodeMap = new Map();
  /** @type {ConditionalTheme[]} */
  let themes;
  /** @type {Map<string, { colorMap: string[], settings: Record<string, string> }>} */
  const themeColors = new Map();
  /** @type {Map<string, Map<string, string>>} */
  let themeTokenClassNameMap;
  /** @type {Map<MDASTNode, BinaryToken[][][]>} */
  let zippedLines;

  return {
    register: (node, data) => {
      nodeMap.set(node, data);
      themes = concatConditionalThemes(themes, data.possibleThemes);
      data.tokenizationResults.forEach(({ theme, colorMap, settings }) => themeColors.set(theme.identifier, { colorMap, settings }));
    },
    mapLines: (node, mapper) => nodeMap.get(node).lines.map(mapper),
    mapTokens: (node, lineIndex, mapper) => {
      generateClassNames();
      const { tokenizationResults, lines } = nodeMap.get(node);
      const line = lines[lineIndex];
      const zipped = zippedLines.get(node)[lineIndex];
      return zipped.map(tokens =>
        mapper(
          line.text.slice(tokens[0].start, tokens[0].end),
          tokens.map(({ metadata }, i) => {
            const { theme } = tokenizationResults[i];
            const themeClassNames = themeTokenClassNameMap.get(theme.identifier);
            const canonicalClassName = getClassNameFromMetadata(metadata);
            return {
              value: themeClassNames.get(canonicalClassName),
              theme
            };
          })
        )
      );
    },
    forEachNode: nodeMap.forEach.bind(nodeMap),
    getAllPossibleThemes: () => themes.map(theme => ({ theme, settings: themeColors.get(theme.identifier).settings })),
    getTokenClassNamesForTheme: themeIdentifier => {
      /** @type {ReturnType<NodeRegistry['getTokenClassNamesForTheme']>} */
      const result = [];
      const colors = themeColors.get(themeIdentifier);
      themeTokenClassNameMap.get(themeIdentifier).forEach((className, canonicalClassName) => {
        result.push({ className, color: getColorFromColorMap(colors.colorMap, canonicalClassName) });
      });
      return result;
    }
  };

  function generateClassNames() {
    if (themeTokenClassNameMap) return;
    themeTokenClassNameMap = new Map();
    zippedLines = new Map();
    nodeMap.forEach(({ lines, tokenizationResults }, node) => {
      /** @type {BinaryToken[][][]} */
      const zippedLinesForNode = [];
      zippedLines.set(node, zippedLinesForNode);
      lines.forEach((_, lineIndex) => {
        const zipped = zipLineTokens(tokenizationResults.map(t => t.lines[lineIndex]));
        zippedLinesForNode[lineIndex] = zipped;
        zipped.forEach(tokensAtPosition => {
          tokensAtPosition.forEach((token, themeIndex) => {
            const canonicalClassName = getClassNameFromMetadata(token.metadata);
            const { theme } = tokenizationResults[themeIndex];
            let themeClassNames = themeTokenClassNameMap.get(theme.identifier);
            if (!themeClassNames) {
              themeClassNames = new Map();
              themeTokenClassNameMap.set(theme.identifier, themeClassNames);
            }
            themeClassNames.set(
              canonicalClassName,
              tokensAtPosition.length > 1
                ? getThemePrefixedTokenClassName(canonicalClassName, theme.identifier)
                : canonicalClassName
            );
          });
        });
      });
    });
  }
}

/**
 * @param {BinaryToken[][]} lineTokenSets
 * @returns {BinaryToken[][]}
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
  /** @type {BinaryToken[][]} */
  const result = [];
  let start = 0;
  while (true) {
    const end = Math.min(...lineTokenSets.map(lineTokens => (lineTokens[0] ? lineTokens[0].end : 0)));
    if (start >= end) break;

    /** @type {BinaryToken[]} */
    const tokensAtPosition = [];
    for (let i = 0; i < lineTokenSets.length; i++) {
      const token = lineTokenSets[i].shift();
      if (token.start === start && token.end === end) {
        tokensAtPosition.push(token);
      } else {
        tokensAtPosition.push({ start, end, metadata: token.metadata });
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
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Canonical class name must be in form 'mtk{positive integer}'. Received '${canonicalClassName}'.`);
  }
  return colorMap[index];
}

module.exports = createNodeRegistry;
