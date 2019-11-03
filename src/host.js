// @ts-check
const request = require('request');
const decompress = require('decompress');
const { gunzip } = require('./utils');

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
