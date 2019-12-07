// @ts-check
const { concatConditionalThemes } = require('./utils');
const { ensureThemeLocation } = require('./storeUtils');

/**
 * @param {ColorThemeOption} themeOption
 * @param {object} themeCache
 * @param {object} markdownNode
 * @param {object} codeFenceNode
 * @param {string} languageName
 * @param {object} meta
 * @returns {Promise<ConditionalTheme[]>}
 */
async function getPossibleThemes(themeOption, themeCache, markdownNode, codeFenceNode, languageName, meta) {
  if (typeof themeOption === 'function') {
    return getPossibleThemes(
      themeOption({
        markdownNode,
        codeFenceNode,
        language: languageName,
        parsedOptions: meta
      }),
      themeCache,
      markdownNode,
      codeFenceNode,
      languageName,
      meta
    );
  }

  if (typeof themeOption === 'string') {
    const path = await ensureThemeLocation(themeOption, themeCache, markdownNode.fileAbsolutePath);
    return [
      {
        identifier: themeOption,
        path,
        conditions: [{ condition: 'default' }]
      }
    ];
  }

  /** @type {ConditionalTheme[]} */
  let themes;
  if (themeOption.defaultTheme) {
    themes = await getPossibleThemes(
      themeOption.defaultTheme,
      themeCache,
      markdownNode,
      codeFenceNode,
      languageName,
      meta
    );
  }
  if (themeOption.prefersDarkTheme) {
    themes = concatConditionalThemes(themes, [
      {
        identifier: themeOption.prefersDarkTheme,
        path: await ensureThemeLocation(themeOption.prefersDarkTheme, themeCache, markdownNode.fileAbsolutePath),
        conditions: [{ condition: 'matchMedia', value: '(prefers-color-scheme: dark)' }]
      }
    ]);
  }
  if (themeOption.prefersLightTheme) {
    themes = concatConditionalThemes(themes, [
      {
        identifier: themeOption.prefersDarkTheme,
        path: await ensureThemeLocation(themeOption.prefersDarkTheme, themeCache, markdownNode.fileAbsolutePath),
        conditions: [{ condition: 'matchMedia', value: '(prefers-color-scheme: dark)' }]
      }
    ]);
  }

  return themes;
}



module.exports = getPossibleThemes;
