// @ts-check
const { highlightLine } = require('./transformerUtils');
const dashRegExp = /[-–—]/;
const rangeRegExp = /^\d+[-–—]\d+$/;
const numberRegExp = /^\d+$/;

/**
 * @typedef {{ lineNumber: number, highlightedLines: number[] }} State
 */

/**
 * @param {object} codeFenceOptions
 * @returns {number[]}
 */
function getLinesFromCodeFenceOptions(codeFenceOptions) {
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

/**
 * @param {object} codeFenceOptions
 * @returns {State}
 */
function getInitialState(codeFenceOptions) {
  return {
    lineNumber: 1,
    highlightedLines: getLinesFromCodeFenceOptions(codeFenceOptions)
  };
}

/** @type {LineTransformer<State>} */
function highlightCodeFenceOptionsTransformer({ codeFenceOptions, line, state = getInitialState(codeFenceOptions) }) {
  const isHighlightedLine = state.highlightedLines[0] === state.lineNumber;
  return {
    line: isHighlightedLine ? highlightLine(line) : line,
    state: {
      lineNumber: state.lineNumber + 1,
      highlightedLines: isHighlightedLine ? state.highlightedLines.slice(1) : state.highlightedLines
    }
  };
}

module.exports = { highlightCodeFenceOptionsTransformer };
