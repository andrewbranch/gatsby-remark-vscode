module.exports = {
  wrapperClassName: 'test-wrapper',
  getWrapperClassName: ({ language, parsedOptions }) => {
    const { wrapperClass } = parsedOptions;
    if (wrapperClass) {
      return `${language}-${wrapperClass}`;
    }
  },
};
