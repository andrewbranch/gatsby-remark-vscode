/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

 // @ts-check
 
/**
 * 
 * @param {string[]} colorMap
 */
function generateTokensCSSForColorMap(colorMap) {
	/** @type {string[]} */
	let rules = [];
	for (let i = 1, len = colorMap.length; i < len; i++) {
		let color = colorMap[i];
		rules[i] = `.mtk${i} { color: ${color}; }`;
	}
	rules.push('.mtki { font-style: italic; }');
	rules.push('.mtkb { font-weight: bold; }');
	rules.push('.mtku { text-decoration: underline; text-underline-position: under; }');
	return rules.join('\n');
}

module.exports = { generateTokensCSSForColorMap };
