# Line numbers

With code fence info:

```js {numberLines}
import * as React from 'react';

React.createElement('span', {});
```

With code fence info specifying a starting line:

```js {numberLines: 21}
  return 'blah';
```

With a comment:

```ts
function getDefaultLineTransformers(pluginOptions, cache) {
  return [
    createHighlightDirectiveLineTransformer(pluginOptions.languageAliases, cache), // L4
    highlightMetaTransformer,
    createLineNumberLineTransformer(pluginOptions.languageAliases, cache)
  ];
}
```

With both:

```ts {numberLines}
import * as React from 'react';

// ...

function SomeComponent(props) { // L29
  return <div />;
}
```

With line highlighting:

```ts {5, numberLines}
import * as React from 'react';

// ...

function SomeComponent(props) { // L29
  return <div />;
}
```