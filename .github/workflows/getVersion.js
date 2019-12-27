/**
 * @param {string | number} value
 * @param {number} length
 */
function padInt(value, length) {
  value = value.toString();
  while (value.length < length) {
    value = "0" + value;
  }
  return value;
}

const version = process.argv[2];
if (!version || !/\d+\.\d+\.\d+/.test(version)) {
  throw new Error(`Must provide base version, e.g. 'node getVersion.js 2.0.0'`);
}
const date = new Date();
const timestamp = [
  date.getUTCFullYear(),
  padInt(date.getUTCMonth() + 1, 2),
  padInt(date.getUTCDate(), 2),
].join('');

console.log(`${version}-alpha.${timestamp}`);
