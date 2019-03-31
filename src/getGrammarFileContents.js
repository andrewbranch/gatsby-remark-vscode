// @ts-check
const fs = require('fs');
const util = require('util');
const { grammarLocations } = require('./constants');
const readFile = util.promisify(fs.readFile);

/**
 * Gets the string contents of the TextMate grammar definition for a given scope name.
 * @param {string} scopeName
 * @returns {Promise<string?>}
 */
async function getGrammarFileContents(scopeName) {
  const fileName = grammarLocations[scopeName];
  if (fileName) {
    return readFile(fileName, 'utf8');
  }
}

module.exports = { getGrammarFileContents };
