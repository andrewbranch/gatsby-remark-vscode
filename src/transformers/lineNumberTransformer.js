const { getCommentContent, getCommentRegExp } = require('./transformerUtils');
const { getScope } = require('../storeUtils');
const lineNumberRegExp = /L(\d+)$/;

/**
 * @param {Record<string, string>} languageAliases
 * @param {GatsbyCache} cache
 */
function createLineNumberLineTransformer(languageAliases, cache) {
  let grammarCache;

  /** @type {LineTransformer<number>} */
  const lineNumberTransformer = async ({ meta, state, line, language }) => {
    if (!grammarCache) {
      grammarCache = await cache.get('grammars');
    }

    const scope = getScope(language, grammarCache, languageAliases);
    const commentContent = getCommentContent(line.text, scope, /*trim*/ true);
    if (commentContent) {
      const match = lineNumberRegExp.exec(commentContent);
      if (match && match[1]) {
        const lineNumber = parseInt(match[1], 10);
        if (!isNaN(lineNumber)) {
          return {
            state: lineNumber,
            line: {
              ...line,
              text: line.text.replace(getCommentRegExp(scope), '')
            },
            gutterCells: [
              {
                className: 'grvsc-line-number',
                text: String(lineNumber)
              }
            ],
            data: {
              lineNumber
            }
          };
        }
      }
    }

    if (state !== undefined) {
      return {
        state: state + 1,
        line,
        gutterCells: [
          {
            className: 'grvsc-line-number',
            text: String(state + 1)
          }
        ],
        data: {
          lineNumber: state + 1
        }
      };
    }

    if (meta.numberLines !== undefined) {
      const lineNumber = typeof meta.numberLines === 'number' ? meta.numberLines : 1;
      return {
        state: lineNumber,
        line,
        gutterCells: [
          {
            className: 'grvsc-line-number',
            text: String(lineNumber)
          }
        ],
        data: {
          lineNumber
        }
      };
    }

    return { state, line };
  };

  lineNumberTransformer.displayName = 'lineNumber';
  lineNumberTransformer.schemaExtension = `
    type GRVSCTokenizedLine {
      lineNumber: Int
    }
  `;

  return lineNumberTransformer;
}

module.exports = { createLineNumberLineTransformer };
