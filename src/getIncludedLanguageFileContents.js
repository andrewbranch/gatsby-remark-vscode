const fs = require('fs');
const path = require('path');
const { scopesByLanguage } = require('./constants');

/**
 * @param {string} name 
 */
function getGrammarFileContents(name) {
  return fs.readFileSync(path.resolve(__dirname, '../lib/grammars', name), 'utf8');
}

const grammarFileNames = {
  [scopesByLanguage.js]: 'JavaScript.tmLanguage.json',
  [scopesByLanguage.jsx]: 'JavaScriptReact.tmLanguage.json',
  [scopesByLanguage.ts]: 'TypeScript.tmLanguage',
  [scopesByLanguage.tsx]: 'TypeScriptReact.tmLanguage',
};

/**
 * Gets the string contents of the TextMate grammar definition for a given scope name.
 * @param {string} scopeName
 * @returns {string?}
 */
function getIncludedGrammarFileContents(scopeName) {
  const fileName = grammarFileNames[scopeName];
  if (fileName) {
    return getGrammarFileContents(fileName);
  }
}

module.exports = getIncludedGrammarFileContents;
