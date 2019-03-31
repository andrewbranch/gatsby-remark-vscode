// @ts-check
const path = require('path');
const constants = require('./constants');
const getIncludedGrammarFileContents = require('./getIncludedLanguageFileContents');
const { Registry, parseRawGrammar } = require('vscode-textmate');
const { getClassNameFromMetadata } = require('../lib/vscode/modes');
const { loadColorTheme } = require('../lib/vscode/colorThemeData');
const { generateTokensCSSForColorMap } = require('../lib/vscode/tokenization');

/** @type {Registry} */
let registry;

/**
 * @param {string} scopeName 
 */
function warnMissingLanguageFile(scopeName) {
  console.warn(`No language file was loaded for scope '${scopeName}'. `);
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
 * @typedef {object} PluginOptions
 * @property {string | ((markdownNode: any, codeBlockNode: any) => string)=} colorTheme
 * @property {string=} highlightClassName
 * @property {Record<string, string>=} scopesByLanguage
 * @property {Record<string, string>=} languageAliases
 * @property {(filePath: string) => string=} getGrammarFileContents
 * @property {(scopeName: string) => void=} onRequestUnknownLanguage
 */

/**
 * 
 * @param {*} param0
 * @param {PluginOptions=} options 
 */
async function textmateHighlight(
  { markdownAST, markdownNode },
  {
    colorTheme = () => 'darkPlus',
    highlightClassName = 'vscode-highlight',
    scopesByLanguage = {},
    languageAliases = {},
    getGrammarFileContents = getIncludedGrammarFileContents,
    onRequestUnknownLanguage = warnMissingLanguageFile,
  } = {},
) {
  scopesByLanguage = { ...constants.scopesByLanguage, ...scopesByLanguage };
  languageAliases = { ...constants.languageAliases, ...languageAliases };
  /** @type {Record<string, string>} */
  const stylesheets = {};

  for (const node of markdownAST.children) {
    if (node.type !== 'code' || !node.lang) continue;
    /** @type {string} */
    const lang = node.lang.toLowerCase();

    /** @type {string} */
    const scope = scopesByLanguage[lang] || scopesByLanguage[languageAliases[lang]];
    if (!scope) continue;

    /** @type {string} */
    const text = node.value || node.children && node.children[0] && node.children[0].value;
    if (!text) continue;

    if (!registry) {
      registry = new Registry({
        loadGrammar: async scopeName => {
          const contents = getGrammarFileContents(scopeName) || getIncludedGrammarFileContents(scopeName);
          if (contents) {
            return parseRawGrammar(contents, null);
          } else {
            onRequestUnknownLanguage(scopeName);
          }
        },
      });
    }

    const colorThemeValue = typeof colorTheme === 'function' ? colorTheme(markdownNode, node) : colorTheme;
    const colorThemePath = constants.themeLocations[colorThemeValue]
      || path.resolve(markdownNode.fileAbsolutePath, colorThemeValue);
    const { name: themeName, resultRules: tokenColors, resultColors: settings } = loadColorTheme(colorThemePath);
    registry.setTheme({ settings: tokenColors });
    if (!stylesheets[themeName]) {
      stylesheets[themeName] = [
        `.${themeName} {\n${getStylesFromSettings(settings)}\n}`,
        ...generateTokensCSSForColorMap(registry.getColorMap())
          .split('\n')
          .map(rule => rule.trim() ? `.${themeName} ${rule}` : ''),
      ].join('\n');
    }

    const grammar = await registry.loadGrammar(scope)
    const rawLines = text.split(/\r?\n/);
    const htmlLines = [];
    let ruleStack = undefined;
    for (const line of rawLines) {
      const result = grammar.tokenizeLine2(line, ruleStack);
      ruleStack = result.ruleStack;
      let htmlLine = '';
      for (let i = 0; i < result.tokens.length; i += 2) {
        const startIndex = result.tokens[i];
        const metadata = result.tokens[i + 1];
        const endIndex = result.tokens[i + 2] || line.length;
        htmlLine += [
          `<span class="${getClassNameFromMetadata(metadata)}">`,
          line.slice(startIndex, endIndex),
          '</span>',
        ].join('');
      }
      htmlLines.push(htmlLine);
    }

    node.type = 'html';
    node.value = [
      `<pre class="${[highlightClassName, themeName].join(' ').trim()}" data-language="${lang}">`,
      `<code>`,
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
        themeNames.map(theme => stylesheets[theme]).join('\n'),
        '</style>',
      ].join(''),
    });
  }
};

module.exports = textmateHighlight;
