const logger = require('loglevel');
const defaultHost = require('./host');
const validateOptions = require('./validateOptions');
const { getDefaultLineTransformers } = require('./transformers');
const { convertLegacyThemeOption } = require('./themeUtils');
const { processExtensions } = require('./processExtension');

/**
 * @param {PluginOptions} options
 * @param {GatsbyCache} cache
 * @returns {Promise<PluginOptions>}
 */
async function setup(
  {
    theme = 'Default Dark+',
    colorTheme: legacyTheme,
    wrapperClassName = '',
    languageAliases = {},
    extensions = [],
    getLineClassName = () => '',
    injectStyles = true,
    replaceColor = x => x,
    logLevel = 'warn',
    host = defaultHost,
    getLineTransformers = getDefaultLineTransformers,
    ...rest
  },
  cache
) {
  logger.setLevel(logLevel);
  if (legacyTheme) {
    theme = convertLegacyThemeOption(legacyTheme);
  }

  validateOptions({
    theme,
    colorTheme: legacyTheme,
    wrapperClassName,
    languageAliases,
    extensions,
    getLineClassName,
    injectStyles,
    replaceColor,
    logLevel,
    host,
    getLineTransformers
  });

  await processExtensions(extensions, host, cache);
  return {
    theme,
    colorTheme: legacyTheme,
    wrapperClassName,
    languageAliases,
    extensions,
    getLineClassName,
    injectStyles,
    replaceColor,
    logLevel,
    host,
    getLineTransformers,
    ...rest
  };
}

module.exports = setup;
