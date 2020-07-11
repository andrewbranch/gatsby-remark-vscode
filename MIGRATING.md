# Migration Guide

## v2 → v3

### Line highlighting is visible without custom CSS.

Previously, the default line highlight background color was `transparent`, which meant a color had to be set with a CSS variable by the user. The reason for this limitation was that there is no sensible default that works for both light themes and dark themes, as a light highlight would be invisible on white, and a dark highlight would be invisible on black. As of v3, the plugin computes the luminance of each theme’s background color and selects a translucent white or translucent black highlight color as a default.

This is unlikely to break existing sites, as the CSS variables continue to work as a customization. However, as part of upgrading to v3, you may be able to remove the variables you set if you’re happy with the new defaults. If, for some reason, you were relying on the old behavior of an invisible default, sorry, don’t do that 🤷🏻‍♂️

### The `codeFenceNode` property of option callback arguments is deprecated.

The `theme` and `wrapperClassName` plugin options accept a callback function that receives an object with a `codeFenceNode` containing the original Remark MDAST node for the code block currently being highlighted. That property has been renamed `node`. I’m like a million percent sure nobody uses this, but if I don’t say it here, someone will complain when I remove it in 4.0.

## v1 → v2

### Extensions are no longer downloaded automatically.

- If you did not use themes or languages beyond the default included set, no change is necessary.
- If you relied on the `extensions` plugin option to download extensions:
  - Find the extension source on GitHub, npm, or elsewhere. (Extensions listed on the Visual Studio Marketplace typically link to their GitHub repos.)
  - Ensure the license allows you to use the code on your site, and follow all license requirements.
  - Install or copy the extension into your project:
    - You can install from GitHub by running `npm install owner-name/repo-name`.
    - If you clone the source and build a `.vsix`, you can copy that file into your project.
    - Alternatively, you can copy the full extension source or clone as a submodule into your project.
  - Replace the `extensions` array with an array of strings specifying where to find each extension:
    - If you installed the extension into `node_modules`, use just the package name, e.g. `extensions: ['oceanic-next']`
    - If you copied the extension source or `.vsix` into your project, use an absolute path, e.g. ``extensions: [`${__dirname}/vendor/oceanic-next.vsix`, `${__dirname}/vendor/atom-one-dark`]``
- If you used the `extensionDataDirectory` option, it should be unnecessary now, since all extensions are read from disk. You can specify a specific location for each extension by providing paths to the `extensions` array.

### The `colorTheme` plugin option has been deprecated and replaced by the `theme` option.

- If you did not supply `colorTheme`, no change is necessary.
- If your `colorTheme` is a string, rename the `colorTheme` key to `theme`.
- If your `colorTheme` is an object:
  - Rename the `defaultTheme` key to `default`.
  - If present, rename the `prefersDarkTheme` to `dark`.
  - If you have a `prefersLightTheme`, replace it with an entry in the new `media` array. For example:

```diff
{
-  defaultTheme: 'Default Dark+',
-  prefersLightTheme: 'Solarized Light'
+  default: 'Default Dark+',
+  media: [{
+    match: '(prefers-color-scheme: light)',
+    theme: 'Solarized Light'
+  }]
}
```

The new `theme` option also supports some options that `colorTheme` did not; you can read about the full API in the [README](README.md#multi-theme-support).

### CSS variables and class names have changed

- If you wrote custom CSS targeting the class `.vscode-highlight`, replace that selector with `.grvsc-container`.
- If you wrote custom CSS targeting any other class beginning with `.vscode-highlight`, replace the `.vscode-highlight` prefix with `.grvsc`. For example, `.vscode-highlight-line` is now `.grvsc-line`.
- If you set any CSS variables, replace the `--vscode-highlight` prefix with `--grvsc`. For example, `--vscode-highlight-border-radius` is now `--grvsc-border-radius`.
- If you wrote custom CSS targeting a token class name beginning with `.mtk`, that was never intended to be supported! Consider using `replaceColor` instead, or [file an issue](https://github.com/andrewbranch/gatsby-remark-vscode/issues/new) if you think you have a compelling use case for writing custom token CSS.

### Known issues

- Usage with [gatsby-plugin-mdx](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-plugin-mdx) requires gatsby-plugin-mdx@1.0.71 or later.
