---
title: Rendering line numbers from GraphQL data
date: "2015-05-01T22:12:03.284Z"
template: react-blog-post
codeComponent: CodeBlockWithLineNumbers
---

```js {startLine: 52}
/**
 * @template T
 * @template U
 * @param {T[]} arr
 * @param {(element: T) => U | U[]} mapper
 * @returns {U[]}
 */
function flatMap(arr, mapper) {
  /** @type {U[]} */
  const flattened = [];
  for (const input of arr) {
    const mapped = mapper(input);
    if (Array.isArray(mapped)) {
      for (const output of mapped) {
        flattened.push(output);
      }
    } else {
      flattened.push(mapped);
    }
  }
  return flattened;
}
```