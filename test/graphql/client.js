// @ts-check
const http = require('http');

function createClient({
  port = 8558
} = {}) {
  return { request };

  /**
   * @param {string} query
   * @param {any=} variables
   * @param {boolean=} allowErrors
   */
  function request(query, variables, allowErrors) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ query, variables });
      const req = http.request(`http://localhost:${port}/__graphql`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      });

      req.once('error', reject);
      req.once('response', res => {
        if (res.statusCode !== 200) {
          return reject(`Received status code ${res.statusCode}`);
        }

        let rawData = '';
        res.on('data', chunk => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const data = JSON.parse(rawData);
            if (!allowErrors && data.errors) {
              return reject(new Error(data.errors.map(e => e.message).join('\n\n')));
            }
            resolve(data);
          } catch (err) {
            console.log(rawData);
            reject(err);
          }
        });
      });

      req.write(body);
      req.end();
    });
  }
}

module.exports = createClient;
