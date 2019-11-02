// @ts-check
const { highlightCodeFenceOptionsTransformer } = require('./highlightCodeFenceOptionsTransformer');
const { createHighlightDirectiveLineTransformer } = require('./highlightDirectiveLineTransformer');

/**
 * @param {import('../index').PluginOptions} pluginOptions
 * @returns {LineTransformer[]}
 */
function getDefaultLineTransformers(pluginOptions) {
  return [
    createHighlightDirectiveLineTransformer(pluginOptions.languageCommentMap),
    highlightCodeFenceOptionsTransformer
  ];
}

module.exports = getDefaultLineTransformers;
