// @ts-check
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const util = require('util');
const request = require('request');
const decompress = require('decompress');
const { highestBuiltinLanguageId } = require('./constants');
const {
  parseExtensionIdentifier,
  getExtensionPath,
  getExtensionBasePath,
  getExtensionPackageJson,
  getLanguageNames,
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
async function syncExtensionData({ identifier, themes = [], languages = [] }, cache) {
  const extensionData = getExtensionPackageJson(identifier);
  const grammarContributions = extensionData.contributes && extensionData.contributes.grammars;
  const themeContributions = extensionData.contributes && extensionData.contributes.themes;

  // Sync grammars
  for (const language of languages) {
    if (!grammarContributions) {
      throw new Error(
        `Extension '${identifier}' does not contribute any grammars, but some were requested: ` +
        languages.map(l => ` - ${l}`).join('\n'));
    }

    const grammarContribution = grammarContributions.find(contribution => contribution.language === language);
    if (!grammarContribution) {
      throw new Error(
        `Extension '${identifier}' does not contribute the grammar '${language}'. ` +
        `The list of grammars it contains is:\n${grammarContributions.map(c => ` - ${c.language}`).join('\n')}`);
    }

    const grammarFilePath = path.resolve(getExtensionPath(identifier), grammarContribution.path);
    const languageRegistration = extensionData.contributes.languages
      && extensionData.contributes.languages.find(l => l.id === grammarContribution.language);

    await mergeCache(cache, 'grammarLocations', {
      [grammarContribution.scopeName]: grammarFilePath,
    });

    await mergeCache(cache, 'languageIds', {
      [grammarContribution.scopeName]: languageId++,
    });

    await mergeCache(cache, 'tokenTypes', {
      [grammarContribution.scopeName]: grammarContribution.tokenTypes,
    });

    await mergeCache(cache, 'scopesByLanguage', {
      ...languageRegistration && getLanguageNames(languageRegistration).reduce((hash, name) => ({
        ...hash,
        [name]: grammarContribution.scopeName,
      }), {}),
    });
  }

  // Sync themes
  for (const theme of themes) {
    if (!themeContributions) {
      throw new Error(
        `Extension '${identifier}' does not contribute any themes, but some were requested: ` +
        themes.map(t => ` - ${t}`).join('\n'));
    }

    const themeContribution = themeContributions.find(contribution => contribution.id === theme)
      || themeContributions.find(contribution => contribution.label === theme);
    if (!themeContribution) {
      const themeList = themeContributions.map(c => ` - ${c.label || c.id || path.extname(c.path).split('.')[0]}`).join('\n');
      throw new Error(
        `Extension '${identifier}' does not contribute the theme '${theme}'. ` +
        `The list of themes it contains is:\n${themeList}`);
      }

    const themeFilePath = path.resolve(getExtensionPath(identifier), themeContribution.path);

    await mergeCache(cache, 'themeLocations', {
      [theme]: themeFilePath,
    });

    if (themeContribution.label) {
      await mergeCache(cache, 'themeAliases', {
        [themeContribution.label.toLowerCase()]: theme,
      });
    }
  }
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
