/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// @ts-check

const path = require('path');
const fs = require('fs');
const JSON5 = require('json5');
const plist = require('plist');

function loadColorTheme(themeLocation, resultRules = [], resultColors = {}) {
	let name = path.basename(themeLocation).split('.')[0];
	if (path.extname(themeLocation) === '.json') {
		const content = fs.readFileSync(themeLocation, 'utf8');
		let contentValue = JSON5.parse(content);
		name = contentValue.name || name;
		if (contentValue.include) {
			loadColorTheme(path.join(path.dirname(themeLocation), contentValue.include), resultRules, resultColors);
		}

		if (Array.isArray(contentValue.settings)) {
			convertSettings(contentValue.settings, resultRules, resultColors);
		} else {
			let colors = contentValue.colors;
			if (colors) {
				if (typeof colors !== 'object') {
					throw new Error(`Problem parsing color theme file: ${themeLocation}. Property 'colors' is not of type 'object'.`);
				}
				// new JSON color themes format
				for (let colorId in colors) {
					let colorHex = colors[colorId];
					if (typeof colorHex === 'string') { // ignore colors that are null
						resultColors[colorId] = colors[colorId];
					}
				}
			}
			let tokenColors = contentValue.tokenColors;
			if (tokenColors) {
				if (Array.isArray(tokenColors)) {
					resultRules.push(...tokenColors);
				} else if (typeof tokenColors === 'string') {
					loadSyntaxTokens(path.join(path.dirname(themeLocation), tokenColors), resultRules, {});
				} else {
					throw new Error(`Problem parsing color theme file: ${themeLocation}. Property 'tokenColors' should be either an array specifying colors or a path to a TextMate theme file`);
				}
			}
		}
	} else {
		loadSyntaxTokens(themeLocation, resultRules, resultColors);
	}

	return { resultRules, resultColors };
}

function loadSyntaxTokens(themeLocation, resultRules, resultColors) {
	const content = fs.readFileSync(themeLocation, 'utf8');
	/** @type {any} */
	let contentValue = plist.parse(content);
	let settings = contentValue.settings;
	if (!Array.isArray(settings)) {
		throw new Error(`Problem parsing tmTheme file: ${themeLocation}. 'settings' is not array.`);
	}
	convertSettings(settings, resultRules, resultColors);
}

const settingToColorIdMapping = {
	background: ['editor.background'],
	foreground: ['editor.foreground'],
};

function convertSettings(oldSettings, resultRules, resultColors) {
	for (let rule of oldSettings) {
		resultRules.push(rule);
		if (!rule.scope) {
			let settings = rule.settings;
			if (!settings) {
				rule.settings = {};
			} else {
				for (let key in settings) {
					let mappings = settingToColorIdMapping[key];
					if (mappings) {
						let colorHex = settings[key];
						if (typeof colorHex === 'string') {
							for (let colorId of mappings) {
								resultColors[colorId] = colorHex;
							}
						}
					}
					if (key !== 'foreground' && key !== 'background' && key !== 'fontStyle') {
						delete settings[key];
					}
				}
			}
		}
	}
}

module.exports = { loadColorTheme };
