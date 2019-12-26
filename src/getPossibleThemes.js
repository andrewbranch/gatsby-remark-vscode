// @ts-check
const { concatConditionalThemes } = require('./utils');
const { ensureThemeLocation } = require('./storeUtils');

/**
 * @param {ThemeOption} themeOption
 * @param {object} themeCache
 * @param {MarkdownNode} markdownNode
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
  if (themeOption.default) {
    themes = await getPossibleThemes(themeOption.default, themeCache, markdownNode, codeFenceNode, languageName, meta);
  }
  if (themeOption.dark) {
    themes = concatConditionalThemes(themes, [
      {
        identifier: themeOption.dark,
        path: await ensureThemeLocation(themeOption.dark, themeCache, markdownNode.fileAbsolutePath),
        conditions: [{ condition: 'matchMedia', value: '(prefers-color-scheme: dark)' }]
      }
    ]);
  }
  if (themeOption.media) {
    themes = concatConditionalThemes(
      themes,
      await Promise.all(
        themeOption.media.map(async setting => ({
          identifier: setting.theme,
          path: await ensureThemeLocation(setting.theme, themeCache, markdownNode.fileAbsolutePath),
          conditions: [{ condition: /** @type {'matchMedia'} */ ('matchMedia'), value: setting.match }]
        }))
      )
    );
  }
  if (themeOption.parentSelector) {
    themes = concatConditionalThemes(
      themes,
      await Promise.all(
        Object.keys(themeOption.parentSelector).map(async key => ({
          identifier: themeOption.parentSelector[key],
          path: await ensureThemeLocation(themeOption.parentSelector[key], themeCache, markdownNode.fileAbsolutePath),
          conditions: [{ condition: /** @type {'parentSelector'} */ ('parentSelector'), value: key }]
        }))
      )
    );
  }

  return themes;
}

module.exports = getPossibleThemes;
