// @ts-check
const fs = require('fs');
const path = require('path');
const logger = require('loglevel');
const visit = require('unist-util-visit');
const escapeHTML = require('lodash.escape');
const setup = require('./setup');
const createGetRegistry = require('./createGetRegistry');
const registerCodeBlock = require('./registerCodeBlock');
const getPossibleThemes = require('./getPossibleThemes');
const createCodeBlockRegistry = require('./createCodeBlockRegistry');
const parseCodeFenceHeader = require('./parseCodeFenceHeader');
const createSchemaCustomization = require('./graphql/createSchemaCustomization');
const { createHash } = require('crypto');
const { setChildNodes } = require('./cacheUtils');
const { getScope } = require('./storeUtils');
const { renderHTML, span, code, pre, style, mergeAttributes, TriviaRenderFlags } = require('./renderers/html');
const { joinClassNames, ruleset, media, declaration } = require('./renderers/css');
const { getThemeClassName, getThemeClassNames, getStylesFromThemeSettings, groupConditions } = require('./themeUtils');
const { flatMap, createOnce, partitionOne, last } = require('./utils');
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

    /** @type {MDASTNode[]} */
    const nodes = [];
    visit(markdownAST, 'code', node => {
      nodes.push(node);
    });

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
        path.dirname(markdownNode.fileAbsolutePath),
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

    codeBlockRegistry.forEachCodeBlock(({ text, meta, languageName, possibleThemes, index }, node) => {
      /** @type {grvsc.HTMLElement[]} */
      const lineElements = [];
      /** @type {grvsc.gql.GRVSCTokenizedLine[]} */
      const gqlLines = [];
      codeBlockRegistry.forEachLine(node, (line, lineIndex) => {
        /** @type {LineData} */
        const lineData = { meta, index: lineIndex, content: line.text, language: languageName };
        const lineClassName = joinClassNames(getLineClassName(lineData), 'grvsc-line');
        /** @type {(grvsc.HTMLElement | string)[]} */
        const tokenElements = [];
        /** @type {grvsc.gql.GRVSCToken[]} */
        const gqlTokens = [];
        codeBlockRegistry.forEachToken(
          node,
          lineIndex,
          token => {
            const className = joinClassNames(
              token.defaultThemeTokenData.className,
              ...token.additionalThemeTokenData.map(t => t.className)
            );
            const html = span({ class: className }, [escapeHTML(token.text)], {
              whitespace: TriviaRenderFlags.NoWhitespace
            });
            addTokenElement(html);
            gqlTokens.push({
              ...token,
              className,
              html: renderHTML(html)
            });
          },
          lineText => tokenElements.push(lineText)
        );

        const attrs = mergeAttributes({ class: lineClassName }, line.attrs);
        const html = span(attrs, tokenElements, { whitespace: TriviaRenderFlags.NoWhitespace });

        lineElements.push(html);
        gqlLines.push({
          ...line,
          className: attrs.class,
          tokens: gqlTokens,
          html: renderHTML(html)
        });

        /**
         * Pushes a token element onto `tokenElements`, or merges the token text if
         * attributes are identical in order to minimize the number of elements created.
         * @param {grvsc.HTMLElement} element
         */
        function addTokenElement(element) {
          const prev = last(tokenElements);
          if (typeof prev === 'object' && element.attributes.class === prev.attributes.class) {
            prev.children.push(...element.children);
          } else {
            tokenElements.push(element);
          }
        }
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
      const codeClassName = 'grvsc-code';
      node.type = 'html';
      node.value = renderHTML(
        pre(
          { class: preClassName, 'data-language': languageName, 'data-index': index },
          [
            code({ class: codeClassName }, lineElements, {
              whitespace: TriviaRenderFlags.NewlineBetweenChildren
            })
          ],
          { whitespace: TriviaRenderFlags.NoWhitespace }
        )
      );

      const [defaultTheme, additionalThemes] = partitionOne(possibleThemes, t =>
        t.conditions.some(c => c.condition === 'default')
      );

      /** @type {grvsc.gql.GRVSCCodeBlock} */
      const nodeData = {
        id: createNodeId(`GRVSCCodeBlock-${markdownNode.id}-${index}`),
        parent: markdownNode.id,
        index,
        text,
        html: node.value,
        preClassName,
        codeClassName,
        language: languageName,
        defaultTheme,
        additionalThemes,
        tokenizedLines: gqlLines
      };

      const childNode = {
        ...nodeData,
        internal: {
          type: 'GRVSCCodeBlock',
          contentDigest: createHash('md5')
            .update(JSON.stringify(nodeData))
            .digest('hex')
        }
      };

      graphQLNodes.push(childNode);
    });

    const themeRules = flatMap(codeBlockRegistry.getAllPossibleThemes(), ({ theme, settings }) => {
      const conditions = groupConditions(theme.conditions);
      /** @type {grvsc.CSSElement[]} */
      const elements = [];
      const tokenClassNames = codeBlockRegistry.getTokenStylesForTheme(theme.identifier);
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

  textmateHighlight.getRegistry = getRegistry;
  textmateHighlight.createSchemaCustomization = createSchemaCustomization;
  textmateHighlight.once = once;
  return textmateHighlight;
}

module.exports = createPlugin;
