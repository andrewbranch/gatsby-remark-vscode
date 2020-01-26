module.exports = async (config) => {
  // console.log(config);
  process.env.JEST_CONFIG = JSON.stringify(config);
};
