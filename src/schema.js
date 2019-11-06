// @ts-check
const logger = require('loglevel');
const { getDefaultLineTransformers } = require('./transformers');
const graphql = x => x; // For syntax highlighting the schema

const rootSchema = graphql`
  type VSCodeHighlightToken {
    text: String!
    html: String!
    startIndex: Int!
    endIndex: Int!
    scopes: [String!]!
    className: String!
  }
  type VSCodeHighlightLine {
    tokens: [VSCodeHighlightToken!]!
    binaryTokens: [Int!]!
    text: String!
    html: String!
    className: String!
  }
  type VSCodeHighlightCodeBlock implements Node {
    lines: [VSCodeHighlightLine!]!
    index: Int!
    html: String!
    text: String!
    preClassName: String!
    codeClassName: String!
    language: String
  }
`;

/**
 * @param {*} nodeApiOptions
 * @param {PluginOptions} options
 */
function createSchemaCustomization({ actions }, options) {
  const { createTypes } = actions;
  logger.setLevel(options.logLevel || 'error');
  createTypes(rootSchema);
  const lineTransformers = options.getLineTransformers
    ? options.getLineTransformers(options)
    : getDefaultLineTransformers();

  for (const transformer of lineTransformers) {
    if (transformer.schemaExtension) {
      logger.info(`Extending GraphQL schema for line transformer '${transformer.displayName}'`);
      createTypes(transformer.schemaExtension);
    }
  }
}

module.exports = createSchemaCustomization;
