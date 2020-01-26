// @ts-check

/**
 *
 * @param {LineTransformer[]} transformers
 * @param {string} text
 * @param {string} languageName
 * @param {object} meta
 * @returns {Promise<Line[]>}
 */
async function getTransformedLines(transformers, text, languageName, meta) {
  /** @type {Line[]} */
  const result = [];
  const rawLines = text.split(/\r?\n/);
  const prevTransformerStates = [];

  linesLoop: for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    let line = rawLines[lineIndex];
    const attrs = {};
    const graphQLData = {};
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
      if (!txResult.line) {
        continue linesLoop;
      }
      line = txResult.line.text;
      Object.assign(attrs, txResult.line.attrs);
      Object.assign(graphQLData, txResult.data);
    }
    result.push({ text: line, attrs, data: graphQLData });
  }

  return result;
}

module.exports = getTransformedLines;
