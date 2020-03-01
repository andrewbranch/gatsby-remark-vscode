// @ts-check
const fs = require('fs');
const path = require('path');
const logger = require('loglevel');
const visit = require('unist-util-visit');
const setup = require('./setup');
const createGetRegistry = require('./createGetRegistry');
const registerCodeBlock = require('./registerCodeBlock');
const getPossibleThemes = require('./getPossibleThemes');
const createCodeBlockRegistry = require('./createCodeBlockRegistry');
const parseCodeFenceHeader = require('./parseCodeFenceHeader');
const createSchemaCustomization = require('./graphql/createSchemaCustomization');
const getCodeBlockGraphQLDataFromRegistry = require('./graphql/getCodeBlockDataFromRegistry');
const { createHash } = require('crypto');
const { setChildNodes } = require('./cacheUtils');
const { getScope } = require('./storeUtils');
const { createStyleElement } = require('./factory/html');
const { renderHTML } = require('./renderers/html');
const { createOnce } = require('./utils');
const styles = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');

function createPlugin() {
  const getRegistry = createGetRegistry();
  const once = createOnce();

  /**
   * @param {RemarkPluginArguments} _
   * @param {PluginOptions=} options
   */
  async function textmateHighlight({ markdownAST, markdownNode, cache, actions, createNodeId }, options = {}) {
    const {
      theme,
      wrapperClassName,
      languageAliases,
      extensions,
      getLineClassName,
      injectStyles,
      replaceColor,
      logLevel,
      getLineTransformers,
      ...rest
    } = await once(() => setup(options, cache), 'setup');

    const lineTransformers = getLineTransformers(
      {
        theme,
        wrapperClassName,
        languageAliases,
        extensions,
        getLineClassName,
        injectStyles,
        replaceColor,
        logLevel,
        ...rest
      },
      cache
    );

    // 1. Gather all code fence nodes from Markdown AST.

    /** @type {MDASTNode[]} */
    const nodes = [];
    visit(markdownAST, 'code', node => {
      nodes.push(node);
    });

    // 2. For each code fence found, parse its header, determine what themes it will use,
    //    and register its contents with a central code block registry, performing tokenization
    //    along the way.

    /** @type {grvsc.gql.GRVSCCodeBlock[]} */
    const graphQLNodes = [];
    /** @type {CodeBlockRegistry<MDASTNode>} */
    const codeBlockRegistry = createCodeBlockRegistry();
    for (const node of nodes) {
      /** @type {string} */
      const text = node.value || (node.children && node.children[0] && node.children[0].value);
      if (!text) continue;
      const { languageName, meta } = parseCodeFenceHeader(node.lang ? node.lang.toLowerCase() : '', node.meta);
      const grammarCache = await cache.get('grammars');
      const scope = getScope(languageName, grammarCache, languageAliases);
      if (!scope && languageName) {
        logger.warn(
          `Encountered unknown language '${languageName}'. ` +
            `If '${languageName}' is an alias for a supported language, ` +
            `use the 'languageAliases' plugin option to map it to the canonical language name.`
        );
      }

      const possibleThemes = await getPossibleThemes(
        theme,
        await cache.get('themes'),
        markdownNode.fileAbsolutePath ? path.dirname(markdownNode.fileAbsolutePath) : null,
        markdownNode,
        node,
        languageName,
        meta
      );

      await registerCodeBlock(
        codeBlockRegistry,
        node,
        possibleThemes,
        () => getRegistry(cache, scope),
        lineTransformers,
        scope,
        text,
        languageName,
        meta,
        cache
      );
    }

    // 3. For each code block registered, convert its tokenization and theme data
    //    to a GraphQL-compatible representation, including HTML renderings. At the same
    //    time, change the original code fence Markdown node to an HTML node and set
    //    its value to the HTML rendering contained in the GraphQL node.

    codeBlockRegistry.forEachCodeBlock((codeBlock, node) => {
      const graphQLNode = getCodeBlockGraphQLDataFromRegistry(
        codeBlockRegistry,
        node,
        codeBlock,
        getWrapperClassName,
        getLineClassName
      );

      // Update Markdown node
      node.type = 'html';
      node.value = graphQLNode.html;

      // Push GraphQL node
      graphQLNodes.push({
        ...graphQLNode,
        id: createNodeId(`GRVSCCodeBlock-${markdownNode.id}-${codeBlock.index}`),
        parent: markdownNode.id,
        internal: {
          type: 'GRVSCCodeBlock',
          contentDigest: createHash('md5')
            .update(JSON.stringify(graphQLNode))
            .digest('hex')
        }
      });

      function getWrapperClassName() {
        return typeof wrapperClassName === 'function'
          ? wrapperClassName({
              language: codeBlock.languageName,
              markdownNode,
              codeFenceNode: node,
              parsedOptions: codeBlock.meta
            })
          : wrapperClassName;
      }
    });

    // 4. Generate CSS rules for each theme used by one or more code blocks in the registry,
    //    then append that CSS to the Markdown AST in an HTML node.

    const styleElement = createStyleElement(
      codeBlockRegistry.getAllPossibleThemes(),
      codeBlockRegistry.getTokenStylesForTheme,
      replaceColor,
      injectStyles ? styles : undefined
    );

    if (styleElement) {
      markdownAST.children.push({
        type: 'html',
        value: renderHTML(styleElement)
      });
    }

    // 5. Create all GraphQL nodes with Gatsby so code blocks can be queried.

    for (const childNode of graphQLNodes) {
      await actions.createNode(childNode);
      await actions.createParentChildLink({
        parent: markdownNode,
        child: childNode
      });
    }

    await setChildNodes(cache, markdownNode.id, markdownNode.internal.contentDigest, graphQLNodes);
  }

  textmateHighlight.getRegistry = getRegistry;
  textmateHighlight.once = once;
  textmateHighlight.createSchemaCustomization = createSchemaCustomization;
  return textmateHighlight;
}

module.exports = createPlugin;
