// @ts-check
const fs = require('fs');
const path = require('path');
const logger = require('loglevel');
const defaultHost = require('./host');
const visit = require('unist-util-visit');
const escapeHTML = require('lodash.escape');
const lineHighlighting = require('./lineHighlighting');
const createGetRegistry = require('./createGetRegistry');
const parseCodeFenceHeader = require('./parseCodeFenceHeader');
const { sanitizeForClassName } = require('./utils');
const { loadColorTheme } = require('../lib/vscode/colorThemeData');
const { getClassNameFromMetadata } = require('../lib/vscode/modes');
const { downloadExtensionIfNeeded: downloadExtensionsIfNeeded } = require('./downloadExtension');
const { getGrammar, getScope, getThemeLocation } = require('./storeUtils');
const { generateTokensCSSForColorMap } = require('../lib/vscode/tokenization');
const { renderRule, prefersDark, prefersLight, prefixRules, joinClassNames } = require('./cssUtils');
const styles = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');

/**
 * @param {string} missingScopeName
 * @param {string} rootScopeName
 */
function warnMissingLanguageFile(missingScopeName, rootScopeName) {
  logger.warn(`No language file was loaded for scope '${missingScopeName}' (requested by '${rootScopeName}').`);
}

/**
 * @param {string} lang
 */
function warnUnknownLanguage(lang) {
  logger.warn(
    `Encountered unknown language '${lang}'. If '${lang}' is an alias for a supported language, ` +
      `use the 'languageAliases' plugin option to map it to the canonical language name.`
  );
}

/**
 * @param {ColorThemeSettings} settings
 * @returns {{ [K in keyof ColorThemeSettings]: string }}
 */
function createThemeClassNames(settings) {
  return {
    defaultTheme: sanitizeForClassName(settings.defaultTheme),
    prefersDarkTheme: settings.prefersDarkTheme && `pd--${sanitizeForClassName(settings.prefersDarkTheme)}`,
    prefersLightTheme: settings.prefersLightTheme && `pl--${sanitizeForClassName(settings.prefersLightTheme)}`
  };
}

/**
 * @param {{ [K in keyof ColorThemeSettings]: string }} classNames
 */
function joinThemeClassNames(classNames) {
  return joinClassNames(...Object.keys(classNames).map(setting => classNames[setting]));
}

/**
 * @param {string | ColorThemeSettings} colorThemeValue
 * @returns {ColorThemeSettings}
 */
function createColorThemeSettings(colorThemeValue) {
  return typeof colorThemeValue === 'string' ? { defaultTheme: colorThemeValue } : colorThemeValue;
}

const settingPropertyMap = { 'editor.background': 'background-color', 'editor.foreground': 'color' };

/**
 * @param {Record<string, string>} settings
 */
function getStylesFromSettings(settings) {
  return Object.keys(settings)
    .reduce((styles, setting) => {
      const property = settingPropertyMap[setting];
      if (property) {
        return [...styles, `${property}: ${settings[setting]};`];
      }
      return styles;
    }, [])
    .join('\n');
}

/**
 * @typedef {object} ExtensionDemand
 * @property {string} identifier
 * @property {string} version
 */

/**
 * @typedef {object} CodeFenceData
 * @property {string} language
 * @property {*} markdownNode
 * @property {*} codeFenceNode
 * @property {*} parsedOptions
 */

/**
 * @typedef {object} LineData
 * @property {string} content The line’s string content
 * @property {number} index The zero-based line index
 * @property {string} language The code fence’s language
 * @property {object} codeFenceOptions The code fence’s options parsed from the language suffix
 */

/**
 * @typedef {object} ColorThemeSettings
 * @property {string} defaultTheme
 * @property {string=} prefersLightTheme
 * @property {string=} prefersDarkTheme
 */

/**
 * @typedef {string | ColorThemeSettings | ((data: CodeFenceData) => string | ColorThemeSettings)=} ColorThemeOption
 */

/**
 * @typedef {object} PluginOptions
 * @property {ColorThemeOption=} colorTheme
 * @property {string=} wrapperClassName
 * @property {Record<string, string>=} languageAliases
 * @property {ExtensionDemand[]=} extensions
 * @property {(line: LineData) => string=} getLineClassName
 * @property {boolean=} injectStyles
 * @property {(colorValue: string, theme: string) => string=} replaceColor
 * @property {string=} extensionDataDirectory
 * @property {'trace' | 'debug' | 'info' | 'warn' | 'error'=} logLevel
 * @property {import('./host').Host=} host
 */

function createPlugin() {
  const getRegistry = createGetRegistry();

  /**
   *
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
      host = defaultHost
    } = {}
  ) {
    logger.setLevel(logLevel);
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
      const { languageName, options } = parseCodeFenceHeader(node.lang ? node.lang.toLowerCase() : '');
      await downloadExtensionsIfNeeded({
        extensions,
        cache,
        extensionDir: extensionDataDirectory,
        host
      });

      const grammarCache = await cache.get('grammars');
      const scope = getScope(languageName, grammarCache, languageAliases);
      if (!scope && languageName) {
        warnUnknownLanguage(languageName);
      }

      // Set up theme
      const [registry, unlockRegistry] = await getRegistry(cache, missingScopeName => {
        warnMissingLanguageFile(missingScopeName, scope);
      });

      try {
        const colorThemeValue =
          typeof colorTheme === 'function'
            ? colorTheme({
                markdownNode,
                codeFenceNode: node,
                parsedOptions: options,
                language: languageName
              })
            : colorTheme;
        const colorThemeSettings = createColorThemeSettings(colorThemeValue);
        const themeClassNames = createThemeClassNames(colorThemeSettings);
        for (const setting in colorThemeSettings) {
          const colorThemeIdentifier = colorThemeSettings[setting];
          if (!colorThemeIdentifier) continue;

          const themeClassName = themeClassNames[setting];
          const themeCache = await cache.get('themes');
          const colorThemePath =
            getThemeLocation(colorThemeIdentifier, themeCache) ||
            path.resolve(markdownNode.fileAbsolutePath, colorThemeIdentifier);

          const { resultRules: tokenColors, resultColors: settings } = loadColorTheme(colorThemePath);
          const defaultTokenColors = {
            settings: {
              foreground: settings['editor.foreground'] || settings.foreground,
              background: settings['editor.background'] || settings.background
            }
          };

          registry.setTheme({ settings: [defaultTokenColors, ...tokenColors] });
          if (!stylesheets[themeClassName] || scope) {
            const rules = [
              renderRule(themeClassName, getStylesFromSettings(settings)),
              ...(scope
                ? prefixRules(
                    generateTokensCSSForColorMap(
                      registry.getColorMap().map(color => replaceColor(color, colorThemeIdentifier))
                    ).split('\n'),
                    `.${themeClassName} `
                  )
                : [])
            ];

            if (setting === 'prefersDarkTheme') {
              stylesheets[themeClassName] = prefersDark(rules);
            } else if (setting === 'prefersLightTheme') {
              stylesheets[themeClassName] = prefersLight(rules);
            } else {
              stylesheets[themeClassName] = rules.join('\n');
            }
          }
        }

        const rawLines = text.split(/\r?\n/);
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

        const highlightedLines = lineHighlighting.parseOptionKeys(options);
        const grammar = languageId && (await registry.loadGrammarWithConfiguration(scope, languageId, { tokenTypes }));
        let ruleStack = undefined;
        for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
          const line = rawLines[lineIndex];
          let htmlLine = '';
          if (grammar) {
            const result = grammar.tokenizeLine2(line, ruleStack);
            ruleStack = result.ruleStack;
            for (let i = 0; i < result.tokens.length; i += 2) {
              const startIndex = result.tokens[i];
              const metadata = result.tokens[i + 1];
              const endIndex = result.tokens[i + 2] || line.length;
              /** @type {LineData} */
              htmlLine += [
                `<span class="${getClassNameFromMetadata(metadata)}">`,
                escapeHTML(line.slice(startIndex, endIndex)),
                '</span>'
              ].join('');
            }
          } else {
            htmlLine += escapeHTML(line);
          }

          const isHighlighted = highlightedLines.includes(lineIndex + 1);
          /** @type {LineData} */
          const lineData = { codeFenceOptions: options, index: lineIndex, content: line, language: languageName };
          const className = joinClassNames(
            getLineClassName(lineData),
            'vscode-highlight-line',
            isHighlighted && 'vscode-highlight-line-highlighted'
          );

          htmlLines.push([`<span class="${className}">`, htmlLine, `</span>`].join(''));
        }

        const className = joinClassNames(wrapperClassName, joinThemeClassNames(themeClassNames), 'vscode-highlight');
        node.type = 'html';
        node.value = [
          `<pre class="${className}" data-language="${languageName}">`,
          `<code class="vscode-highlight-code">`,
          htmlLines.join('\n'),
          `</code>`,
          `</pre>`
        ].join('');
      } finally {
        unlockRegistry();
      }
    }

    const themeNames = Object.keys(stylesheets);
    if (themeNames.length) {
      markdownAST.children.push({
        type: 'html',
        value: [
          '<style class="vscode-highlight-styles">',
          injectStyles ? styles : '',
          themeNames.map(theme => stylesheets[theme]).join('\n'),
          '</style>'
        ].join('')
      });
    }
  }
  return textmateHighlight;
}

module.exports = createPlugin;
