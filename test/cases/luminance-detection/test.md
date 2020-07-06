# Luminance detection

```js
module.exports = {
  theme: ({ parsedOptions }) => parsedOptions.light ? 'Default Light+' : 'Default Dark+' // highlight-line
};
```

```js {light}
module.exports = {
  theme: ({ parsedOptions }) => parsedOptions.light ? 'Default Light+' : 'Default Dark+' // highlight-line
};
```