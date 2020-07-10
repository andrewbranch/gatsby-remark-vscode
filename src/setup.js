const logger = require('loglevel');
const defaultHost = require('./host');
const validateOptions = require('./validateOptions');
const { getDefaultLineTransformers } = require('./transformers');
const { processExtensions } = require('./processExtension');

/**
 * @param {PluginOptions} options
 * @param {string} markdownAbsolutePath
 * @param {GatsbyCache} cache
 * @param {(fn: () => Promise<PluginOptions>, key?: any) => Promise<PluginOptions>} once
 * @returns {Promise<PluginOptions>}
 */
async function setup(options, markdownAbsolutePath, cache, once) {
  if (options['__getOptions__']) {
    return setupOptions(options['__getOptions__'](markdownAbsolutePath), cache);
  } else {
    return once(() => setupOptions(options, cache), 'setup');
  }
}

/**
 * @param {PluginOptions} options
 * @param {GatsbyCache} cache
 * @returns {Promise<PluginOptions>}
 */
async function setupOptions(
  {
    theme = 'Default Dark+',
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
  } = {},
  cache
) {
  logger.setLevel(logLevel);

  validateOptions({
    theme,
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
