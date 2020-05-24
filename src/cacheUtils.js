// @ts-check

/**
 * @param {string} markdownNodeId
 * @param {string} markdownNodeContentDigest
 */
function childBlockNodesKey(markdownNodeId, markdownNodeContentDigest) {
  return `childBlockNodes-${markdownNodeId}-${markdownNodeContentDigest}`;
}

/**
 * @param {string} markdownNodeId
 * @param {string} markdownNodeContentDigest
 */
function childSpanNodesKey(markdownNodeId, markdownNodeContentDigest) {
  return `childSpanNodes-${markdownNodeId}-${markdownNodeContentDigest}`;
}

/**
 * @param {GatsbyCache} cache
 * @param {string} markdownNodeId
 * @param {string} markdownNodeContentDigest
 */
function getChildBlockNodes(cache, markdownNodeId, markdownNodeContentDigest) {
  return cache.get(childBlockNodesKey(markdownNodeId, markdownNodeContentDigest));
}

/**
 * @param {GatsbyCache} cache
 * @param {string} markdownNodeId
 * @param {string} markdownNodeContentDigest
 */
function getChildSpanNodes(cache, markdownNodeId, markdownNodeContentDigest) {
  return cache.get(childSpanNodesKey(markdownNodeId, markdownNodeContentDigest));
}

/**
 * @param {GatsbyCache} cache
 * @param {string} markdownNodeId
 * @param {string} markdownNodeContentDigest
 * @param {any[]} childNodes
 */
function setChildBlockNodes(cache, markdownNodeId, markdownNodeContentDigest, childNodes) {
  return cache.set(childBlockNodesKey(markdownNodeId, markdownNodeContentDigest), childNodes);
}

/**
 * @param {GatsbyCache} cache
 * @param {string} markdownNodeId
 * @param {string} markdownNodeContentDigest
 * @param {any[]} childNodes
 */
function setChildSpanNodes(cache, markdownNodeId, markdownNodeContentDigest, childNodes) {
  return cache.set(childSpanNodesKey(markdownNodeId, markdownNodeContentDigest), childNodes);
}

module.exports = {
  getChildBlockNodes,
  getChildSpanNodes,
  setChildBlockNodes,
  setChildSpanNodes
};
