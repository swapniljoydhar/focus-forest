import assert from 'node:assert/strict';
import { layoutTree } from './dashboard/tree-layout.js';

function node(id, depth, parentId = null, extra = {}) {
  return { id, depth, parentId, title: id, state: 'normal', ...extra };
}

function assertFinitePoint(point, label) {
  assert.ok(point && Number.isFinite(point.x) && Number.isFinite(point.y), `${label} should have finite coordinates`);
}

function assertConnected(tree, nodes) {
  const rootId = tree.root.id;
  assert.equal(tree.edges.length, Math.max(0, nodes.length - 1), 'every non-root node should have one visible edge');
  for (const item of nodes) {
    assertFinitePoint(tree.positions.get(item.id), `position for ${item.id}`);
    if (item.id !== rootId) {
      assert.ok(tree.edges.some((edge) => edge.nodeId === item.id && edge.parentId === tree.parentById.get(item.id)), `${item.id} should connect to its resolved parent`);
    }
  }
}

const seed = [node('root', 0)];
const seedTree = layoutTree(seed);
assert.equal(seedTree.mode, 'seed');
assert.equal(seedTree.root.id, 'root');
assert.equal(seedTree.positions.get('root').x, 450, 'the root should be centered');
assert.ok(seedTree.positions.get('root').y > 180, 'the root should sit in the lower tree zone');
assert.ok(seedTree.trunk && seedTree.trunk.forkY < seedTree.trunk.rootY, 'a seed still needs a visible bole and an upper trunk fork');
assertConnected(seedTree, seed);

const sapling = [node('root', 0), node('leaf-a', 1, 'root')];
const saplingTree = layoutTree(sapling);
assert.equal(saplingTree.mode, 'sapling');
assertConnected(saplingTree, sapling);
assert.ok(saplingTree.edges[0].path.includes('C'), 'a child edge should be curved rather than a straight graph connector');
assert.ok(saplingTree.edges[0].path.startsWith(`M450.00 ${saplingTree.trunk.forkY.toFixed(2)}`), 'primary limbs should begin at the trunk fork');
assert.ok(saplingTree.positions.get('leaf-a').y < saplingTree.positions.get('root').y, 'growth should rise upward');

const canopy = [
  node('root', 0),
  node('left', 1, 'root'), node('right', 1, 'root'),
  node('left-deep', 2, 'left'), node('right-deep', 2, 'right'),
  node('right-tip', 3, 'right-deep')
];
const canopyTree = layoutTree(canopy);
assert.equal(canopyTree.mode, 'canopy');
assertConnected(canopyTree, canopy);
assert.ok(canopyTree.positions.get('left').x < canopyTree.positions.get('root').x);
assert.ok(canopyTree.positions.get('right').x > canopyTree.positions.get('root').x);
assert.equal(canopyTree.positions.get('left').y, canopyTree.positions.get('right').y, 'primary limbs should share a horizontal branch level');
assert.equal(canopyTree.edges.filter((edge) => edge.depth === 1).every((edge) => edge.kind === 'primary'), true, 'first-level edges should be explicit primary limbs');
assert.ok(canopyTree.parentAnchors.get('left').y < canopyTree.positions.get('left').y, 'primary leaves should orient from the upper trunk fork');
assert.ok(canopyTree.positions.get('right-tip').y < canopyTree.positions.get('right').y);
assert.ok(canopyTree.edges.every((edge) => edge.width > 0), 'branches should taper with a positive width');

const malformed = [node('root', 0), node('orphan', 4, 'missing-parent'), node('self', 2, 'self')];
const malformedTree = layoutTree(malformed);
assertConnected(malformedTree, malformed);
assert.equal(malformedTree.parentById.get('orphan'), 'root', 'missing parents should resolve to the root');
assert.equal(malformedTree.parentById.get('self'), 'root', 'self-parenting nodes should resolve to the root');

const labelled = [node('root', 0), node('a', 1), node('b', 1), node('c', 1), node('d', 1), node('e', 1), node('f', 1)];
const labelledTree = layoutTree(labelled);
assert.ok(labelledTree.labels.every((label) => label.x >= 18 && label.x <= 882), 'labels should remain inside the viewBox');
assert.equal(new Set(labelledTree.labels.map((label) => label.nodeId)).size, labelledTree.labels.length, 'labels should be unique by node');
const crowdedNodes = [node('root', 0), ...Array.from({ length: 14 }, (_, index) => node(`primary-${index}`, 1, 'root'))];
const crowdedTree = layoutTree(crowdedNodes);
assert.ok(crowdedTree.labels.length < crowdedNodes.length, 'crowded primary branches should not display every competing label');

const first = JSON.stringify(layoutTree(canopy));
const second = JSON.stringify(layoutTree(canopy));
assert.equal(first, second, 'identical input should produce identical geometry');

console.log('tree-layout tests passed');
