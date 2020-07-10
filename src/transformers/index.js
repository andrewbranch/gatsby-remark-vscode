// @ts-check
const { highlightMetaTransformer } = require('./highlightMetaTransformer');
const { createHighlightDirectiveLineTransformer } = require('./highlightDirectiveLineTransformer');
const { createLineNumberLineTransformer } = require('./lineNumberTransformer');
const { createDiffLineTransformer } = require('./diffLineTransformer');
const getTransformedLines = require('./getTransformedLines');

/**
 * @param {PluginOptions} pluginOptions
 * @param {GatsbyCache} cache
 * @returns {LineTransformer[]}
 */
function getDefaultLineTransformers(pluginOptions, cache) {
  return [
    createHighlightDirectiveLineTransformer(pluginOptions.languageAliases, cache),
    highlightMetaTransformer,
    createLineNumberLineTransformer(pluginOptions.languageAliases, cache),
    createDiffLineTransformer()
  ];
}

/**
 * @param {...LineTransformer} transformers
 */
function addLineTransformers(...transformers) {
  return getLineTransformers;

  /**
   * @param {PluginOptions} pluginOptions
   * @param {GatsbyCache} cache
   */
  function getLineTransformers(pluginOptions, cache) {
    return [...transformers, ...getDefaultLineTransformers(pluginOptions, cache)];
  }
}

module.exports = { getDefaultLineTransformers, addLineTransformers, getTransformedLines };
