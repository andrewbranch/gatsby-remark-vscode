---
title: Hello World
date: "2015-05-01T22:12:03.284Z"
description: "Hello World"
---

```jsx
const Wrapper = styled.section`
  border-radius: 4px;
  background: #bada55;

  @media only screen and (max-width: 667px) {
    & > div {
      border-bottom: ${borderPixels}px solid #f00;
    }
  }
`

export default function MyComponent({ children }) = (
  <Wrapper>{children}</Wrapper>
)
```

```js
/**
 * @param {string} x
 */
function foo(x) {

}
```