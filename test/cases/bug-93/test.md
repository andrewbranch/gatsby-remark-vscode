# TypeError: Cannot read property 'marker' of undefined

After updating to `v2.1.0` I am now getting this error.

My gatsby-config.js file looks like this:

```js
{
    resolve: "gatsby-remark-vscode",
    options: {
        theme: "Shades of Purple",
        extensions: ["shades-of-purple"],
    },
},
```