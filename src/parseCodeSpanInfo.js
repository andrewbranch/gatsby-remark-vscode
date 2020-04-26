/**
 * @param {string} text
 * @param {string} delimiter
 * @returns {{ languageName: string | undefined, meta: undefined, text: string }}
 */
function parseCodeSpanInfo(text, delimiter) {
  const index = text.indexOf(delimiter);
  if (index <= 0) return { languageName: undefined, meta: undefined, text };
  const languageName = text
    .slice(0, index)
    .trim()
    .toLowerCase();
  if (!languageName) return { languageName: undefined, meta: undefined, text };
  return { languageName, meta: undefined, text: text.slice(index + delimiter.length) };
}

module.exports = parseCodeSpanInfo;
