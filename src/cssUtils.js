/**
 * @param {string} className
 * @param {string | string[]} propertyList
 */
function renderRule(className, propertyList) {
  return `.${className} {\n${typeof propertyList === 'string' ? propertyList : propertyList.join('\n')}\n}`;
}

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

module.exports = { renderRule, renderMediaQuery, prefersDark, prefersLight, prefixRules, joinClassNames };
