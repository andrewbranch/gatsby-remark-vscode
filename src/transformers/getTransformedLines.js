// @ts-check

const { joinClassNames } = require('../renderers/css');

/**
 *
 * @param {LineTransformer[]} transformers
 * @param {string} text
 * @param {string} languageName
 * @param {object} meta
 * @returns {Promise<Line[]>}
 */
async function getTransformedLines(transformers, text, languageName, meta) {
  /** @type {Omit<Line, 'gutterCells'>[]} */
  const result = [];
  const rawLines = text.split(/\r?\n/);
  const prevTransformerStates = [];
  const gutterCellsPerTransformer = [];
  /** @type {GutterCell[][][]} */
  const gutterCells = [];

  linesLoop: for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    let line = rawLines[lineIndex];
    /** @type {GutterCell[][]} */
    const lineGutterCells = [];
    const attrs = {};
    const graphQLData = {};
    /** @type {string[]} */
    const addedContainerClassNames = [];
    for (let i = 0; i < transformers.length; i++) {
      const transformer = transformers[i];
      const state = prevTransformerStates[i];
      /** @type {LineTransformerResult} */
      const txResult = await transformer({
        state,
        line: { text: line, attrs },
        meta,
        language: languageName
      });

      prevTransformerStates[i] = txResult.state;
      if (txResult.setContainerClassName) {
        addedContainerClassNames.push(txResult.setContainerClassName);
      }
      if (!txResult.line) {
        continue linesLoop;
      }
      if (txResult.gutterCells) {
        gutterCellsPerTransformer[i] = Math.max(txResult.gutterCells.length, gutterCellsPerTransformer[i] || 0);
        lineGutterCells[i] = txResult.gutterCells;
      } else {
        gutterCellsPerTransformer[i] = Math.max(0, gutterCellsPerTransformer[i] || 0);
      }

      line = txResult.line.text;
      Object.assign(attrs, txResult.line.attrs);
      Object.assign(graphQLData, txResult.data);
    }
    gutterCells.push(lineGutterCells);
    result.push({
      text: line,
      attrs,
      data: graphQLData,
      setContainerClassName: joinClassNames(...addedContainerClassNames) || undefined
    });
  }

  const flattenedGutterCells = flattenGutterCells(gutterCells, gutterCellsPerTransformer);
  return result.map((line, i) => ({ ...line, gutterCells: flattenedGutterCells[i] }));
}

/**
 * Transforms a 3D array of gutter cells into a 2D array of gutter cells.
 * The input is in the form of gutter cells per line transformer per line,
 * whereas the output is is gutter cells per line. Each line transformer can
 * return more than one gutter cell, and need not return the same number of
 * cells for each line, so the flattening must be done in a way that ensures
 * that each line transformer has its gutter cells aligned to the same index
 * in every line. For example, for the input
 *
 * ```
 * [
 *   [[t0],       [t1a, t1b], [t2]],       // Line 1
 *   [undefined,  [t1],       [t2]],       // Line 2
 *   [[t0a, t0b], undefined,  [t2a, t2b]]  // Line 3
 * ]
 * ```
 *
 * we would flatten to
 *
 * ```
 * [
 *   [t0,        undefined, t1a,       t1b,       t2,  undefined], // Line 1
 *   [undefined, undefined, t1,        undefined, t2,  undefined], // Line 2
 *   [t0a,       t0b,       undefined, undefined, t2a, t2b]        // Line 3
 * ]
 * ```
 *
 * such that each of the three transformers (t0, t1, t2) reserve two gutter
 * cells for itself, padding empty spaces in the final array with `undefined`
 * to ensure correct vertical alignment.
 *
 * The parameter `gutterCellsPerTransformer` can be derived from `gutterCells`,
 * but as an optimization, we already know it from previously iterating through
 * line transformer results.
 *
 * @param {GutterCell[][][]} gutterCells
 * @param {number[]} gutterCellsPerTransformer
 * @returns {GutterCell[][]}
 */
function flattenGutterCells(gutterCells, gutterCellsPerTransformer) {
  const totalGutterCells = gutterCellsPerTransformer.reduce((a, b) => a + b, 0);
  return gutterCells.map(transformerResults => {
    /** @type {GutterCell[]} */
    const result = Array(totalGutterCells).fill(undefined);
    for (let i = 0; i < transformerResults.length; i++) {
      const currentTransformerCells = transformerResults[i];
      if (currentTransformerCells) {
        for (let j = 0; j < currentTransformerCells.length; j++) {
          result[(gutterCellsPerTransformer[i - 1] || 0) + j] = currentTransformerCells[j];
        }
      }
    }
    return result;
  });
}

module.exports = getTransformedLines;
