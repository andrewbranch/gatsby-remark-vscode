# README Examples

These code blocks are screenshotted and used in the [project README](https://github.com/andrewbranch/gatsby-remark-vscode).

## Why gatsby-remark-vscode?

### Embedded languages

```md
# Here’s some Markdown
> It is _really_ **Markdown**

<p>Here’s some HTML inside Markdown</p>
<script>
  function(js) {
    return this.is(js.inHTML.inMarkdown);
  }
</script>
<style>
  .and-css-too:not(.too#shabby) {
    color: #ff0000;
  }
</style>
```

### Complex TypeScript

```ts
export type Evolved<T> =
  T extends (value: infer V) => any ? V :
  T extends Evolver ? Evolvable<T> :
  never;

export declare function foo<T extends (...args: never[]) => unknown, U>(
  x: U extends ReadonlyArray<infer V> ? V : never,
  fn: T
): {
  readonly [K in Thing<U>]-?: Parameters<T>
}
```

### Tricky template strings

```js
const foo = `
  template template ${
    bar + cat(`one two${
      nexte('`')
    }three four`) + five(six)
  } template template
`;
```

### Uncommon languages

```solidity
pragma solidity ^ 0.4.0;

contract AddressBook {
    mapping(address => address[]) private _addresses;
    mapping(address => mapping(address => string)) private _aliases;

    function getAddresses() public view returns (address[]) {
        return _addresses(msg.sender);
    }

    function addAddress(address addr, string aliase) public {
        _addresses(msg.sender).push(addr);
        _aliases(msg.sender)[addr] = alias;
    }

    function removeAddress(address addr) public {
        uint length = _addresses[msg.sender].length;
        for (uint i = 0; i < length; i++) {
            if (addr == _addresses[msg.sender][i]) {
                if (1 < _addresses[msg.sender].length && i < length-1) {
```

## Line highlighting

```js{1,3-5}
this.isLine(1); // highlighted
this.isLine(2);
this.isLine(3); // highlighted
this.isLine(4); // highlighted
this.isLine(5); // highlighted
```

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