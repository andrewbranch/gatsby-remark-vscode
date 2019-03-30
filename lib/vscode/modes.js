/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// @ts-check

/**
 * A font style. Values are 2^x such that a bit mask can be used.
 * @internal
 */
const FontStyle = {
	NotSet: -1,
	None: 0,
	Italic: 1,
	Bold: 2,
	Underline: 4
}

/**
 * Open ended enum at runtime
 * @internal
 */
const LanguageId = {
	Null: 0,
	PlainText: 1
};

/**
 * Helpers to manage the "collapsed" metadata of an entire StackElement stack.
 * The following assumptions have been made:
 *  - languageId < 256 => needs 8 bits
 *  - unique color count < 512 => needs 9 bits
 *
 * The binary format is:
 * - -------------------------------------------
 *     3322 2222 2222 1111 1111 1100 0000 0000
 *     1098 7654 3210 9876 5432 1098 7654 3210
 * - -------------------------------------------
 *     xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
 *     bbbb bbbb bfff ffff ffFF FTTT LLLL LLLL
 * - -------------------------------------------
 *  - L = LanguageId (8 bits)
 *  - T = StandardTokenType (3 bits)
 *  - F = FontStyle (3 bits)
 *  - f = foreground color (9 bits)
 *  - b = background color (9 bits)
 *
 * @internal
 */
const MetadataConsts = {
	LANGUAGEID_MASK: 0b00000000000000000000000011111111,
	TOKEN_TYPE_MASK: 0b00000000000000000000011100000000,
	FONT_STYLE_MASK: 0b00000000000000000011100000000000,
	FOREGROUND_MASK: 0b00000000011111111100000000000000,
	BACKGROUND_MASK: 0b11111111100000000000000000000000,

	LANGUAGEID_OFFSET: 0,
	TOKEN_TYPE_OFFSET: 8,
	FONT_STYLE_OFFSET: 11,
	FOREGROUND_OFFSET: 14,
	BACKGROUND_OFFSET: 23
}

function getFontStyle(metadata) {
  return (metadata & MetadataConsts.FONT_STYLE_MASK) >>> MetadataConsts.FONT_STYLE_OFFSET;
}

function getForeground(metadata) {
  return (metadata & MetadataConsts.FOREGROUND_MASK) >>> MetadataConsts.FOREGROUND_OFFSET;
}

function getClassNameFromMetadata(metadata) {
  let foreground = getForeground(metadata);
  let className = 'mtk' + foreground;

  let fontStyle = getFontStyle(metadata);
  if (fontStyle & FontStyle.Italic) {
    className += ' mtki';
  }
  if (fontStyle & FontStyle.Bold) {
    className += ' mtkb';
  }
  if (fontStyle & FontStyle.Underline) {
    className += ' mtku';
  }

  return className;
}

module.exports = { getClassNameFromMetadata };
