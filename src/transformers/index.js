// @ts-check
const { highlightMetaTransformer } = require('./highlightMetaTransformer');
const { createHighlightDirectiveLineTransformer } = require('./highlightDirectiveLineTransformer');
const getTransformedLines = require('./getTransformedLines');

/**
 * @param {PluginOptions} pluginOptions
 * @param {GatsbyCache} cache
 * @returns {Promise<LineTransformer[]>}
 */
async function getDefaultLineTransformers(pluginOptions, cache) {
  return [
    createHighlightDirectiveLineTransformer({}, pluginOptions.languageAliases, await cache.get('grammars')),
    highlightMetaTransformer
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
  async function getLineTransformers(pluginOptions, cache) {
    return [...transformers, ...(await getDefaultLineTransformers(pluginOptions, cache))];
  }
}

module.exports = { getDefaultLineTransformers, addLineTransformers, getTransformedLines };
