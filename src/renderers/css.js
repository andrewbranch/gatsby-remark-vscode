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
 * @returns {grvsc.CSSMediaQuery}
 */
function media(mediaQueryList, body) {
  return { kind: 'MediaQuery', mediaQueryList, body };
}

/**
 * @param {string | string[]} selector
 * @param {grvsc.CSSDeclaration[] | Record<string, string>} body
 * @returns {grvsc.CSSRuleset}
 */
function ruleset(selector, body) {
  return {
    kind: 'Ruleset',
    selectors: Array.isArray(selector) ? selector : [selector],
    body: Array.isArray(body) ? body : Object.keys(body).map(property => declaration(property, body[property]))
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
 * @returns {string}
 */
function renderCSS(elements) {
  const writer = createWriter();
  writer.writeList(
    elements,
    element => {
      if (element.kind === 'MediaQuery') {
        writer.write(`@media ${element.mediaQueryList} {`);
        writer.increaseIndent();
        writer.writeList(element.body, renderRuleset, writer.writeNewLine);
      } else {
        renderRuleset(element);
      }
    },
    writer.writeNewLine
  );

  return writer.getText();

  /** @param {grvsc.CSSRuleset} ruleset */
  function renderRuleset(ruleset) {
    writer.writeList(ruleset.selectors, writer.write, () => {
      writer.write(',');
      writer.writeNewLine();
    });

    writer.write(' {');
    const multiline = ruleset.body.length > 1;
    if (multiline) {
      writer.increaseIndent();
    }
    writer.writeList(ruleset.body, writeDeclaration, writer.writeNewLine);
    if (multiline) {
      writer.decreaseIndent();
    } else {
      writer.write(' ');
    }
    writer.write('}');
  }

  /** @param {grvsc.CSSDeclaration} declaration */
  function writeDeclaration(declaration) {
    writer.write(`${declaration.property}: ${declaration.value};`);
  }
}

module.exports = {
  media,
  ruleset,
  renderCSS,
  prefersDark,
  prefersLight,
  prefixRules,
  joinClassNames
};
