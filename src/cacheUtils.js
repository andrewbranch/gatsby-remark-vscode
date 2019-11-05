// @ts-check

/**
 * @param {string} markdownNodeId
 * @param {string} markdownNodeContentDigest
 */
function childNodesKey(markdownNodeId, markdownNodeContentDigest) {
  return `childNodes-${markdownNodeId}-${markdownNodeContentDigest}`;
}

/**
 * @param {GatsbyCache} cache
 * @param {string} markdownNodeId
 * @param {string} markdownNodeContentDigest
 */
function getChildNodes(cache, markdownNodeId, markdownNodeContentDigest) {
  return cache.get(childNodesKey(markdownNodeId, markdownNodeContentDigest));
}

/**
 * @param {GatsbyCache} cache
 * @param {string} markdownNodeId
 * @param {string} markdownNodeContentDigest
 * @param {any[]} childNodes
 */
function setChildNodes(cache, markdownNodeId, markdownNodeContentDigest, childNodes) {
  return cache.set(childNodesKey(markdownNodeId, markdownNodeContentDigest), childNodes);
}

module.exports = {
  getChildNodes,
  setChildNodes
};
