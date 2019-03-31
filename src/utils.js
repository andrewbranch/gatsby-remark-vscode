// @ts-check
const path = require('path');

/**
 * Splits a Visual Studio Marketplace extension identifier into publisher and extension name.
 * @param {string} identifier The unique identifier of a VS Code Marketplace extension in the format 'publisher.extension-name'.
 */
function parseExtensionIdentifier(identifier) {
  const [publisher, name] = identifier.split('.');
  if (!name) {
    throw new Error(`Extension identifier must be in format 'publisher.extension-name'.`);
  }

  return { publisher, name };
}

/**
 * Gets the absolute path to the download path of a downloaded extension.
 * @param {string} identifier 
 */
function getExtensionBasePath(identifier) {
  return path.resolve(__dirname, '../lib/extensions', identifier);
}

/**
 * Gets the absolute path to the data directory of a downloaded extension.
 * @param {string} identifier 
 */
function getExtensionPath(identifier) {
  return path.resolve(getExtensionBasePath(identifier), 'extension');
}

/**
 * Gets the package.json of an extension as a JavaScript object.
 * @param {string} identifier 
 * @returns {object}
 */
function getExtensionPackageJson(identifier) {
  return require(path.join(getExtensionPath(identifier), 'package.json'));
}

module.exports = { parseExtensionIdentifier, getExtensionPath, getExtensionBasePath, getExtensionPackageJson };
