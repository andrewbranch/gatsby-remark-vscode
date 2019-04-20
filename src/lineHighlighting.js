// @ts-check
const dashRegExp = /[-–—]/;
const rangeRegExp = /^\d+[-–—]\d+$/;
const numberRegExp = /^\d+$/;

/**
 * @param {object} codeBlockOptions
 * @returns {number[]}
 */
function parseOptionKeys(codeBlockOptions) {
  const lines = [];
  for (const key in codeBlockOptions) {
    if (codeBlockOptions[key] === true) {
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