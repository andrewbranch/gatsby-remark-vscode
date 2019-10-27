// @ts-check
const fs = require('fs');
const path = require('path');
const logger = require('loglevel');
const defaultHost = require('./host');
const visit = require('unist-util-visit');
const escapeHTML = require('lodash.escape');
const createThemeStyles = require('./createThemeStyles');
const createGetRegistry = require('./createGetRegistry');
const parseCodeFenceHeader = require('./parseCodeFenceHeader');
const { createHash } = require('crypto');
const { getClassNameFromMetadata } = require('../lib/vscode/modes');
const { downloadExtensionIfNeeded: downloadExtensionsIfNeeded } = require('./downloadExtension');
const { getGrammar, getScope } = require('./storeUtils');
const { getMetadataForToken } = require('./utils');
const styles = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');
const { getDefaultLineTransformers } = require('./transformers');
const {
  joinClassNames,
  renderHTML,
  span,
  code,
  pre,
  style,
  mergeAttributes,
  TriviaRenderFlags
} = require('./renderUtils');

function createPlugin() {
  const getRegistry = createGetRegistry();

  /**
   * @param {*} _
   * @param {PluginOptions=} options
   */
  async function textmateHighlight(
    { markdownAST, markdownNode, cache, actions, createNodeId },
    {
      colorTheme = 'Default Dark+',
      wrapperClassName = '',
      languageAliases = {},
      extensions = [],
      getLineClassName = () => '',
      injectStyles = true,
      replaceColor = x => x,
      extensionDataDirectory = path.resolve(__dirname, '../lib/extensions'),
      logLevel = 'error',
      host = defaultHost,
      getLineTransformers = getDefaultLineTransformers,
      createNodes,
      ...rest
    } = {}
  ) {
    logger.setLevel(logLevel);
    const lineTransformers = getLineTransformers({
      colorTheme,
      wrapperClassName,
      languageAliases,
      extensions,
      getLineClassName,
      injectStyles,
      replaceColor,
      extensionDataDirectory,
      logLevel,
      ...rest
    });

    /** @type {Record<string, string>} */
    const stylesheets = {};
    const nodes = [];
    visit(markdownAST, 'code', node => {
      nodes.push(node);
    });

    let nodeIndex = 0;
    /** @type {object[]} */
    let graphQLNodes;
    for (const node of nodes) {
      /** @type {string} */
      const text = node.value || (node.children && node.children[0] && node.children[0].value);
      if (!text) continue;
      const { languageName, options } = parseCodeFenceHeader(node.lang ? node.lang.toLowerCase() : '', node.meta);
      await downloadExtensionsIfNeeded({
        extensions,
        cache,
        extensionDir: extensionDataDirectory,
        host
      });

      const grammarCache = await cache.get('grammars');
      const scope = getScope(languageName, grammarCache, languageAliases);
      if (!scope && languageName) {
        logger.warn(
          `Encountered unknown language '${languageName}'. ` +
            `If '${languageName}' is an alias for a supported language, ` +
            `use the 'languageAliases' plugin option to map it to the canonical language name.`
        );
      }

      const [registry, unlockRegistry] = await getRegistry(cache, scope);

      try {
        // Generate stylesheets and class names for theme selections.
        // Adds stylesheet content to `stylesheets` if necessary and returns
        // corresponding class name to add to code fence.
        const themeClassNames = await createThemeStyles({
          cache,
          markdownNode,
          codeFenceOptions: options,
          codeFenceNode: node,
          colorTheme,
          languageName,
          scopeName: scope,
          registry,
          replaceColor,
          stylesheets
        });

        const rawLines = text.split(/\r?\n/);
        /** @type {ElementTemplate[]} */
        const htmlLines = [];
        /** @type {import('vscode-textmate').ITokenTypeMap} */
        let tokenTypes = {};
        /** @type {number} */
        let languageId;

        if (scope) {
          const grammarData = getGrammar(scope, grammarCache);
          languageId = grammarData.languageId;
          tokenTypes = grammarData.tokenTypes;
        }

        const grammar = languageId && (await registry.loadGrammarWithConfiguration(scope, languageId, { tokenTypes }));
        const linesData = [];
        let ruleStack = undefined;
        const prevTransformerStates = [];
        linesLoop: for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
          let line = rawLines[lineIndex];
          /** @type {(ElementTemplate | string)[]} */
          const htmlLine = [];
          /** @type {LineData} */
          const lineData = { codeFenceOptions: options, index: lineIndex, content: line, language: languageName };
          let attrs = {};
          for (let i = 0; i < lineTransformers.length; i++) {
            const transformer = lineTransformers[i];
            const state = prevTransformerStates[i];
            const txResult = transformer({
              state,
              line: { text: line, attrs },
              codeFenceOptions: options,
              language: languageName
            });

            prevTransformerStates[i] = txResult.state;
            if (!txResult.line) {
              continue linesLoop;
            }

            Object.assign(attrs, txResult.line.attrs);
            line = txResult.line.text;
          }

          const lineClassName = joinClassNames(
            getLineClassName(lineData),
            'vscode-highlight-line'
          );

          if (grammar) {
            const result = grammar.tokenizeLine2(line, ruleStack);
            if (createNodes) {
              linesData.push({
                tokens: grammar.tokenizeLine(line, ruleStack).tokens.map(token => ({
                  ...token,
                  text: line.slice(token.startIndex, token.endIndex),
                  className: getClassNameFromMetadata(getMetadataForToken(token, result)),
                })),
                binaryTokens: Array.from(result.tokens),
                text: line,
                className: joinClassNames(lineClassName, attrs.class)
              });
            }

            ruleStack = result.ruleStack;
            for (let i = 0; i < result.tokens.length; i += 2) {
              const startIndex = result.tokens[i];
              const metadata = result.tokens[i + 1];
              const endIndex = result.tokens[i + 2] || line.length;
              /** @type {LineData} */
              htmlLine.push(
                span({ class: getClassNameFromMetadata(metadata) }, [escapeHTML(line.slice(startIndex, endIndex))], {
                  whitespace: TriviaRenderFlags.NoWhitespace
                })
              );
            }
          } else {
            htmlLine.push(escapeHTML(line));
          }

          htmlLines.push(
            span(mergeAttributes({ class: lineClassName }, attrs), htmlLine, { whitespace: TriviaRenderFlags.NoWhitespace })
          );
        }

        const preClassName = joinClassNames(wrapperClassName, themeClassNames, 'vscode-highlight');
        const codeClassName = 'vscode-highlight-code';
        const html = renderHTML(
          pre(
            { class: preClassName, 'data-language': languageName, 'data-index': nodeIndex },
            [
              code({ class: codeClassName }, htmlLines, {
                whitespace: TriviaRenderFlags.NewlineBetweenChildren
              })
            ],
            { whitespace: TriviaRenderFlags.NoWhitespace }
          )
        );

        node.type = 'html';
        node.value = html;
        if (createNodes) {
          const nodeData = {
            id: createNodeId(`VSCodeHighlightCodeBlock-${markdownNode.id}-${nodeIndex}`),
            parent: markdownNode.id,
            index: nodeIndex,
            rawContent: text,
            htmlContent: html,
            lines: linesData,
            preClassName,
            codeClassName,
            language: languageName,
          };

          const childNode = {
            ...nodeData,
            internal: {
              type: 'VSCodeHighlightCodeBlock',
              contentDigest: createHash('md5').update(JSON.stringify(nodeData)).digest('hex'),
            },
          };
          
          (graphQLNodes || (graphQLNodes = [])).push(childNode);
        }
      } finally {
        nodeIndex++;
        unlockRegistry();
      }
    }

    if (createNodes && graphQLNodes) {
      for (const childNode of graphQLNodes) {
        await actions.createNode(childNode);
        await actions.createParentChildLink({
          parent: markdownNode,
          child: childNode,
        });
      }
    }

    const themeNames = Object.keys(stylesheets);
    if (themeNames.length) {
      markdownAST.children.push({
        type: 'html',
        value: renderHTML(
          style({ class: 'vscode-highlight-styles' }, [
            injectStyles ? styles : '',
            ...themeNames.map(theme => stylesheets[theme])
          ])
        )
      });
    }
  }
  return textmateHighlight;
}

module.exports = createPlugin;
