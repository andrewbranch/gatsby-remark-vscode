exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
    type VSCodeHighlightToken {
      text: String!
      startIndex: Int!
      endIndex: Int!
      scopes: [String!]!
      className: String!
    }
    type VSCodeHighlightLine {
      tokens: [VSCodeHighlightToken!]!
      binaryTokens: [Int!]!
      text: String!
      className: String!
      isHighlighted: Boolean!
    }
    type VSCodeHighlightCodeBlock implements Node {
      lines: [VSCodeHighlightLine!]!
      id: ID!
      parent: MarkdownRemark!
      children: [Node!]!
      internal: Internal!
      index: Int!
      htmlContent: String!
      rawContent: String!
      preClassName: String!
      codeClassName: String!
      language: String
    }
  `;
  createTypes(typeDefs);
};

exports.createResolvers = ({
  createResolvers,
}) => {
  createResolvers({
    MarkdownRemark: {
      vsCodeHighlightCodeBlocks: {
        type: ['VSCodeHighlightCodeBlock'],
        resolve(source, _, context) {
          return context.nodeModel.runQuery({
            query: {
              filter: {
                parent: {
                  id: { eq: source.id },
                },
              },
            },
            type: 'VSCodeHighlightCodeBlock',
            firstOnly: false,
          });
        },
      },
    },
  });
};
