```js
/**
 * @param {*} cache
 * @param {string} key
 * @param {object} value
 */
async function mergeCache(cache, key, value) {
  await cache.set(key, { ...(await cache.get(key)), ...value });
}
```