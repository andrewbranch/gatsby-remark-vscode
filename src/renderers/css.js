// @ts-check
const createWriter = require('./createWriter');

/**
 * @param {string} condition
 * @param {string | string[]} rules
 */
function renderMediaQuery(condition, rules) {
  return `@media (${condition}) {\n${typeof rules === 'string' ? rules : rules.join('\n')}\n}`;
}

/**
 * @param {string | string[]} rules
 */
function prefersLight(rules) {
  return renderMediaQuery('prefers-color-scheme: light', rules);
}

/**
 * @param {string | string[]} rules
 */
function prefersDark(rules) {
  return renderMediaQuery('prefers-color-scheme: dark', rules);
}

/**
 * @param {string[]} rules
 * @param {string} prefix
 */
function prefixRules(rules, prefix) {
  return rules.map(rule => (rule.trim() ? prefix + rule : ''));
}

/**
 * @param  {...(string | undefined)} classNames
 */
function joinClassNames(...classNames) {
  let result = '';
  for (const className of classNames) {
    if (className && className.trim()) {
      result += ` ${className}`;
    }
  }

  return result.trim();
}

/**
 * @param {string} mediaQueryList
 * @param {grvsc.CSSRuleset[]} body
 * @param {string=} leadingComment
 * @returns {grvsc.CSSMediaQuery}
 */
function media(mediaQueryList, body, leadingComment) {
  return { kind: 'MediaQuery', mediaQueryList, body, leadingComment };
}

/**
 * @param {string | string[]} selector
 * @param {grvsc.CSSDeclaration[] | Record<string, string>} body
 * * @param {string=} leadingComment
 * @returns {grvsc.CSSRuleset}
 */
function ruleset(selector, body, leadingComment) {
  return {
    kind: 'Ruleset',
    selectors: Array.isArray(selector) ? selector : [selector],
    body: Array.isArray(body) ? body : Object.keys(body).map(property => declaration(property, body[property])),
    leadingComment
  };
}

/**
 * @param {string} property
 * @param {string} value
 * @returns {grvsc.CSSDeclaration}
 */
function declaration(property, value) {
  return { property, value };
}

/**
 * @param {grvsc.CSSElement[]} elements
 * @param {grvsc.Writer} writer
 * @returns {string}
 */
function renderCSS(elements, writer = createWriter()) {
  writer.writeList(
    elements,
    element => {
      if (element.kind === 'MediaQuery') {
        writeComment(element);
        writer.write(`@media ${element.mediaQueryList} {`);
        writer.increaseIndent();
        writer.writeNewLine();
        writer.writeList(element.body, renderRuleset, writer.writeNewLine);
        writer.decreaseIndent();
        writer.writeNewLine();
        writer.write('}');
      } else {
        renderRuleset(element);
      }
    },
    writer.writeNewLine
  );

  return writer.getText();

  /** @param {grvsc.CSSRuleset} ruleset */
  function renderRuleset(ruleset) {
    writeComment(ruleset);
    writer.writeList(ruleset.selectors, writer.write, () => {
      writer.write(',');
      writer.writeNewLine();
    });

    writer.write(' {');
    const multiline = ruleset.body.length > 1;
    if (multiline) {
      writer.increaseIndent();
      writer.writeNewLine();
    } else {
      writer.write(' ');
    }
    writer.writeList(ruleset.body, writeDeclaration, writer.writeNewLine);
    if (multiline) {
      writer.decreaseIndent();
      writer.writeNewLine();
    } else {
      writer.write(' ');
    }
    writer.write('}');
  }

  /** @param {grvsc.CSSElement} element */
  function writeComment(element) {
    if (element.leadingComment) {
      writer.writeNewLine();
      writer.write(`/* ${element.leadingComment} */`);
      writer.writeNewLine();
    }
  }

  /** @param {grvsc.CSSDeclaration} declaration */
  function writeDeclaration(declaration) {
    writer.write(`${declaration.property}: ${declaration.value};`);
  }
}

module.exports = {
  media,
  ruleset,
  declaration,
  renderCSS,
  prefersDark,
  prefersLight,
  prefixRules,
  joinClassNames
};
