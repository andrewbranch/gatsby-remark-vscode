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
const highlightCodeFenceOptionsTransformer = ({ codeFenceOptions, line, state = getInitialState(codeFenceOptions) }) => {
  const isHighlighted = state.highlightedLines[0] === state.lineNumber;
  return {
    line: isHighlighted ? highlightLine(line) : line,
    ...isHighlighted && { data: { isHighlighted } },
    state: {
      lineNumber: state.lineNumber + 1,
      highlightedLines: isHighlighted ? state.highlightedLines.slice(1) : state.highlightedLines
    }
  };
}

highlightCodeFenceOptionsTransformer.displayName = 'highlightCodeFenceOptions';
highlightCodeFenceOptionsTransformer.schemaExtension = `
  type VSCodeHighlightLine {
    isHighlighted: Boolean
  }
`;

module.exports = { highlightCodeFenceOptionsTransformer };
