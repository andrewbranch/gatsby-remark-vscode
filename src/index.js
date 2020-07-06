// @ts-check
const fs = require('fs');
const path = require('path');
const logger = require('loglevel');
const visit = require('unist-util-visit');
const setup = require('./setup');
const createGetRegistry = require('./createGetRegistry');
const getPossibleThemes = require('./getPossibleThemes');
const createCodeNodeRegistry = require('./createCodeNodeRegistry');
const parseCodeFenceInfo = require('./parseCodeFenceInfo');
const parseCodeSpanInfo = require('./parseCodeSpanInfo');
const createSchemaCustomization = require('./graphql/createSchemaCustomization');
const getCodeBlockGraphQLDataFromRegistry = require('./graphql/getCodeBlockDataFromRegistry');
const getCodeSpanGraphQLDataFromRegistry = require('./graphql/getCodeSpanDataFromRegistry');
const { registerCodeBlock, registerCodeSpan } = require('./registerCodeNode');
const { createHash } = require('crypto');
const { setChildBlockNodes, setChildSpanNodes } = require('./cacheUtils');
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
      inlineCode,
      ...rest
    } = await setup(options, markdownNode.fileAbsolutePath, cache, once);

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
        inlineCode,
        ...rest
      },
      cache
    );

    // 1. Gather all code fence nodes from Markdown AST.

    /** @type {(MDASTNode<'code'> | MDASTNode<'inlineCode'>)[]} */
    const nodes = [];
    visit(
      markdownAST,
      ({ type }) => type === 'code' || (inlineCode && type === 'inlineCode'),
      node => {
        nodes.push(node);
      }
    );

    // 2. For each code fence found, parse its header, determine what themes it will use,
    //    and register its contents with a central code block registry, performing tokenization
    //    along the way.

    /** @type {grvsc.gql.GRVSCCodeBlock[]} */
    const graphQLBlockNodes = [];
    /** @type {grvsc.gql.GRVSCCodeSpan[]} */
    const graphQLSpanNodes = [];
    /** @type {CodeNodeRegistry<MDASTNode<'code' | 'inlineCode'>>} */
    const codeNodeRegistry = createCodeNodeRegistry();
    for (const node of nodes) {
      /** @type {string} */
      const text = node.value || (node.children && node.children[0] && node.children[0].value);
      if (!text) continue;
      const { languageName, meta, text: parsedText = text } =
        node.type === 'code'
          ? parseCodeFenceInfo(node.lang ? node.lang.toLowerCase() : '', node.meta)
          : parseCodeSpanInfo(text, inlineCode.marker);

      if (node.type === 'inlineCode' && !languageName) {
        continue;
      }

      const grammarCache = await cache.get('grammars');
      const scope = getScope(languageName, grammarCache, languageAliases);
      if (!scope && languageName) {
        logger.warn(
          `Encountered unknown language '${languageName}'. ` +
            `If '${languageName}' is an alias for a supported language, ` +
            `use the 'languageAliases' plugin option to map it to the canonical language name.`
        );
      }

      const nodeData = /** @type {CodeBlockData | CodeSpanData} */ ({
        node,
        markdownNode,
        language: languageName,
        parsedOptions: meta
      });

      const possibleThemes = await getPossibleThemes(
        node.type === 'inlineCode' ? inlineCode.theme || theme : theme,
        await cache.get('themes'),
        // Node could be sourced from something other than a File node
        markdownNode.fileAbsolutePath ? path.dirname(markdownNode.fileAbsolutePath) : undefined,
        nodeData
      );

      if (node.type === 'inlineCode') {
        await registerCodeSpan(
          codeNodeRegistry,
          node,
          possibleThemes,
          () => getRegistry(cache, scope),
          scope,
          parsedText,
          languageName,
          cache
        );
      } else {
        await registerCodeBlock(
          codeNodeRegistry,
          node,
          possibleThemes,
          () => getRegistry(cache, scope),
          lineTransformers,
          scope,
          parsedText,
          languageName,
          meta,
          cache
        );
      }
    }

    // 3. For each code block/span registered, convert its tokenization and theme data
    //    to a GraphQL-compatible representation, including HTML renderings. At the same
    //    time, change the original code fence Markdown node to an HTML node and set
    //    its value to the HTML rendering contained in the GraphQL node.

    codeNodeRegistry.forEachCodeBlock((codeBlock, node) => {
      const graphQLNode = getCodeBlockGraphQLDataFromRegistry(
        codeNodeRegistry,
        node,
        codeBlock,
        getWrapperClassName,
        getLineClassName
      );

      // Update Markdown node
      /** @type {MDASTNode} */
      (node).type = 'html';
      node.value = graphQLNode.html;

      // Push GraphQL node
      graphQLBlockNodes.push({
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
              node,
              codeFenceNode: node,
              parsedOptions: codeBlock.meta
            })
          : wrapperClassName;
      }
    });

    codeNodeRegistry.forEachCodeSpan((codeSpan, node) => {
      const graphQLNode = getCodeSpanGraphQLDataFromRegistry(codeNodeRegistry, node, codeSpan, getClassName);

      // Update Markdown node
      /** @type {MDASTNode} */
      (node).type = 'html';
      node.value = graphQLNode.html;

      // Push GraphQL node
      graphQLSpanNodes.push({
        ...graphQLNode,
        id: createNodeId(`GRVSCCodeSpan-${markdownNode.id}-${codeSpan.index}`),
        parent: markdownNode.id,
        internal: {
          type: 'GRVSCCodeSpan',
          contentDigest: createHash('md5')
            .update(JSON.stringify(graphQLNode))
            .digest('hex')
        }
      });

      function getClassName() {
        return typeof inlineCode.className === 'function'
          ? inlineCode.className({
              language: codeSpan.languageName,
              markdownNode,
              node
            })
          : inlineCode.className;
      }
    });

    // 4. Generate CSS rules for each theme used by one or more code blocks in the registry,
    //    then append that CSS to the Markdown AST in an HTML node.

    const styleElement = createStyleElement(
      codeNodeRegistry.getAllPossibleThemes(),
      codeNodeRegistry.getTokenStylesForTheme,
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

    for (const childNode of [...graphQLBlockNodes, ...graphQLSpanNodes]) {
      await actions.createNode(childNode);
      await actions.createParentChildLink({
        parent: markdownNode,
        child: childNode
      });
    }

    await setChildBlockNodes(cache, markdownNode.id, markdownNode.internal.contentDigest, graphQLBlockNodes);
    await setChildSpanNodes(cache, markdownNode.id, markdownNode.internal.contentDigest, graphQLSpanNodes);
  }

  textmateHighlight.getRegistry = getRegistry;
  textmateHighlight.once = once;
  textmateHighlight.createSchemaCustomization = createSchemaCustomization;
  return textmateHighlight;
}

module.exports = createPlugin;
