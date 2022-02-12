// @ts-check
const logger = require('loglevel');
const { getDefaultLineTransformers } = require('../transformers');
const { schema } = require('./schema');

/**
 * @param {*} nodeApiOptions
 * @param {PluginOptions} options
 */
function createSchemaCustomization({ actions, cache }, options) {
  const { createTypes } = actions;
  logger.setLevel(options.logLevel || 'error');
  createTypes(schema);
  const lineTransformers = options.getLineTransformers
    ? options.getLineTransformers(options, cache)
    : getDefaultLineTransformers(options, cache);

  for (const transformer of lineTransformers) {
    if (transformer.schemaExtension) {
      logger.info(`Extending GraphQL schema for line transformer '${transformer.displayName}'`);
      createTypes(transformer.schemaExtension);
    }
  }
}

module.exports = createSchemaCustomization;
