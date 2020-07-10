const slashSlashCommentRegExp = /\/\/(.*)$/;
const hashCommentRegExp = /#(.*)$/;
const slashStarCommentRegExp = /\/\*(.*?)\*\/\s*$/;
const xmlCommentRegExp = /<!--(.*?)-->\s*$/;
const semicolonCommentRegExp = /;(.*)$/;
const dashDashCommentRegExp = /--(.*)$/;

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
    attrs: addClassName(line.attrs, 'grvsc-line-highlighted'),
    text: typeof newText === 'string' ? newText : line.text
  };
}

/**
 * @param {string} input
 * @param {string} scope
 * @param {boolean=} trim
 */
function getCommentContent(input, scope, trim) {
  const regExp = getCommentRegExp(scope);
  const match = regExp.exec(input);
  if (match) {
    const content = match[1];
    if (trim) {
      return content && content.trim();
    }
    return content;
  }
}

/** @param {string} scope */
function getCommentRegExp(scope) {
  switch (scope) {
    case 'source.python':
    case 'source.ruby':
    case 'source.shell':
    case 'source.perl':
    case 'source.coffee':
    case 'source.yaml':
      return hashCommentRegExp;
    case 'source.css':
    case 'source.c':
    case 'source.cpp':
    case 'source.objc':
    case 'source.css.less':
      return slashStarCommentRegExp;
    case 'text.html.derivative':
    case 'text.xml':
    case 'text.html.markdown':
      return xmlCommentRegExp;
    case 'source.clojure':
      return semicolonCommentRegExp;
    case 'source.sql':
      return dashDashCommentRegExp;
    default:
      return slashSlashCommentRegExp;
  }
}

/**
 * @param {LineTransformerArgs['line']} line
 * @param {'add' | 'del'} postfix
 * @returns {LineTransformerArgs['line']}
 */
function highlightDiffLine(line, postfix) {
  return {
    attrs: addClassName(line.attrs, `grvsc-line-diff grvsc-line-diff-${postfix}`),
    text: line.text
  };
}

module.exports = { highlightLine, addClassName, getCommentContent, getCommentRegExp, highlightDiffLine };
