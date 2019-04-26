// @ts-check
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const util = require('util');
const request = require('request');
const decompress = require('decompress');
const processExtension = require('./processExtension');
const { highestBuiltinLanguageId } = require('./storeUtils');
const {
  parseExtensionIdentifier,
  getExtensionPath,
  getExtensionBasePath,
  getExtensionPackageJson,
} = require('./utils');
const gunzip = util.promisify(zlib.gunzip);
let languageId = highestBuiltinLanguageId + 1;

/**
 * @param {*} cache
 * @param {string} key 
 * @param {object} value 
 */
async function mergeCache(cache, key, value) {
  await cache.set(key, { ...await cache.get(key), ...value });
}

/**
 * @param {import('.').ExtensionDemand} extensionDemand
 * @param {*} cache
 */
async function syncExtensionData({ identifier }, cache) {
  const packageJsonPath = path.join(getExtensionPath(identifier), 'package.json');
  const { grammars, themes } = await processExtension(packageJsonPath);
  Object.keys(grammars).forEach(scopeName => grammars[scopeName].languageId = languageId++);
  await mergeCache(cache, 'grammars', grammars);
  await mergeCache(cache, 'themes', themes);
}

/**
 * @param {import('.').ExtensionDemand} extensionDemand
 * @param {*} cache
 */
async function downloadExtension(extensionDemand, cache) {
  const { identifier, version } = extensionDemand;
  const { publisher, name } = parseExtensionIdentifier(identifier);
  const url = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${name}/${version}/vspackage`;
  const archive = await new Promise((resolve, reject) => {
    request.get(url, { encoding: null }, (error, res, body) => {
      if (error) {
        return reject(error);
      }
      if (res.statusCode === 404) {
        return reject(new Error(`Could not find extension with publisher '${publisher}', name '${name}', and verion '${version}'.`));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download extension ${identifier} with status code ${res.statusCode}`));
      }
      if (res.headers['content-encoding'] === 'gzip') {
        return gunzip(body).then(resolve, reject);
      }

      resolve(body);
    });
  });

  const extensionPath = getExtensionBasePath(identifier);
  await decompress(archive, extensionPath);
  await syncExtensionData(extensionDemand, cache);
  return extensionPath;
}

/**
 * @param {import('.').ExtensionDemand} extensionDemand
 * @param {*} cache
 */
async function downloadExtensionIfNeeded(extensionDemand, cache) {
  const { identifier, version } = extensionDemand;
  const extensionPath = getExtensionBasePath(identifier);
  if (!fs.existsSync(extensionPath)) {
    return downloadExtension(extensionDemand, cache);
  }
  const packageJson = getExtensionPackageJson(identifier);
  if (packageJson.version !== version) {
    return downloadExtension(extensionDemand, cache);
  }

  await syncExtensionData(extensionDemand, cache);
  return extensionPath;
}

module.exports = { downloadExtension, downloadExtensionIfNeeded, syncExtensionData };
