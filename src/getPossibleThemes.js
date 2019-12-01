// @ts-check
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
    themes = concatThemes(themes, [
      {
        identifier: themeOption.prefersDarkTheme,
        path: await ensureThemeLocation(themeOption.prefersDarkTheme, themeCache, markdownNode.fileAbsolutePath),
        conditions: [{ condition: 'matchMedia', value: '(prefers-color-scheme: dark)' }]
      }
    ]);
  }
  if (themeOption.prefersLightTheme) {
    themes = concatThemes(themes, [
      {
        identifier: themeOption.prefersDarkTheme,
        path: await ensureThemeLocation(themeOption.prefersDarkTheme, themeCache, markdownNode.fileAbsolutePath),
        conditions: [{ condition: 'matchMedia', value: '(prefers-color-scheme: dark)' }]
      }
    ]);
  }

  return themes;
}

/**
 * @param {ConditionalTheme[] | undefined} arr1
 * @param {ConditionalTheme[]} arr2
 * @returns {ConditionalTheme[]}
 */
function concatThemes(arr1, arr2) {
  if (!arr1) arr1 = [];
  arr2.forEach(addTheme);
  return arr1;

  /** @param {ConditionalTheme} theme */
  function addTheme(theme) {
    const existing = arr1.find(t => t.identifier === theme.identifier);
    if (existing) {
      existing.conditions = existing.conditions.concat(theme.conditions);
    } else {
      arr1 = arr1.concat(theme);
    }
  }
}

module.exports = getPossibleThemes;
