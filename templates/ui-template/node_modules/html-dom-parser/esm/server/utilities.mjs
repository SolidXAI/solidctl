/**
 * Sets root parent to null.
 *
 * @param nodes - Nodes.
 * @returns - Nodes.
 */
function unsetRootParent(nodes) {
    var index = 0;
    var nodesLength = nodes.length;
    for (; index < nodesLength; index++) {
        var node = nodes[index];
        node.parent = null;
    }
    return nodes;
}

export { unsetRootParent };
//# sourceMappingURL=utilities.mjs.map
