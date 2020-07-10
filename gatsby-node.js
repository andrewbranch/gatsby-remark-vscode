const logger = require('loglevel');
const { getChildBlockNodes, getChildSpanNodes } = require('./src/cacheUtils');
const highlight = require('./src/graphql/highlight');
const stylesheet = require('./src/graphql/stylesheet');

exports.createResolvers = ({
  createResolvers,
  cache,
  createNodeId
}, /** @type {PluginOptions} */ pluginOptions) => {
  createResolvers({
    MarkdownRemark: {
      grvscCodeBlocks: {
        type: ['GRVSCCodeBlock'],
        resolve(source, _, context) {
          return getFromCache('GRVSCCodeBlock', cache, source, context);
        }
      },
      grvscCodeSpans: {
        type: ['GRVSCCodeSpan'],
        resolve(source, _, context) {
          return getFromCache('GRVSCCodeSpan', cache, source, context);
        }
      }
    },

    Query: {
      grvscHighlight: {
        type: 'GRVSCCodeBlock',
        args: {
          source: 'String!',
          language: 'String',
          meta: 'String',
          defaultTheme: 'String',
          additionalThemes: ['GRVSCThemeArgument!'],
        },
        resolve(_, args) {
          return highlight(args, pluginOptions, { cache, createNodeId });
        }
      },

      grvscStylesheet: {
        type: 'GRVSCStylesheet',
        args: {
          defaultTheme: 'String',
          additionalThemes: ['GRVSCThemeArgument!'],
          injectStyles: 'Boolean'
        },
        resolve(_, args) {
          return stylesheet(args, pluginOptions, { cache, createNodeId });
        }
      }
    }
  });
};

/**
 * @param {string} type
 * @param {any} cache
 * @param {any} source
 * @param {any} context
 * @param {boolean=} stop
 */
async function getFromCache(type, cache, source, context, stop) {
  const get = type === 'GRVSCCodeBlock' ? getChildBlockNodes : getChildSpanNodes;
  const childNodes = await get(cache, source.id, source.internal.contentDigest);
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
    return getFromCache(type, cache, source, context, true);
  }
  if (!childNodes) {
    logger.error(
      'gatsby-remark-vscode couldn’t retrieve up-to-date GRVSCCodeBlock GraphQL nodes. ' +
      'The `GRVSCCodeBlocks` field may be missing, empty or stale. ' +
      'The Gatsby cache is probably in a weird state. Try running `gatsby clean`, and file an ' +
      'issue at https://github.com/andrewbranch/gatsby-remark-vscode/issues/new if the problem persists.'
    );

    return context.nodeModel.runQuery({
      query: { parent: { id: { eq: source.id } } },
      type,
      firstOnly: false
    });
  }
  return childNodes || [];
}
