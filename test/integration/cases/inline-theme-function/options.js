module.exports = {
  inlineCode: {
    theme: ({ language }) => {
      if (language === 'js') {
        return {
          default: 'Default Light+',
          dark: 'Default Dark+'
        };
      }
      return 'Abyss';
    },
    marker: '•',
    className: 'my-inline-code'
  }
};
