const setup = require('../setup');
const plugin = require('../../index');
const { ensureThemeLocation } = require('../storeUtils');
const parseThemeCondition = require('./parseThemeCondition');

/**
 * @param {grvsc.gql.GRVSCThemeArgument} theme
 * @param {any} themeCache
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
 * 
 * @param {ThemeOption} theme 
 * @param {grvsc.gql.HighlightArgs} args
 * @returns {string | ThemeSettings}
 */
function getThemeOption(theme, args) {
  if (args.defaultTheme) {
    return args.additionalThemes ? 
  }
}

/**
 * @param {grvsc.gql.HighlightArgs} args
 * @param {PluginOptions} pluginOptions
 * @param {GatsbyCache} cache
 */
async function highlight(
  args,
  pluginOptions,
  cache
) {
  const {
    theme
  } = await plugin.once(() => setup(pluginOptions, cache));
  const possibleThemes =
}

module.exports = highlight;
