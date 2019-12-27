// @ts-check
const fs = require('fs');
const path = require('path');
const logger = require('loglevel');
const defaultHost = require('./host');
const visit = require('unist-util-visit');
const escapeHTML = require('lodash.escape');
const createSchemaCustomization = require('./schema');
const validateOptions = require('./validateOptions');
const createGetRegistry = require('./createGetRegistry');
const tokenizeWithTheme = require('./tokenizeWithTheme');
const getPossibleThemes = require('./getPossibleThemes');
const createNodeRegistry = require('./createNodeRegistry');
const parseCodeFenceHeader = require('./parseCodeFenceHeader');
const { createHash } = require('crypto');
const { setChildNodes } = require('./cacheUtils');
const { getDefaultLineTransformers, getTransformedLines } = require('./transformers');
const { processExtensions } = require('./processExtension');
const { getGrammar, getScope } = require('./storeUtils');
const { renderHTML, span, code, pre, style, mergeAttributes, TriviaRenderFlags } = require('./renderers/html');
const { joinClassNames, ruleset, media, declaration } = require('./renderers/css');
const {
  getThemeClassName,
  getThemeClassNames,
  getStylesFromThemeSettings,
  flatMap,
  groupConditions,
  convertLegacyThemeOption,
  createOnce
} = require('./utils');
const styles = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');

function createPlugin() {
  const getRegistry = createGetRegistry();
  const once = createOnce();

  /**
   * @param {RemarkPluginArguments} _
   * @param {PluginOptions=} options
   */
  async function textmateHighlight(
    { markdownAST, markdownNode, cache, actions, createNodeId },
    {
      theme = 'Default Dark+',
      colorTheme: legacyTheme,
      wrapperClassName = '',
      languageAliases = {},
      extensions = [],
      getLineClassName = () => '',
      injectStyles = true,
      replaceColor = x => x,
      logLevel = 'warn',
      host = defaultHost,
      getLineTransformers = getDefaultLineTransformers,
      ...rest
    } = {}
  ) {
    await once(async () => {
      logger.setLevel(logLevel);
      if (legacyTheme) {
        theme = convertLegacyThemeOption(legacyTheme);
      }

      validateOptions({
        theme,
        colorTheme: legacyTheme,
        wrapperClassName,
        languageAliases,
        extensions,
        getLineClassName,
        injectStyles,
        replaceColor,
        logLevel,
        host,
        getLineTransformers
      });

      await processExtensions(extensions, host, cache);
    }, 'setup');

    const lineTransformers = getLineTransformers({
      theme,
      wrapperClassName,
      languageAliases,
      extensions,
      getLineClassName,
      injectStyles,
      replaceColor,
      logLevel,
      ...rest
    });

    const nodes = [];
    visit(markdownAST, 'code', node => {
      nodes.push(node);
    });

    let nodeIndex = 0;
    /** @type {object[]} */
    const graphQLNodes = [];
    const nodeRegistry = createNodeRegistry();
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
        markdownNode,
        node,
        languageName,
        meta
      );

      const [registry, unlockRegistry] = await getRegistry(cache, scope);

      try {
        const lines = getTransformedLines(lineTransformers, text, languageName, meta);
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
        
        const nodeData = {
          id: createNodeId(`VSCodeHighlightCodeBlock-${markdownNode.id}-${nodeIndex}`),
          parent: markdownNode.id,
          index: nodeIndex,
          rawContent: text,
          htmlContent: html,
          lines: linesData,
          preClassName,
          codeClassName,
          language: languageName
        };

        const childNode = {
          ...nodeData,
          internal: {
            type: 'VSCodeHighlightCodeBlock',
            contentDigest: createHash('md5')
              .update(JSON.stringify(nodeData))
              .digest('hex')
          }
        };

        graphQLNodes.push(childNode);
        nodeRegistry.register(node, {
          lines,
          meta,
          languageName,
          possibleThemes,
          isTokenized: !!grammar,
          tokenizationResults: possibleThemes.map(theme => tokenizeWithTheme(lines, theme, grammar, registry))
        });
      } finally {
        nodeIndex++;
        unlockRegistry();
      }
    }

    nodeRegistry.forEachNode(({ meta, languageName, possibleThemes }, node) => {
      const lineElements = nodeRegistry.mapLines(node, (line, lineIndex) => {
        /** @type {LineData} */
        const lineData = { meta, index: lineIndex, content: line.text, language: languageName };
        const lineClassName = joinClassNames(getLineClassName(lineData), 'grvsc-line');
        return span(
          mergeAttributes({ class: lineClassName }, line.attrs),
          nodeRegistry.mapTokens(
            node,
            lineIndex,
            /** @returns {grvsc.HTMLElement | string} */
            (tokenText, classNamesByTheme) =>
              span({ class: flatMap(classNamesByTheme, name => name.value).join(' ') }, [escapeHTML(tokenText)], {
                whitespace: TriviaRenderFlags.NoWhitespace
              }),
            lineText => lineText
          ),
          { whitespace: TriviaRenderFlags.NoWhitespace }
        );
      });

      const wrapperClassNameValue =
        typeof wrapperClassName === 'function'
          ? wrapperClassName({
              language: languageName,
              markdownNode,
              codeFenceNode: node,
              parsedOptions: meta
            })
          : wrapperClassName;

      const themeClassNames = flatMap(possibleThemes, getThemeClassNames);
      const preClassName = joinClassNames('grvsc-container', wrapperClassNameValue, ...themeClassNames);
      node.type = 'html';
      node.value = renderHTML(
        pre(
          { class: preClassName, 'data-language': languageName },
          [
            code({ class: 'grvsc-code' }, lineElements, {
              whitespace: TriviaRenderFlags.NewlineBetweenChildren
            })
          ],
          { whitespace: TriviaRenderFlags.NoWhitespace }
        )
      );
    });

    const themeRules = flatMap(nodeRegistry.getAllPossibleThemes(), ({ theme, settings }) => {
      const conditions = groupConditions(theme.conditions);
      /** @type {grvsc.CSSElement[]} */
      const elements = [];
      const tokenClassNames = nodeRegistry.getTokenStylesForTheme(theme.identifier);
      const containerStyles = getStylesFromThemeSettings(settings);
      if (conditions.default) {
        pushColorRules(elements, '.' + getThemeClassName(theme.identifier, 'default'));
      }
      for (const condition of conditions.parentSelector) {
        pushColorRules(elements, `${condition.value} .${getThemeClassName(theme.identifier, 'parentSelector')}`);
      }
      for (const condition of conditions.matchMedia) {
        /** @type {grvsc.CSSRuleset[]} */
        const ruleset = [];
        pushColorRules(ruleset, '.' + getThemeClassName(theme.identifier, 'matchMedia'));
        elements.push(media(condition.value, ruleset, theme.identifier));
      }
      return elements;

      /**
       * @param {grvsc.CSSElement[]} container
       * @param {string} selector
       * @param {string=} leadingComment
       */
      function pushColorRules(container, selector, leadingComment) {
        if (containerStyles.length) {
          container.push(ruleset(selector, containerStyles, leadingComment));
          leadingComment = undefined;
        }
        for (const { className, css } of tokenClassNames) {
          container.push(
            ruleset(
              `${selector} .${className}`,
              css.map(decl =>
                decl.property === 'color' ? declaration('color', replaceColor(decl.value, theme.identifier)) : decl
              ),
              leadingComment
            )
          );
          leadingComment = undefined;
        }
      }
    });

    if (themeRules.length) {
      markdownAST.children.push({
        type: 'html',
        value: renderHTML(style({ class: 'grvsc-styles' }, [injectStyles ? styles : '', ...themeRules]))
      });
    }

    for (const childNode of graphQLNodes) {
      await actions.createNode(childNode);
      await actions.createParentChildLink({
        parent: markdownNode,
        child: childNode
      });
    }

    await setChildNodes(cache, markdownNode.id, markdownNode.internal.contentDigest, graphQLNodes);
  }

  textmateHighlight.createSchemaCustomization = createSchemaCustomization;
  return textmateHighlight;
}

module.exports = createPlugin;
