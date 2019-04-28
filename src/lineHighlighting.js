// @ts-check
const dashRegExp = /[-–—]/;
const rangeRegExp = /^\d+[-–—]\d+$/;
const numberRegExp = /^\d+$/;

/**
 * @param {object} codeFenceOptions
 * @returns {number[]}
 */
function parseOptionKeys(codeFenceOptions) {
  const lines = [];
  for (const key in codeFenceOptions) {
    if (codeFenceOptions[key] === true) {
      if (numberRegExp.test(key)) lines.push(parseInt(key, 10));
      else if (rangeRegExp.test(key)) {
        const [lower, upper] = key.split(dashRegExp).map(s => parseInt(s, 10));
        for (let i = lower; i <= upper; i++) lines.push(i);
      }
    }
  }
  return lines;
}

module.exports = { parseOptionKeys };
