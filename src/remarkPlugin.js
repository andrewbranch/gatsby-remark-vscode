// @ts-check
const fs = require('fs');
const path = require('path');
const logger = require('loglevel');
const visit = require('unist-util-visit');
const setup = require('./setup');
const getPossibleThemes = require('./getPossibleThemes');
const createCodeNodeRegistry = require('./createCodeNodeRegistry');
const parseCodeFenceInfo = require('./parseCodeFenceInfo');
const parseCodeSpanInfo = require('./parseCodeSpanInfo');
const getCodeBlockGraphQLDataFromRegistry = require('./graphql/getCodeBlockDataFromRegistry');
const getCodeSpanGraphQLDataFromRegistry = require('./graphql/getCodeSpanDataFromRegistry');
const { registerCodeBlock, registerCodeSpan } = require('./registerCodeNode');
const { getScope } = require('./storeUtils');
const { createStyleElement } = require('./factory/html');
const { renderHTML } = require('./renderers/html');
const { createOnce } = require('./utils');
const createGetRegistry = require('./createGetRegistry');
const styles = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');

class Cache {
  constructor() {
    this.cache = new Map();
  }
  async set(key, value) {
    this.cache.set(key, value);
  }
  async get(key) {
    return this.cache.get(key);
  }
}

const once = createOnce();
const cache = new Cache();
const getRegistry = createGetRegistry();

/**
 * @param {PluginOptions=} options
 */
function remarkPlugin(options = {}) {
  return async function(tree) {
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
    } = await setup(options, undefined, cache, once);

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
      tree,
      ({ type }) => type === 'code' || (inlineCode && type === 'inlineCode'),
      node => {
        nodes.push(node);
      }
    );

    // 2. For each code fence found, parse its header, determine what themes it will use,
    //    and register its contents with a central code block registry, performing tokenization
    //    along the way.

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
        language: languageName,
        parsedOptions: meta
      });

      const possibleThemes = await getPossibleThemes(
        node.type === 'inlineCode' ? inlineCode.theme || theme : theme,
        await cache.get('themes'),
        undefined,
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

      function getWrapperClassName() {
        return typeof wrapperClassName === 'function'
          ? wrapperClassName({
              language: codeBlock.languageName,
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

      function getClassName() {
        return typeof inlineCode.className === 'function'
          ? inlineCode.className({
              language: codeSpan.languageName,
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
      tree.children.unshift({ type: 'html', value: renderHTML(styleElement) });
    }
  };
}

module.exports = remarkPlugin;
