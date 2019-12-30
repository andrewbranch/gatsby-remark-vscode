// @ts-check
const logger = require('loglevel');
const { getDefaultLineTransformers } = require('./transformers');
const graphql = x => x; // Dummy function for syntax highlighting the schema

const rootSchema = graphql`
  type GRVSCToken {
    text: String!
    html: String!
    startIndex: Int!
    endIndex: Int!
    scopes: [String!]!
    className: String!
  }
  type GRVSCLine {
    tokens: [GRVSCToken!]!
    binaryTokens: [Int!]!
    text: String!
    html: String!
    className: String!
    data: JSON!
  }
  enum GRVSCThemeConditionKind {
    default
    matchMedia
    parentSelector
  }
  type GRVSCThemeCondition {
    condition: GRVSCThemeConditionKind!
    value: String
  }
  type GRVSCThemeWithTokenization {
    identifier: String!
    conditions: [GRVSCThemeCondition!]!
    lines: [GRVSCLine!]!
  }
  type GRVSCCodeBlock implements Node {
    index: Int!
    html: String!
    text: String!
    preClassName: String!
    codeClassName: String!
    language: String
    themes: [GRVSCCodeBlock!]!
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
