exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
    type VSCodeHighlightToken {
      startIndex: Int!
      endIndex: Int!
      scopes: [String!]!
    }
    type VSCodeHighlightLine {
      tokens: [VSCodeHighlightToken!]!
      binaryTokens: [Int!]!
      text: String!
    }
    type VSCodeHighlightCodeBlock implements Node {
      lines: [VSCodeHighlightLine!]!
      id: ID!
      parent: Node!
      children: [Node!]!
      internal: Internal!
      index: Int!
      htmlContent: String!
      rawContent: String!
    }
  `;
  createTypes(typeDefs);
}