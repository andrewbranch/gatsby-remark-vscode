const { groupConditions, getStylesFromThemeSettings, getThemeClassName } = require('../themeUtils');
const { ruleset, declaration, media } = require('../renderers/css');

const boldDeclarations = [declaration('font-weight', 'bold')];
const italicDeclarations = [declaration('font-style', 'italic')];
const underlineDeclarations = [
  declaration('text-decoration', 'underline'),
  declaration('text-underline-position', 'under')
];

/**
 * @param {ConditionalTheme} theme
 * @param {Record<string, string>} settings
 * @param {{ className: string, css: grvsc.CSSDeclaration[] }[]} tokenClassNames
 * @param {(color: string, themeIdentifier: string) => string} replaceColor
 */
function createThemeCSSRules(theme, settings, tokenClassNames, replaceColor) {
  const conditions = groupConditions(theme.conditions);
  /** @type {grvsc.CSSElement[]} */
  const elements = [];
  const containerStyles = getStylesFromThemeSettings(settings);
  if (conditions.default) {
    pushColorRules(elements, '.' + getThemeClassName(theme.identifier, 'default'));
  }
  for (const condition of conditions.parentSelector) {
    pushColorRules(elements, `${condition.value} .${getThemeClassName(theme.identifier, 'parentSelector')}`);
  }
  for (const condition of conditions.matchMedia) {
    /** @type {grvsc.CSSRuleset[]} */
    const ruleset = [];
    pushColorRules(ruleset, '.' + getThemeClassName(theme.identifier, 'matchMedia'));
    elements.push(media(condition.value, ruleset, theme.identifier));
  }
  return elements;

  /**
   * @param {grvsc.CSSElement[]} container
   * @param {string} selector
   * @param {string=} leadingComment
   */
  function pushColorRules(container, selector, leadingComment) {
    if (containerStyles.length) {
      container.push(ruleset(selector, containerStyles, leadingComment));
      leadingComment = undefined;
    }
    for (const { className, css } of tokenClassNames) {
      container.push(
        ruleset(
          `${selector} .${className}`,
          css.map(decl =>
            decl.property === 'color' ? declaration('color', replaceColor(decl.value, theme.identifier)) : decl
          ),
          leadingComment
        )
      );
      leadingComment = undefined;
    }
  }
}

module.exports = {
  createThemeCSSRules,
  boldDeclarations,
  italicDeclarations,
  underlineDeclarations
};
