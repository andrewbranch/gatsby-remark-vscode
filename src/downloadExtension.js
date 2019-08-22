// @ts-check
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const util = require('util');
const processExtension = require('./processExtension');
const { highestBuiltinLanguageId } = require('./storeUtils');
const {
  parseExtensionIdentifier,
  getExtensionPath,
  getExtensionBasePath,
  getExtensionPackageJson
} = require('./utils');
const gunzip = util.promisify(zlib.gunzip);
let languageId = highestBuiltinLanguageId + 1;

/**
 * @param {*} cache
 * @param {string} key
 * @param {object} value
 */
async function mergeCache(cache, key, value) {
  await cache.set(key, { ...(await cache.get(key)), ...value });
}

/**
 * @param {import('.').ExtensionDemand} extensionDemand
 * @param {*} cache
 * @param {string} extensionDir
 */
async function syncExtensionData({ identifier }, cache, extensionDir) {
  const packageJsonPath = path.join(getExtensionPath(identifier, extensionDir), 'package.json');
  const { grammars, themes } = await processExtension(packageJsonPath);
  Object.keys(grammars).forEach(scopeName => (grammars[scopeName].languageId = languageId++));
  await mergeCache(cache, 'grammars', grammars);
  await mergeCache(cache, 'themes', themes);
}

/**
 * @param {import('.').ExtensionDemand} extensionDemand
 * @param {*} cache
 * @param {string} extensionDir
 * @param {import('./host').Host} host
 */
async function downloadExtension(extensionDemand, cache, extensionDir, host) {
  const { identifier, version } = extensionDemand;
  const { publisher, name } = parseExtensionIdentifier(identifier);
  const url = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${name}/${version}/vspackage`;
  const response = await host.fetch(url, { encoding: null });
  if (response.statusCode === 404) {
    throw new Error(`Could not find extension with publisher '${publisher}', name '${name}', and verion '${version}'.`);
  }
  if (response.statusCode !== 200) {
    const details = response.body ? `. Response body:\n\n${response.body.toString('utf8')}` : '';
    throw new Error(`Failed to download extension ${identifier} with status code ${response.statusCode}${details}`);
  }

  const extensionPath = getExtensionBasePath(identifier, extensionDir);
  await host.decompress(response.body, extensionPath);
  await syncExtensionData(extensionDemand, cache, extensionDir);
  return extensionPath;
}

/**
 * @typedef {object} DownloadExtensionOptions
 * @property {import('.').ExtensionDemand[]} extensions
 * @property {*} cache
 * @property {string} extensionDir
 * @property {import('./host').Host} host
 */

/**
 * @param {DownloadExtensionOptions} options
 */
async function downloadExtensionsIfNeeded({ extensions, cache, extensionDir, host }) {
  extensions = extensions.slice();
  while (extensions.length) {
    const extensionDemand = extensions.shift();
    const { identifier, version } = extensionDemand;
    const extensionPath = getExtensionBasePath(identifier, extensionDir);
    if (!fs.existsSync(extensionPath)) {
      await downloadExtension(extensionDemand, cache, extensionDir, host);
      continue;
    }
    const packageJson = getExtensionPackageJson(identifier, extensionDir);
    if (packageJson.version !== version) {
      await downloadExtension(extensionDemand, cache, extensionDir, host);
      continue;
    }

    await syncExtensionData(extensionDemand, cache, extensionDir);
  }
}

module.exports = { downloadExtension, downloadExtensionIfNeeded: downloadExtensionsIfNeeded, syncExtensionData };
