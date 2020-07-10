const { renderHTML } = require('../renderers/html');
const { joinClassNames } = require('../renderers/css');
const { getThemeClassNames } = require('../themeUtils');
const { flatMap, partitionOne, escapeHTML } = require('../utils');
const { createTokenElement, createLineElement, createCodeBlockElement } = require('../factory/html');

/**
 * @template {Keyable} TKey
 * @param {CodeNodeRegistry<TKey>} registry
 * @param {TKey} key
 * @param {RegisteredCodeNodeData} codeBlock
 * @param {() => string} getWrapperClassName
 * @param {(line: LineData) => string} getLineClassName
 * @returns {Omit<grvsc.gql.GRVSCCodeBlock, 'id'>}
 */
function getCodeBlockDataFromRegistry(registry, key, codeBlock, getWrapperClassName, getLineClassName) {
  const { meta, index, languageName, text, possibleThemes, isTokenized } = codeBlock;
  /** @type {grvsc.HTMLElement[]} */
  const lineElements = [];
  /** @type {grvsc.gql.GRVSCTokenizedLine[]} */
  const gqlLines = [];
  registry.forEachLine(key, (line, lineIndex) => {
    /** @type {grvsc.HTMLElement[] | string} */
    let tokenElements;
    /** @type {grvsc.gql.GRVSCToken[]} */
    const gqlTokens = [];

    if (isTokenized) {
      registry.forEachToken(key, lineIndex, token => {
        const html = createTokenElement(token);
        // @ts-ignore - could be fixed with noImplicitAny
        (tokenElements || (tokenElements = [])).push(html);
        gqlTokens.push({
          ...token,
          className: html.attributes.class,
          html: renderHTML(html)
        });
      });
    } else {
      tokenElements = escapeHTML(line.text);
    }

    const html = createLineElement(line, meta, index, languageName, getLineClassName, tokenElements || '');
    lineElements.push(html);
    gqlLines.push({
      ...line,
      className: html.attributes.class,
      tokens: gqlTokens,
      html: renderHTML(html)
    });
  });

  const wrapperClassNameValue = getWrapperClassName();
  const themeClassNames = flatMap(possibleThemes, getThemeClassNames);
  const preClassName = joinClassNames(
    'grvsc-container',
    wrapperClassNameValue,
    codeBlock.className,
    ...themeClassNames
  );
  const codeClassName = 'grvsc-code';
  const [defaultTheme, additionalThemes] = partitionOne(possibleThemes, t =>
    t.conditions.some(c => c.condition === 'default')
  );

  return {
    index,
    text,
    meta,
    html: renderHTML(createCodeBlockElement(preClassName, codeClassName, languageName, index, lineElements)),
    preClassName,
    codeClassName,
    language: languageName,
    defaultTheme,
    additionalThemes,
    tokenizedLines: isTokenized ? gqlLines : undefined
  };
}

module.exports = getCodeBlockDataFromRegistry;
