// @ts-check
const { highlightCodeFenceOptionsTransformer } = require('./highlightCodeFenceOptionsTransformer');
const { createHighlightDirectiveLineTransformer } = require('./highlightDirectiveLineTransformer');

/**
 * @returns {LineTransformer[]}
 */
function getDefaultLineTransformers() {
  return [createHighlightDirectiveLineTransformer({}), highlightCodeFenceOptionsTransformer];
}

/**
 * @param {...LineTransformer} transformers
 */
function addLineTransformers(...transformers) {
  return () => [...transformers, ...getDefaultLineTransformers()];
}

module.exports = { getDefaultLineTransformers, addLineTransformers };
