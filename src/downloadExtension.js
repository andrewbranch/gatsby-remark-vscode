// @ts-check
const path = require('path');
const zlib = require('zlib');
const util = require('util');
const request = require('request');
const decompress = require('decompress');
const gunzip = util.promisify(zlib.gunzip);

/**
 * @param {string} identifier 
 * @param {string} version 
 */
async function downloadExtension(identifier, version) {
  const [publisher, extensionName] = identifier.split('.');
  if (!extensionName) {
    throw new Error(`Extension identifier must be in format 'publisher.extension-name'.`);
  }

  const url = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extensionName}/${version}/vspackage`;
  const archive = await new Promise((resolve, reject) => {
    request.get(url, { encoding: null }, (error, res, body) => {
      if (error) {
        return reject(error);
      }
      if (res.statusCode === 404) {
        return reject(new Error(`Could not find extension with publisher '${publisher}', name '${extensionName}', and verion '${version}'.`));
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

  const extensionPath = path.resolve(__dirname, '../lib/extensions', identifier);
  await decompress(archive, extensionPath);
  return extensionPath;
}

module.exports = downloadExtension;
