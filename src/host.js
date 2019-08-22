const request = require('request');
const decompress = require('decompress');
const zlib = require('zlib');
const util = require('util');
const gunzip = util.promisify(zlib.gunzip);

/**
 * @typedef {object} Response
 * @property {Buffer | undefined} body
 * @property {number} statusCode
 */

/**
 * @typedef {object} Host
 * @property {(url: string, options: request.CoreOptions) => Promise<Response>} fetch
 * @property {(input: string | Buffer, output: string) => Promise<unknown>} decompress
 */

/** @type {Host} */
const host = {
  fetch: (url, options) =>
    new Promise((resolve, reject) => {
      request.get(url, options, async (error, res, body) => {
        if (error) {
          return reject(error);
        }
        if (res.statusCode !== 200) {
          return resolve({ body, statusCode: res.statusCode });
        }
        if (res.headers['content-encoding'] === 'gzip') {
          const unzipped = await gunzip(body);
          return resolve({ body: unzipped, statusCode: res.statusCode });
        }

        resolve({ body, statusCode: res.statusCode });
      });
    }),

  decompress
};

module.exports = host;
