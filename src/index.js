// @ts-check
const fs = require('fs');
const util = require('util');
const path = require('path');
const escapeHTML = require('lodash.escape');
const constants = require('./constants');
const createGetRegistry = require('./createGetRegistry');
const lineHighlighting = require('./lineHighlighting');
const parseCodeFenceHeader = require('./parseCodeFenceHeader');
const { Registry, parseRawGrammar } = require('vscode-textmate');
const { downloadExtensionIfNeeded } = require('./downloadExtension');
const { getClassNameFromMetadata } = require('../lib/vscode/modes');
const { loadColorTheme } = require('../lib/vscode/colorThemeData');
const { generateTokensCSSForColorMap } = require('../lib/vscode/tokenization');
const styles = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');

/**
 * @param {string} missingScopeName 
 * @param {string} rootScopeName
 */
function warnMissingLanguageFile(missingScopeName, rootScopeName) {
  console.warn(`No language file was loaded for scope '${missingScopeName}' (requested by '${rootScopeName}').`);
}

/**
 * @param {string} lang 
 */
function warnUnknownLanguage(lang) {
  console.warn(
    `Encountered unknown language '${lang}'. If '${lang}' is an alias for a supported language, ` +
    `use the 'languageAliases' plugin option to map it to the canonical language name.`);
}

const settingPropertyMap = { 'editor.background': 'background-color', 'editor.foreground': 'color' };
/**
 * @param {Record<string, string>} settings 
 */
function getStylesFromSettings(settings) {
  return Object.keys(settings).reduce((styles, setting) => {
    const property = settingPropertyMap[setting];
    if (property) {
      return [...styles, `${property}: ${settings[setting]};`];
    }
    return styles;
  }, []).join('\n');
}

/**
 * @typedef {object} ExtensionDemand
 * @property {string} identifier
 * @property {string} version
 * @property {string[]=} languages
 * @property {string[]=} themes
 */

/**
 * @typedef {object} LineData
 * @property {string} content The line’s string content 
 * @property {number} index The zero-based line index
 * @property {string} language The code block’s language
 * @property {object} codeBlockOptions The code block’s options parsed from the language suffix
 */

/**
 * @typedef {object} PluginOptions
 * @property {string | ((markdownNode: any, codeBlockNode: any, parsedOptions: object) => string)=} colorTheme
 * @property {string=} highlightClassName
 * @property {Record<string, string>=} scopesByLanguage
 * @property {Record<string, string>=} languageAliases
 * @property {ExtensionDemand[]=} extensions
 * @property {(line: LineData) => string=} getLineClassName
 * @property {boolean=} injectStyles
 * @property {(colorValue: string) => string=} replaceColor
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
      colorTheme = () => 'Default Dark+',
      highlightClassName = 'vscode-highlight',
      scopesByLanguage = {},
      languageAliases = {},
      extensions = [],
      getLineClassName = () => '',
      injectStyles = true,
      replaceColor = x => x,
    } = {},
  ) {
    /** @type {Record<string, string>} */
    const stylesheets = {};

    for (const node of markdownAST.children) {
      if (node.type !== 'code') continue;
      const { languageName, options } = parseCodeFenceHeader(node.lang ? node.lang.toLowerCase() : '');
      const languageExtension = extensions.find(ext => ext.languages && ext.languages.includes(languageName));
      if (languageExtension) {
        await downloadExtensionIfNeeded(languageExtension, cache);
      }

      scopesByLanguage = { ...constants.scopesByLanguage, ...await cache.get('scopesByLanguage'), ...scopesByLanguage };
      /** @type {string} */
      const scope = scopesByLanguage[languageName] || scopesByLanguage[languageAliases[languageName]];
      if (!scope && languageName) {
        warnUnknownLanguage(languageName);
      }

      // Set up theme
      const colorThemeValue = typeof colorTheme === 'function' ? colorTheme(markdownNode, node, options) : colorTheme;
      const themeExtension = extensions.find(ext => ext.themes && ext.themes.includes(colorThemeValue));
      if (themeExtension) {
        await downloadExtensionIfNeeded(themeExtension, cache);
      }

      const themeLocations = { ...constants.themeLocations, ...await cache.get('themeLocations') };
      const themeAliases = { ...constants.themeAliases, ...await cache.get('themeAliases') };
      const colorThemePath = themeLocations[colorThemeValue]
        || themeLocations[themeAliases[colorThemeValue]]
        || path.resolve(markdownNode.fileAbsolutePath, colorThemeValue);

      const { name: themeName, resultRules: tokenColors, resultColors: settings } = loadColorTheme(colorThemePath);
      const defaultTokenColors = {
        settings: {
          foreground: settings['editor.foreground'] || settings.foreground,
          background: settings['editor.background'] || settings.background,
        },
      };

      /** @type {string} */
      const text = node.value || node.children && node.children[0] && node.children[0].value;
      if (!text) continue;

      const rawLines = text.split(/\r?\n/);
      const htmlLines = [];
      /** @type {number} */
      let languageId;
      /** @type {Registry} */
      let registry;
      /** @type {() => void} */
      let unlockRegistry = () => {};

      if (scope) {
        languageId = { ...constants.languageIds, ...await cache.get('languageIds' ) }[scope];
        const [reg, unlock] = await getRegistry(cache, missingScopeName => warnMissingLanguageFile(missingScopeName, scope));
        registry = reg;
        unlockRegistry = unlock;
        registry.setTheme({ settings: [defaultTokenColors, ...tokenColors] });
        if (!stylesheets[themeName]) {
          stylesheets[themeName] = [
            `.${themeName} {\n${getStylesFromSettings(settings)}\n}`,
            ...generateTokensCSSForColorMap(registry.getColorMap().map(replaceColor))
              .split('\n')
              .map(rule => rule.trim() ? `.${themeName} ${rule}` : ''),
          ].join('\n');
        }
      }

      const highlightedLines = lineHighlighting.parseOptionKeys(options);
      const tokenTypes = scope && languageId && { ...constants.tokenTypes, ...await cache.get('tokenTypes') }[scope] || {};
      const grammar = registry && languageId && await registry.loadGrammarWithConfiguration(scope, languageId, { tokenTypes });
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
              '</span>',
            ].join('');
          }
        } else {
          htmlLine += escapeHTML(line);
        }
        
        const isHighlighted = highlightedLines.includes(lineIndex + 1);
        const lineData = { codeBlockOptions: options, index: lineIndex, content: line, language: languageName };
        const className = [
          getLineClassName(lineData),
          'vscode-highlight-line',
          isHighlighted ? 'vscode-highlight-line-highlighted' : ''
        ].join(' ').trim();

        htmlLines.push([
          `<span class="${className}">`,
          htmlLine,
          `</span>`
        ].join(''));
      }
      unlockRegistry();

      const className = [highlightClassName, themeName, 'vscode-highlight'].join(' ').trim();
      node.type = 'html';
      node.value = [
        `<pre class="${className}" data-language="${languageName}">`,
        `<code class="vscode-highlight-code">`,
        htmlLines.join('\n'),
        `</code>`,
        `</pre>`,
      ].join('');
    }

    const themeNames = Object.keys(stylesheets);
    if (themeNames.length) {
      markdownAST.children.push({
        type: 'html',
        value: [
          '<style class="vscode-highlight-styles">',
          injectStyles ? styles : '',
          themeNames.map(theme => stylesheets[theme]).join('\n'),
          '</style>',
        ].join(''),
      });
    }
  };
  return textmateHighlight;
}

module.exports = createPlugin;
