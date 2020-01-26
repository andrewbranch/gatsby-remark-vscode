```ts
const x = 0;
const y = 1; // highlight-line
const z = 2;
```

```shell
npm install
npm run build # highlight-line
npm start
```

```js
// This is where the interesting part is
// highlight-start
function somethingSuperInteresting() {
  console.log(this);
}
// highlight-end

somethingSuperInteresting();
```

```swift
enum Thing {
  case one
  // highlight-next-line
  case two(_ name: String)
}
```
