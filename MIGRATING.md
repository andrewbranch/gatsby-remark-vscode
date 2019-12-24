# Migration Guide

## v1 → v2

### The `colorTheme` plugin option has been deprecated and replaced by the `theme` option.

- If you did not supply `colorTheme`, no change is necessary.
- If your `colorTheme` is a string, rename the `colorTheme` key to `theme`.
- If your `colorTheme` is an object,
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

### CSS variables and class names have changed

- If you wrote custom CSS targeting the class `.vscode-highlight`, replace that selector with `.grvsc-container`.
- If you wrote custom CSS targeting any other class beginning with `.vscode-highlight`, replace the `.vscode-highlight` prefix with `.grvsc`. For example, `.vscode-highlight-line` is now `.grvsc-line`.
- If you set any CSS variables, replace the `--vscode-highlight` prefix with `--grvsc`. For example, `--vscode-highlight-border-radius` is now `--grvsc-border-radius`.
- If you wrote custom CSS targeting a token class name beginning with `.mtk`, that was never intended to be supported! Consider using `replaceColor` instead, or [file an issue](https://github.com/andrewbranch/gatsby-remark-vscode/issues/new) if you think you have a compelling use case for writing custom token CSS.