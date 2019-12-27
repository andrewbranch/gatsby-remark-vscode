module.exports = {
  wrapperClassName: ({ language, parsedOptions }) => {
    const { wrapperClass } = parsedOptions;
    if (wrapperClass) {
      return `test-wrapper ${language}-${wrapperClass}`;
    }
    return 'test-wrapper';
  },
};
