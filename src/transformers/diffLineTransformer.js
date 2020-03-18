// @ts-check
const { highlightDiffLine } = require('./transformerUtils');

function createDiffLineTransformer() {
  // How do I get the parsed code fence options here?
  /** @type {LineTransformer<any>} */
  const transformer = ({ line, parsedOptions: { diff } }) => {
    if (diff && line.text.startsWith('+ ')) {
      return {
        line: highlightDiffLine(line, 'add'),
        data: { isDiffAdd: true }
      };
    }
    if (diff && line.text.startsWith('- ')) {
      return {
        line: highlightDiffLine(line, 'del'),
        data: { isDiffDel: true }
      };
    }
    return { line };
  };

  transformer.displayName = 'diff';
  transformer.schemaExtension = `
    type GRVSCTokenizedLine {
      isDiff: Boolean
    }
  `;

  return transformer;
}

module.exports = { createDiffLineTransformer };
