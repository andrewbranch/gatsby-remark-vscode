const { renderHTML } = require('../renderers/html');
const { partitionOne, flatMap } = require('../utils');
const { createTokenElement, createCodeSpanElement } = require('../factory/html');
const { getThemeClassNames } = require('../themeUtils');
const { joinClassNames } = require('../renderers/css');

/**
 * @template {Keyable} TKey
 * @param {CodeNodeRegistry<TKey>} registry
 * @param {TKey} key
 * @param {RegisteredCodeNodeData} codeSpan
 * @param {() => string} getClassName
 * @returns {Omit<grvsc.gql.GRVSCCodeSpan, 'id'>}
 */
function getCodeSpanDataFromRegistry(registry, key, codeSpan, getClassName) {
  const { index, languageName, text, possibleThemes } = codeSpan;
  /** @type {grvsc.HTMLElement[]} */
  const tokenElements = [];
  /** @type {grvsc.gql.GRVSCToken[]} */
  const gqlTokens = [];

  registry.forEachToken(key, 0, token => {
    const html = createTokenElement(token);
    tokenElements.push(html);
    gqlTokens.push({
      ...token,
      className: html.attributes.class,
      html: renderHTML(html)
    });
  });

  const customClassName = getClassName();
  const themeClassNames = flatMap(possibleThemes, getThemeClassNames);
  const className = joinClassNames(customClassName, ...themeClassNames);
  const html = createCodeSpanElement(index, languageName, className, tokenElements);
  const [defaultTheme, additionalThemes] = partitionOne(possibleThemes, t =>
    t.conditions.some(c => c.condition === 'default')
  );

  return {
    index,
    text,
    html: renderHTML(html),
    language: languageName,
    className: getClassName(),
    defaultTheme,
    additionalThemes,
    tokens: gqlTokens
  };
}

module.exports = getCodeSpanDataFromRegistry;
