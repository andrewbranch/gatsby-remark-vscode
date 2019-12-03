// @ts-check
const { getThemePrefixedTokenClassName } = require('./utils');
const { getClassNameFromMetadata } = require('../lib/vscode/modes');

/**
 * @returns {NodeRegistry}
 */
function createNodeRegistry() {
  /** @type {Map<object, RegisteredNodeData>} */
  const nodeMap = new Map();
  /** @type {Map<string, Map<string, string>>} */
  let themeTokenClassNameMap;
  /** @type {Map<object, BinaryToken[][]>} */
  let zippedLines;

  return {
    register: (node, data) => {
      data.tokenizationResults.forEach(({ theme }) => {
        let themeClassNames = themeTokenClassNameMap.get(theme.identifier);
        if (!themeClassNames) {
          themeClassNames = new Map();
          themeTokenClassNameMap.set(theme.identifier, themeClassNames);
        }
      });
      nodeMap.set(node, data);
    },
    mapLines: (node, mapper) => nodeMap.get(node).lines.map(mapper),
    mapTokens: (node, lineIndex, mapper) => {
      generateClassNames();
      const { tokenizationResults, lines } = nodeMap.get(node);
      const line = lines[lineIndex];
      const zipped = zippedLines.get(node);
      return zipped.map(tokens =>
        mapper(
          line.text.slice(tokens[0].start, tokens[0].end),
          tokens.map(({ metadata }, i) => {
            const { theme } = tokenizationResults[i];
            const themeClassNames = themeTokenClassNameMap.get(theme.identifier);
            const canonicalClassName = getClassNameFromMetadata(metadata);
            return {
              value: themeClassNames.get(canonicalClassName) || canonicalClassName,
              theme
            };
          })
        )
      );
    },
    forEachNode: nodeMap.forEach
  };

  function generateClassNames() {
    if (themeTokenClassNameMap) return;
    themeTokenClassNameMap = new Map();
    zippedLines = new Map();
    nodeMap.forEach(({ lines, tokenizationResults }, node) => {
      lines.forEach((_, lineIndex) => {
        const zipped = zipLineTokens(tokenizationResults.map(t => t.lines[lineIndex]));
        zippedLines.set(node, zipped);
        zipped.forEach(tokensAtPosition => {
          if (tokensAtPosition.length > 1) {
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
                getThemePrefixedTokenClassName(canonicalClassName, theme.identifier)
              );
            });
          }
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
  }

  return result;
}

module.exports = createNodeRegistry;
