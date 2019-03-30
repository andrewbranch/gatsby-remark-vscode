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

function textmateHighlight(
  { markdownAST },
  {
    colorTheme = 'darkPlus',
    scopesByLanguage = {},
    languageAliases = {},
    getGrammarFileContents = getIncludedGrammarFileContents,
    onRequestUnknownLanguage = warnMissingLanguageFile,
  } = {},
) {
  scopesByLanguage = { ...constants.scopesByLanguage, ...scopesByLanguage };
  languageAliases = { ...constants.languageAliases, ...languageAliases };

  for (const node of markdownAST.children) {
    if (node.type !== 'code' || !node.lang) continue;
    const lang = node.lang.toLowerCase();

    /** @type {string} */
    const scope = scopesByLanguage[lang] || scopesByLanguage[languageAliases[lang]];
    if (!scope) continue;

    /** @type {string} */
    const text = node.value || node.children && node.children[0] && node.children[0].value;
    if (!text) continue;

    if (!registry) {
      registry = new Registry({
        loadGrammar: scopeName => new Promise(resolve => {
          const contents = getGrammarFileContents(scopeName) || getIncludedGrammarFileContents(scopeName);
          if (contents) {
            resolve(parseRawGrammar(contents, null));
          } else {
            onRequestUnknownLanguage(scopeName);
          }
        }),
      });
    }

    const colorThemePath = constants.themeLocations[colorTheme] || colorTheme;
    const tokenColors = [];
    const colorMap = {};
    loadColorTheme(colorThemePath, tokenColors, colorMap);
    registry.setTheme({ settings: tokenColors });
    const css = generateTokensCSSForColorMap(registry.getColorMap());

    return registry.loadGrammar(scope).then(grammar => {
      const lines = text.split(/\r?\n/);
      let ruleStack = undefined;
      
      for (const line of lines) {
        const result = grammar.tokenizeLine2(line, ruleStack);
        ruleStack = result.ruleStack;
        for (let i = 0; i < result.tokens.length; i += 2) {
          const startIndex = result.tokens[i];
          const metadata = result.tokens[i + 1];
          console.log(startIndex, getClassNameFromMetadata(metadata));
        }
        console.log('\n');
      }
    });

  }
};

module.exports = textmateHighlight;
