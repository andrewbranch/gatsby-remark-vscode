// @ts-check
const logger = require('loglevel');
const { getChildNodes } = require('./src/cacheUtils');

exports.createResolvers = ({
  createResolvers,
  cache,
}) => {
  createResolvers({
    MarkdownRemark: {
      vsCodeHighlightCodeBlocks: {
        type: ['VSCodeHighlightCodeBlock'],
        resolve(source, _, context) {
          return getFromCache();

          /** @param {boolean=} stop */
          async function getFromCache(stop) {
            const childNodes = await getChildNodes(cache, source.id, source.internal.contentDigest);
            // Hack alert: ensure plugin has been run by querying htmlAst,
            // which is set via `setFieldsOnGraphQLNodeType` by gatsby-transformer-remark,
            // therefore might not have been run before this resolver runs.
            if (!childNodes && !stop) {
              await context.nodeModel.runQuery({
                query: {
                  filter: {
                    id: { eq: source.id },
                    htmlAst: { ne: null },
                  },
                },
                type: 'MarkdownRemark',
                firstOnly: true,
              });
              return getFromCache(true);
            }
            if (!childNodes) {
              logger.error(
                'gatsby-remark-vscode couldn’t retrieve up-to-date VSCodeHighlightCodeBlock GraphQL nodes. ' +
                'The `vsCodeHighlightCodeBlocks` field may be missing, empty or stale. ' +
                'The Gatsby cache is probably in a weird state. Try running `gatsby clean`, and file an ' +
                'issue at https://github.com/andrewbranch/gatsby-remark-vscode/issues/new if the problem persists.'
              );

              return context.nodeModel.runQuery({
                query: { parent: { id: { eq: source.id } } },
                type: 'VSCodeHighlightCodeBlock',
                firstOnly: false
              });
            }
            return childNodes || [];
          }
        },
      },
    },
  });
};
