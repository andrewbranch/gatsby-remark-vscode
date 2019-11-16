// @ts-check

/**
 *
 * @param {LineTransformer[]} transformers
 * @param {string} text
 * @param {string} languageName
 * @param {object} meta
 * @returns {Line[]}
 */
function getTransformedLines(transformers, text, languageName, meta) {
  /** @type {Line[]} */
  const result = [];
  const rawLines = text.split(/\r?\n/);
  const prevTransformerStates = [];

  linesLoop: for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    let line = rawLines[lineIndex];
    const attrs = {};
    for (let i = 0; i < transformers.length; i++) {
      const transformer = transformers[i];
      const state = prevTransformerStates[i];
      const txResult = transformer({
        state,
        line: { text: line, attrs },
        meta,
        language: languageName
      });

      prevTransformerStates[i] = txResult.state;
      if (!txResult.line) {
        continue linesLoop;
      }
      line = txResult.line.text;
      Object.assign(attrs, txResult.line.attrs);
    }
    result.push({ text: line, attrs });
  }

  return result;
}

module.exports = getTransformedLines;
