// @ts-check
const { highlightMetaTransformer } = require('./highlightmetaTransformer');
const { createHighlightDirectiveLineTransformer } = require('./highlightDirectiveLineTransformer');
const getTransformedLines = require('./getTransformedLines');

/**
 * @returns {LineTransformer[]}
 */
function getDefaultLineTransformers() {
  return [createHighlightDirectiveLineTransformer({}), highlightMetaTransformer];
}

/**
 * @param {...LineTransformer} transformers
 */
function addLineTransformers(...transformers) {
  return () => [...transformers, ...getDefaultLineTransformers()];
}

module.exports = { getDefaultLineTransformers, addLineTransformers, getTransformedLines };
