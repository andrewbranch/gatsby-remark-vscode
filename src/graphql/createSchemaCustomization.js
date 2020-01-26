// @ts-check
const fs = require('fs');
const path = require('path');
const logger = require('loglevel');
const { getDefaultLineTransformers } = require('../transformers');
const rootSchema = fs.readFileSync(path.resolve(__dirname, 'schema.graphql'), 'utf8');

/**
 * @param {*} nodeApiOptions
 * @param {PluginOptions} options
 */
function createSchemaCustomization({ actions, cache }, options) {
  const { createTypes } = actions;
  logger.setLevel(options.logLevel || 'error');
  createTypes(rootSchema);
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
