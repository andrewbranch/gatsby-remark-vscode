// @ts-check
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const util = require('util');
const request = require('request');
const decompress = require('decompress');
const { scopesByLanguage, grammarLocations, themeLocations } = require('./constants');
const { parseExtensionIdentifier, getExtensionPath, getExtensionBasePath, getExtensionPackageJson } = require('./utils');
const gunzip = util.promisify(zlib.gunzip);

/**
 * @param {import('.').ExtensionDemand} extensionDemand 
 */
function syncExtensionData({ identifier, themes = [], languages = [] }) {
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
    grammarLocations[language] = grammarFilePath;
    scopesByLanguage[language] = grammarContribution.scopeName;
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
      throw new Error(
        `Extension '${identifier}' does not contribute the theme '${theme}'. ` +
        `The list of themes it contains is:\n${themeContributions.map(c => ` - ${c.id}`).join('\n')}`);
    }

    const themeFilePath = path.resolve(getExtensionPath(identifier), themeContribution.path);
    themeLocations[theme] = themeFilePath;
  }
}

/**
 * @param {import('.').ExtensionDemand} extensionDemand
 */
async function downloadExtension(extensionDemand) {
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
  syncExtensionData(extensionDemand);
  return extensionPath;
}

/**
 * @param {import('.').ExtensionDemand} extensionDemand
 */
async function downloadExtensionIfNeeded(extensionDemand) {
  const { identifier, version } = extensionDemand
  const extensionPath = getExtensionBasePath(identifier);
  if (!fs.existsSync(extensionPath)) {
    return downloadExtension(extensionDemand);
  }
  const packageJson = getExtensionPackageJson(identifier);
  if (packageJson.version !== version) {
    return downloadExtension(extensionDemand);
  }
  return extensionPath;
}

module.exports = { downloadExtension, downloadExtensionIfNeeded, syncExtensionData };
