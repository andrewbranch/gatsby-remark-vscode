const { EOL } = require('os');
const { deprecationNotice, isRelativePath } = require('./utils');

const validMarkerRegExp = /^[^\sa-zA-Z0-9.-_`\\<]+$/;

/**
 * @param {PluginOptions} options
 */
function validateOptions(options) {
  /** @type {string[]} */
  const errors = [];

  if (options.colorTheme) {
    deprecationNotice(
      `The 'colorTheme' option has been replaced by 'theme' and will be removed in a future version. ` +
        `See https://github.com/andrewbranch/gatsby-remark-vscode/blob/master/MIGRATING.md for details.`
    );
  }

  if (options.extensions) {
    if (options.extensions.some(ext => typeof ext !== 'string')) {
      addError(
        'extensions',
        'Each element must be a string. See ' +
          'https://github.com/andrewbranch/gatsby-remark-vscode/tree/master/MIGRATING.md ' +
          'for details.'
      );
    }

    options.extensions.forEach(extension => {
      if (isRelativePath(extension)) {
        addError('extensions', `Extension paths must be absolute. Received '${extension}'.`);
      }
    });
  }

  if (options.inlineCode) {
    if (!('marker' in options.inlineCode)) {
      addError('inlineCode', `Key 'marker' is required.`);
    } else if (typeof options.inlineCode.marker !== 'string' || !validMarkerRegExp.test(options.inlineCode.marker)) {
      addError(
        'inlineCode.marker',
        `Marker must be a string without whitespace, ASCII letters or numerals, or character: .-_\`\\<`
      );
    }
  }

  if (errors.length) {
    throw new Error(errors.join(EOL.repeat(2)));
  }

  /**
   * @param {string} optionNme
   * @param {string} message
   */
  function addError(optionNme, message) {
    errors.push(`Invalid option '${optionNme}': ${message}`);
  }
}

module.exports = validateOptions;
