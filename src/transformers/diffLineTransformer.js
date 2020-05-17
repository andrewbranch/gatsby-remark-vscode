// @ts-check
const { highlightDiffLine } = require('./transformerUtils');

function createDiffLineTransformer() {
  // How do I get the parsed code fence options here?
  /** @type {LineTransformer<any>} */
  const diffLineTransformer = ({ line, meta: { diff } }) => {
    if (diff && line.text.startsWith('+ ')) {
      line.text = line.text.replace(/^\+ /, '');
      return {
        line: highlightDiffLine(line, 'add'),
        data: { isDiffAdd: true },
        gutterCells: [
          {
            className: 'grvsc-diff-add',
            text: `+`
          }
        ]
      };
    }
    if (diff && line.text.startsWith('- ')) {
      line.text = line.text.replace(/^\- /, '');
      return {
        line: highlightDiffLine(line, 'del'),
        data: { isDiffDel: true },
        gutterCells: [
          {
            className: 'grvsc-diff-del',
            text: `-`
          }
        ]
      };
    }
    return { line };
  };

  diffLineTransformer.displayName = 'diff';
  diffLineTransformer.schemaExtension = `
    type GRVSCTokenizedLine {
      isDiff: Boolean
    }
  `;

  return diffLineTransformer;
}

module.exports = { createDiffLineTransformer };
