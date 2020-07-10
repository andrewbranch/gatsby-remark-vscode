# gatsby-remark-vscode

[![npm](https://img.shields.io/npm/v/gatsby-remark-vscode.svg)](https://www.npmjs.com/package/gatsby-remark-vscode)

A syntax highlighting plugin for [Gatsby](https://www.gatsbyjs.org/) that uses VS Code’s extensions, themes, and highlighting engine. Any language and theme VS Code supports, whether built-in or via a third-party extension, can be rendered on your Gatsby site.

Includes OS dark mode support 🌙

## v3 is out now! 🎉

If you’re updating from v2.x.x (or v1), see [MIGRATING.md](./MIGRATING.md). New features are [line numbers](#line-numbers) and [diff highlighting](#diff-highlighting) (thanks [@janosh](https://github.com/janosh) for the latter!).

## Table of contents

- [Why gatsby-remark-vscode?](#why-gatsby-remark-vscode)
- [Getting started](#getting-started)
- [Multi-theme support](#multi-theme-support)
- [Built-in languages and themes](#built-in-languages-and-themes)
  - [Languages](#languages)
  - [Themes](#themes)
- [Using languages and themes from an extension](#using-languages-and-themes-from-an-extension)
- [Styles](#styles)
  - [Class names](#class-names)
  - [Variables](#variables)
  - [Tweaking or replacing theme colors](#tweaking-or-replacing-theme-colors)
- [Extra stuff](#extra-stuff)
  - [Inline code highlighting](#inline-code-highlighting)
  - [Line highlighting](#line-highlighting)
  - [Line numbers](#line-numbers)
  - [Diff highlighting](#diff-highlighting)
  - [Using different themes for different code fences](#using-different-themes-for-different-code-fences)
  - [Arbitrary code fence options](#arbitrary-code-fence-options)
- [Options reference](#options-reference)
- [Contributing](#contributing)

## Why gatsby-remark-vscode?

JavaScript syntax highlighting libraries that were designed to run in the browser, like [Prism](https://www.gatsbyjs.org/packages/gatsby-remark-prismjs/), have to make compromises given the constraints of their intended environment. Since they get downloaded and executed whenever a user visits a page, they have to be ultra-fast and ultra-lightweight. Your Gatsby app, on the other hand, renders to HTML at build-time in Node, so these constraints don’t apply. So why make tradeoffs that don’t buy you anything? There’s no reason why the syntax highlighting on your blog should be any less sophisticated than the syntax highlighting in your code editor. And since VS Code is built with JavaScript and CSS, is open source, and has a rich extension ecosystem, it turns out that it’s pretty easy to use its highlighting engine and extensions and get great results. A few examples of where gatsby-remark-vscode excels:

| Scenario                | Others                 | gatsby-remark-vscode |
|-------------------------|------------------------|----------------------|
| Embedded languages      | ![][embedded-others]   | ![][embedded-own]
| Complex TypeScript      | ![][typescript-others] | ![][typescript-own]
| Tricky template strings | ![][templates-others]  | ![][templates-own]
| Uncommon languages      | ![][solidity-others]   | ![][solidity-own]

## Getting started

Install the package:

```bash
npm install --save gatsby-remark-vscode
```

Add to your `gatsby-config.js`:

```js
{
  // ...
  plugins: [{
    resolve: `gatsby-transformer-remark`,
    options: {
      plugins: [{
        resolve: `gatsby-remark-vscode`,
        options: {
          theme: 'Abyss' // Or install your favorite theme from GitHub
        }
      }]
    }
  }]
}
```

Write code examples in your markdown file as usual:

````md
```js
this.willBe(highlighted);
```
````

## Multi-theme support

You can select different themes to be activated by media query or by parent selector (e.g. a class or data attribute on the `html` or `body` element).

### Reacting to OS dark mode with `prefers-color-scheme`

```js
{
  theme: {
    default: 'Solarized Light',
    dark: 'Monokai Dimmed'
  }
}
```

### Reacting to a parent selector

```js
{
  theme: {
    default: 'Solarized Light',
    parentSelector: {
      // Any CSS selector will work!
      'html[data-theme=dark]': 'Monokai Dimed',
      'html[data-theme=hc]': 'My Cool Custom High Contrast Theme'
    }
  }
}
```

### Reacting to other media queries

The `dark` option is shorthand for a general-purpose `media` option that can be used to match any media query:

```js
{
  theme: {
    default: 'Solarized Light',
    media: [{
      // Longhand for `dark` option.
      // Don’t forget the parentheses!
      match: '(prefers-color-scheme: dark)',
      theme: 'Monokai Dimmed'
    }, {
      // Proposed in Media Queries Level 5 Draft
      match: '(prefers-contrast: high)',
      theme: 'My Cool Custom High Contrast Theme'
    }, {
      match: 'print',
      theme: 'My Printer Friendly Theme???'
    }]
  }
}
```

## Built-in languages and themes

The following languages and themes can be used without [installing third-party extensions](#using-languages-and-themes-from-an-extension):

### Languages

<details>
  <summary>See all 55 languages</summary>

  - Batch/CMD
  - Clojure
  - CoffeeScript
  - C
  - C++
  - C Platform
  - C#
  - CSS
  - Dockerfile
  - F#
  - Git Commit
  - Git Rebase
  - Diff
  - Ignore
  - Go
  - Groovy
  - Handlebars
  - Hlsl
  - HTML
  - CSHTML
  - PHP HTML
  - INI
  - Java
  - JavaScript
  - JSX
  - JSON
  - JSON with Comments
  - Less
  - Log
  - Lua
  - Makefile
  - Markdown
  - Objective-C
  - Objective-C++
  - Perl
  - Perl 6
  - PHP
  - Powershell
  - Pug
  - Python
  - R
  - Ruby
  - Rust
  - Sass
  - SassDoc
  - ShaderLab
  - Shell
  - SQL
  - Swift
  - TypeScript
  - TSX
  - ASP VB .NET
  - XML
  - XML XSL
  - YAML

</details>

Language names are resolved case-insensitively by any aliases and file extensions listed in the grammar’s metadata. For example, a code fence with C++ code in it can use [any of these language codes](https://github.com/Microsoft/vscode/blob/da3c97f3668393ebfcb9f8208d7616018d6d1859/extensions/cpp/package.json#L20-L21). You could also check the [built-in grammar manifest](https://unpkg.com/gatsby-remark-vscode@1.0.3/lib/grammars/manifest.json) for an exact list of mappings.

### Themes

Pro tip: a good way to preview themes is by flipping through them in VS Code. Here’s the list of included ones:

- Abyss
- Dark+ (default dark)
- Light+ (default light)
- Dark (Visual Studio)
- Light (Visual Studio)
- High Contrast
- Kimbie Dark
- Monokai Dimmed
- Monokai
- Quiet Light
- Red
- Solarized Dark
- Solarized Light
- Tomorrow Night Blue

## Using languages and themes from an extension

If you want to use a language or theme not included by default, the recommended approach is to `npm install` it from GitHub, provided its license permits doing so. For example, you can use [robb0wen/synthwave-vscode](https://github.com/robb0wen/synthwave-vscode) by running

```bash
npm install robb0wen/synthwave-vscode
```

Then, in gatsby-config.js, use the options

```js
{
  theme: `SynthWave '84`, // From package.json: contributes.themes[0].label
  extensions: ['synthwave-vscode'] // From package.json: name
}
```

You can also clone an extension into your project, or build a .vsix file from its source, and specify its path in `extensions`:

```js
{
  theme: {
    default: 'My Custom Theme',
    dark: 'My Custom Dark Theme'
  },
  extensions: ['./vendor/my-custom-theme', './vendor/my-custom-dark-theme.vsix']
}
```

## Styles

The CSS for token colors and background colors is generated dynamically from each theme you use and included in the resulting HTML. However, you’ll typically want at least a small amount of additional styling to handle padding and horizontal scrolling. These minimal additional styles are included alongside the dynamically generated token CSS by default, but can be disabled by setting the `injectStyles` option to `false`. If you prefer bundling the styles through your app’s normal asset pipeline, you can simply import the CSS file:

```js
import 'gatsby-remark-vscode/styles.css';
```

### Class names

The generated HTML has ample stable class names, and you can add your own with the `wrapperClassName` and `getLineClassName` option. All (non-token-color) included styles have a single class name’s worth of specificity, so it should be easy to override the built-in styles.

### Variables

The styles also include a few CSS variables you can define to override defaults. The included CSS is written as:

```css
.grvsc-container {
  padding-top: var(--grvsc-padding-top, var(--grvsc-padding-v, 1rem));
  padding-bottom: var(--grvsc-padding-bottom, var(--grvsc-padding-v, 1rem));
  border-radius: var(--grvsc-border-radius, 8px);
}

.grvsc-line {
  padding-left: var(--grvsc-padding-left, var(--grvsc-padding-h, 1.5rem));
  padding-right: var(--grvsc-padding-right, var(--grvsc-padding-h, 1.5rem));
}

/* See “Line Highlighting” section for details */
.grvsc-line-highlighted {
  background-color: var(--grvsc-line-highlighted-background-color, transparent);
  box-shadow: inset var(--grvsc-line-highlighted-border-width, 4px) 0 0 0 var(--grvsc-line-highlighted-border-color, transparent);
}
```

The padding values are written with cascading fallbacks. As an example, let’s consider the top and bottom padding of `.grvsc-container`. Each is set to its own CSS variable, `--grvsc-padding-top` and `--grvsc-padding-bottom`, respectively. Neither of these is defined by default, so it uses the value of its fallback, which is another CSS variable, `--grvsc-padding-v`, with another fallback, `1rem`. Since `--grvsc-padding-v` is also not defined by default, both padding properties will evaluate to the final fallback, `1rem`.

So, if you want to adjust the vertical padding, you could add the following to your own CSS:

```css
:root {
  --grvsc-padding-v: 20px; /* Adjust padding-top and padding-bottom */
}
```

If you want to adjust the padding-top or padding-bottom independently, you can use those variables:

```css
:root {
  --grvsc-padding-top: 24px; /* Adjust padding-top by itself */
}
```

### Tweaking or replacing theme colors

Since the CSS for token colors is auto-generated, it’s fragile and inconvenient to try to override colors by writing more specific CSS. Instead, you can use the `replaceColor` option to replace any value specified by the theme with another valid CSS value. This is especially handy for replacing static colors with variables if you want to support a “dark mode” for your site:

```js
{
  replaceColor: oldColor => ({
    '#ff0000': 'var(--red)',
    '#00ff00': 'var(--green)',
    '#0000ff': 'var(--blue)',
  })[oldColor.toLowerCase()] || oldColor
}
```

## Extra stuff

### Inline code highlighting

To highlight inline code spans, add an `inlineCode` key to the plugin options and choose a `marker` string:

```js
{
  inlineCode: {
    marker: '•'
  }
}
```

Then, in your Markdown, you can prefix code spans by the language name followed by the `marker` string to opt into highlighting that span:

```md
Now you can highlight inline code: `js•Array.prototype.concat.apply([], array)`.
```

The syntax theme defaults to the one selected for code blocks, but you can control the inline code theme independently:

```js
{
  theme: 'Default Dark+',
  inlineCode: {
    marker: '•',
    theme: {
      default: 'Default Light+',
      dark: 'Default Dark+'
    }
  }
}
```

See [`inlineCode`](#inlinecode) in the options reference for more API details.

### Line highlighting

`gatsby-remark-vscode` offers the same line-range-after-language-name strategy of highlighting or emphasizing lines as [gatsby-remark-prismjs](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-remark-prismjs):

<table>
<thead><tr><th>Markdown</th><th>Rendered result</th></thead>
<tbody>
<tr>
<td>

````md
```js{1,3-5}
this.isLine(1); // highlighted
this.isLine(2);
this.isLine(3); // highlighted
this.isLine(4); // highlighted
this.isLine(5); // highlighted
```
````

</td>
<td>

![][line-highlighting-meta]

</td>
</tr>
</tbody>
</table>

Comment directives are also supported:

<table>
<thead><tr><th>Markdown</th><th>Rendered result</th></thead>
<tbody>
<tr>
<td>

````md
```js
function constant(value) {
  return () => value; // highlight-line
}

// highlight-next-line
const alwaysFour = constant(4);

// highlight-start
const zero = [0, 1, 2, 3, 4, 5]
  .map(alwaysFour)
  .filter(x => x !== 4)
  .length;
// highlight-end
```
````

</td>
<td>

![][line-highlighting-comment]

</td>
</tr>
</tbody>
</table>

You can customize the default background color and left border width and color for the highlighted lines by setting CSS variables:

```css
:root {
  --grvsc-line-highlighted-background-color: rgba(255, 255, 255, 0.2);
  --grvsc-line-highlighted-border-color: rgba(255, 255, 255, 0.5);
  --grvsc-line-highlighted-border-width: 2px;
}
```

### Line numbers

With code fence info:

````md
```js {numberLines}
import * as React from 'react';

React.createElement('span', {});
```
````

![Rendered result of the example code above][line-numbering-with-code-fence-info]

With code fence info specifying a starting line:

````md
```js {numberLines: 21}
  return 'blah';
```
````

![Rendered result of the example code above][line-numbering-starting-line]

With a comment:

````md
```ts
function getDefaultLineTransformers(pluginOptions, cache) {
  return [
    one, // L4
    two,
    three
  ];
}
```
````

![Rendered result of the example code above][line-numbering-with-a-comment]

With both:

````md
```ts {numberLines}
import * as React from 'react';

// ...

function SomeComponent(props) { // L29
  return <div />;
}
```
````

![Rendered result of the example code above][line-numbering-with-both]

The line number cell’s styling can be overridden on the `.grvsc-line-number` class.

### Diff highlighting

You can combine syntax highlighting with diff highlighting:

<table>
<thead><tr><th>Markdown</th><th>Rendered result</th></thead>
<tbody>
<tr>
<td>

````md
```ts {diff}
function add(x, y) {
-  return x + x;
+  return x + y;
}
```
````

</td>
<td>

![][diff-highlighting]

</td>
</tr>
</tbody>
</table>

The highlight color can be customized with the CSS variables `--grvsc-line-diff-add-background-color` and `--grvsc-line-diff-del-background-color`. The default color is static and might not be accessible with all syntax themes. Consider contrast ratios and choose appropriate colors when using this feature.

### Using different themes for different code fences

The `theme` option can take a function instead of a constant value. The function is called once per code fence with information about that code fence, and should return either a string or [an object](#dark-mode-support-via-prefers-color-scheme). See the [following section](#arbitrary-code-fence-options) for an example.

### Arbitrary code fence options

Line numbers and ranges aren’t the only things you can pass as options on your code fence. A JSON-like syntax is supported:

````md
```jsx{theme: 'Monokai', someNumbers: {1,2,3}, nested: {objects: 'yep'}}
<Amazing><Stuff /></Amazing>
```
````

`gatsby-remark-vscode` doesn’t inherently understand these things, but it parses the input and allows you to access it in the `theme`, `wrapperClassName` and `getLineClassName` functions:

```js
{
  theme: ({ parsedOptions, language, markdownNode, node }) => {
    // 'language' is 'jsx', in this case
    // 'markdownNode' is the gatsby-transformer-remark GraphQL node
    // 'node' is the Markdown AST node of the current code fence
    // 'parsedOptions' is your parsed object that looks like this:
    // {
    //   theme: 'Monokai',
    //   someNumbers: { '1': true, '2': true, '3': true },
    //   nested: { objects: 'yep' }
    // }
    return parsedOptions.theme || 'Dark+ (default dark)';
  },
  wrapperClassName: ({ parsedOptions, language, markdownNode, node }) => '';
}
```

## Options reference

### `theme`

The syntax theme used for code blocks.

- **Default:** `'Default Dark+'`

- **Accepted types**:
  - **`string`:** The name or id of a theme. (See [Built-in themes](#themes) and [Using languages and themes from an extension](#using-languages-and-themes-from-an-extension).)
  - **`ThemeSettings`:** An object that selects different themes to use in different contexts. (See [Multi-theme support](#multi-theme-support).)
  - **`(data: CodeBlockData) => string | ThemeSettings`:** A function returning the theme selection for a given code block. `CodeBlockData` is an object with properties:
    - **`language`:** The language of the code block, if one was specified.
    - **`markdownNode`:** The MarkdownRemark GraphQL node.
    - **`node`:** The Remark AST node of the code block.
    - **`parsedOptions`:** The object form of of any code fence info supplied. (See [Arbitrary code fence options](#arbitrary-code-fence-options).)

### `wrapperClassName`

A custom class name to be set on the `pre` tag.

- **Default:** None, but the class `grvsc-container` will always be on the tag.
- **Accepted types:**
  - **`string`:** The class name to add.
  - **`(data: CodeBlockData) => string`:** A function returning the class name to add for a given code block. (See the [`theme`](#theme) option above for the details of `CodeBlockData`.)

### `languageAliases`

An object that allows additional language names to be mapped to recognized languages so they can be used on opening code fences.

- **Default:** None, but many built-in languages are already recognized by a variety of names.

- **Accepted type:** `Record<string, string>`; that is, an object with string keys and string values.

- **Example:**
  
  ```js
  {
    languageAliases: {
      fish: 'sh'
    }
  }
  ```
  
  ````md
  Then you can use code fences like this:
  
  ```fish
  ls -la
  ```

  And they’ll be parsed as shell script (`sh`).
  ````

### `extensions`

A list of third party extensions to search for additional langauges and themes. (See [Using languages and themes from an extension](#using-languages-and-themes-from-an-extension).)

- **Default:** None
- **Accepted type:** `string[]`; that is, an array of strings, where the strings are the package names of the extensions.

### `inlineCode`

Enables syntax highlighting for inline code spans. (See [Inline code highlighting](#inline-code-highlighting).)

- **Default:** None
- **Accepted type:** An object with properties:
  - **`theme`:** A string or `ThemeSettings` object selecting the theme, or a function returning a string or `ThemeSettings` object for a given code span. The type is the same as the one documented in the top-level [theme option](#theme). Defaults to the value of the top-level [theme option](#theme).
  - **`marker`:** A string used as a separator between the language name and the content of a code span. For example, with a `marker` of value `'•'`, you can highlight a code span as JavaScript by writing the Markdown code span as `` `js•Code.to.highlight("inline")` ``.
  - **`className`:** A string, or function returning a string for a given code span, that sets a custom class name on the wrapper `code` HTML tag. If the function form is used, it is passed an object parameter describing the code span with properties:
    - **`language`:** The language of the code span (the bit before the `marker` character).
    - **`markdownNode`:** The MarkdownRemark GraphQL node.
    - **`node`:** The Remark AST node of the code span.

### `injectStyles`

Whether to add supporting CSS to the end of the Markdown document. (See [Styles](#styles).)

- **Default:** `true`
- **Accepted type:** `boolean`

### `replaceColor`

A function allowing individual color values to be replaced in the generated CSS. (See [Tweaking or replacing theme colors](#tweaking-or-replacing-theme-colors).)

- **Default:** None
- **Accepted type:** `(colorValue: string, theme: string) => string`; that is, a function that takes the original color and the identifier of the theme it came from and returns a new color value.

### `logLevel`

The verbosity of logging. Useful for diagnosing unexpected behavior.

- **Default**: `'warn'`
- **Accepted values:** From most verbose to least verbose, `'trace'`, `'debug'`, `'info'`, `'warn'`, or `'error'`.


## Contributing

Please note that this project is released with a Contributor [Code of Conduct](./CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development instructions.

[embedded-others]: https://user-images.githubusercontent.com/3277153/56853797-5debe780-68c8-11e9-91b2-aa651e87a675.png
[embedded-own]: https://user-images.githubusercontent.com/3277153/56853798-5e847e00-68c8-11e9-9eb6-061aa16756ec.png
[typescript-others]: https://user-images.githubusercontent.com/3277153/56853804-5f1d1480-68c8-11e9-965a-bc0adc0e5643.png
[typescript-own]: https://user-images.githubusercontent.com/3277153/56853803-5e847e00-68c8-11e9-9fa6-13a8de51c83d.png
[templates-others]: https://user-images.githubusercontent.com/3277153/56853801-5e847e00-68c8-11e9-9ed6-4a03e187aecd.png
[templates-own]: https://user-images.githubusercontent.com/3277153/56853802-5e847e00-68c8-11e9-8468-dedcd8bcab78.png
[solidity-others]: https://user-images.githubusercontent.com/3277153/56853799-5e847e00-68c8-11e9-8895-535d9e0d555c.png
[solidity-own]: https://user-images.githubusercontent.com/3277153/56853800-5e847e00-68c8-11e9-9c83-5e76146d5e46.png
[line-highlighting-meta]: https://user-images.githubusercontent.com/3277153/86545712-6fc21500-bee5-11ea-8a83-71d04f595ef4.png
[line-highlighting-comment]: https://user-images.githubusercontent.com/3277153/86545710-6e90e800-bee5-11ea-9f4d-33278d9312d7.png
[line-numbering-with-a-comment]: https://user-images.githubusercontent.com/3277153/87123264-3ff37400-c23b-11ea-8ae6-80cbfcf6b6a0.png
[line-numbering-with-code-fence-info]: https://user-images.githubusercontent.com/3277153/87122757-5ea53b00-c23a-11ea-8fbc-c85917433345.png
[line-numbering-with-both]: https://user-images.githubusercontent.com/3277153/87122755-5ea53b00-c23a-11ea-8fe8-144aea7aa952.png
[line-numbering-starting-line]: https://user-images.githubusercontent.com/3277153/87122747-5c42e100-c23a-11ea-9a06-923c699c0a0b.png
[diff-highlighting]: https://user-images.githubusercontent.com/3277153/87123984-aa58e400-c23c-11ea-87b3-3f66afcd795d.png