// @ts-check
const { highlightDiffLine } = require('./transformerUtils');

function createDiffLineTransformer() {
  // How do I get the parsed code fence options here?
  /** @type {LineTransformer<undefined>} */
  const diffLineTransformer = ({ line, meta: { diff } }) => {
    if (diff && line.text.startsWith('+')) {
      const text = line.text.replace(/^\+ ?/, '');
      return {
        line: highlightDiffLine({ ...line, text }, 'add'),
        data: { diff: 'ADD' },
        state: undefined,
        setContainerClassName: 'grvsc-has-line-highlighting',
        gutterCells: [
          {
            className: 'grvsc-diff-add',
            text: `+`
          }
        ]
      };
    }
    if (diff && line.text.startsWith('-')) {
      const text = line.text.replace(/^- ?/, '');
      return {
        line: highlightDiffLine({ ...line, text }, 'del'),
        data: { diff: 'DEL' },
        state: undefined,
        setContainerClassName: 'grvsc-has-line-highlighting',
        gutterCells: [
          {
            className: 'grvsc-diff-del',
            text: `-`
          }
        ]
      };
    }
    return { line, state: undefined };
  };

  diffLineTransformer.displayName = 'diff';
  diffLineTransformer.schemaExtension = `
    enum GRVSCDiff {
      ADD
      DEL
    }

    type GRVSCTokenizedLine {
      diff: GRVSCDiff
    }
  `;

  return diffLineTransformer;
}

module.exports = { createDiffLineTransformer };
