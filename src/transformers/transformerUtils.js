/**
 * @param {object} attrs
 * @param {string} className
 */
function addClassName(attrs, className) {
  return {
    ...attrs,
    class: attrs.class ? attrs.class + ` ` + className : className
  };
}

/**
 * @param {LineTransformerArgs['line']} line
 * @param {string=} newText
 * @returns {LineTransformerArgs['line']}
 */
function highlightLine(line, newText) {
  return {
    attrs: addClassName(line.attrs, 'vscode-highlight-line-highlighted'),
    text: typeof newText === 'string' ? newText : line.text
  };
}

module.exports = { highlightLine, addClassName };
