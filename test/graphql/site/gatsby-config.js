const path = require(`path`);

module.exports = {
  plugins: [
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: path.resolve(__dirname, `../../..`),
            options: {
              __getOptions__: markdownAbsolutePath => {
                try {
                  return require(path.join(path.dirname(markdownAbsolutePath), 'options'));
                } catch (_) {
                  return {};
                }
              }
            }
          }
        ]
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `pages`,
        path: path.resolve(__dirname, `../../cases`)
      }
    }
  ]
}
