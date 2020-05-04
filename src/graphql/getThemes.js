const getPossibleThemes = require('../getPossibleThemes');
const { ensureThemeLocation } = require('../storeUtils');
const { createDefaultTheme, concatConditionalThemes } = require('../themeUtils');
const parseThemeCondition = require('./parseThemeCondition');

/**
 * @param {grvsc.gql.GRVSCThemeArgument} theme
 * @param {ThemeCache} themeCache
 * @returns {Promise<ConditionalTheme>}
 */
async function convertThemeArgument(theme, themeCache) {
  return {
    identifier: theme.identifier,
    path: await ensureThemeLocation(theme.identifier, themeCache, undefined),
    conditions: theme.conditions.map(parseThemeCondition)
  };
}

/**
 * @param {ThemeOption<CodeBlockData | CodeSpanData>} themeOption
 * @param {grvsc.gql.CSSArgs} args
 * @param {ThemeCache} themeCache
 * @returns {Promise<ConditionalTheme[]>}
 */
async function getThemes(themeOption, args, themeCache) {
  if (args.defaultTheme) {
    const defaultTheme = await createDefaultTheme(args.defaultTheme, themeCache);
    const additionalThemes = args.additionalThemes
      ? await Promise.all(args.additionalThemes.map(t => convertThemeArgument(t, themeCache)))
      : [];
    return concatConditionalThemes([defaultTheme], additionalThemes);
  }
  if (args.additionalThemes) {
    throw new Error(`Must provide a 'defaultTheme' if 'additionalThemes' are provided.`);
  }
  if (typeof themeOption === 'function') {
    throw new Error(
      `When plugin option 'theme' is a function, GraphQL resolvers 'grvscHighlight' and ` +
        `'grvscStylesheet' must supply a 'defaultTheme' argument. The 'theme' function will not be called while ` +
        `evaluating 'grvscHighlight'.`
    );
  }
  return getPossibleThemes(themeOption, themeCache, undefined, undefined);
}

module.exports = getThemes;
