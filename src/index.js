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
const { getClassNameFromMetadata } = require('../lib/vscode/modes');
const { downloadExtensionIfNeeded: downloadExtensionsIfNeeded } = require('./downloadExtension');
const { getGrammar, getScope } = require('./storeUtils');
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
const styles = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');
const { getDefaultLineTransformers } = require('./transformers');

function createPlugin() {
  const getRegistry = createGetRegistry();

  /**
   * @param {*} _
   * @param {PluginOptions=} options
   */
  async function textmateHighlight(
    { markdownAST, markdownNode, cache },
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
        let ruleStack = undefined;
        const prevTransformerStates = [];
        linesLoop: for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
          let line = rawLines[lineIndex];
          /** @type {(ElementTemplate | string)[]} */
          const htmlLine = [];
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
          if (grammar) {
            const result = grammar.tokenizeLine2(line, ruleStack);
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

          /** @type {LineData} */
          const lineData = { codeFenceOptions: options, index: lineIndex, content: line, language: languageName };
          const className = joinClassNames(getLineClassName(lineData), 'vscode-highlight-line');

          htmlLines.push(
            span(mergeAttributes({ class: className }, attrs), htmlLine, { whitespace: TriviaRenderFlags.NoWhitespace })
          );
        }

        const wrapperClassNameValue =
          typeof wrapperClassName === 'function'
            ? wrapperClassName({
                language: languageName,
                markdownNode,
                codeFenceNode: node,
                parsedOptions: options
              })
            : wrapperClassName;

        const className = joinClassNames(wrapperClassNameValue, themeClassNames, 'vscode-highlight');
        node.type = 'html';
        node.value = renderHTML(
          pre(
            { class: className, 'data-language': languageName },
            [
              code({ class: 'vscode-highlight-code' }, htmlLines, {
                whitespace: TriviaRenderFlags.NewlineBetweenChildren
              })
            ],
            { whitespace: TriviaRenderFlags.NoWhitespace }
          )
        );
      } finally {
        unlockRegistry();
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
