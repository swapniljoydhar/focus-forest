const VIEWBOX_WIDTH = 900;
const MIN_X = 72;
const MAX_X = VIEWBOX_WIDTH - MIN_X;
const CENTER_X = VIEWBOX_WIDTH / 2;

const MODES = {
  seed: { height: 300, baseY: 258, gap: 76 },
  sapling: { height: 360, baseY: 314, gap: 82 },
  canopy: { height: 470, baseY: 414, gap: 88 },
  deep: { height: 560, baseY: 500, gap: 88 }
};

function finite(value, fallback) { return Number.isFinite(value) ? value : fallback; }
function depthOf(node) { return Math.max(0, Math.floor(finite(node?.depth, 0))); }
function nodeOrder(a, b) {
  const time = finite(a?.firstSeenAt, 0) - finite(b?.firstSeenAt, 0);
  return time || String(a?.id || '').localeCompare(String(b?.id || ''));
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function branchWidth(depth) { return Math.max(2.2, 8.5 - (Math.max(1, depth) - 1) * 1.15); }
function modeFor(nodes, maxDepth) {
  if (nodes.length <= 1) return 'seed';
  if (maxDepth <= 1 && nodes.length <= 5) return 'sapling';
  if (maxDepth <= 3 && nodes.length <= 18) return 'canopy';
  return 'deep';
}
function labelPlacement(point, nodeId, root = false) {
  const side = point.x >= CENTER_X ? 1 : -1;
  const offset = root ? 18 : 16;
  const rawX = point.x + side * offset;
  const x = clamp(rawX, 18, VIEWBOX_WIDTH - 18);
  return { nodeId, x, y: root ? point.y + 35 : point.y + 4, anchor: x >= CENTER_X ? 'end' : 'start' };
}
function edgePath(parent, child, depth, nodeId) {
  const dx = child.x - parent.x;
  const bend = Math.abs(dx) < 12 ? ((String(nodeId).length % 2 ? 1 : -1) * 18) : 0;
  if (depth === 1) {
    const c1x = parent.x + dx * 0.36;
    const c2x = child.x - dx * 0.24;
    return `M${parent.x.toFixed(2)} ${parent.y.toFixed(2)} C${c1x.toFixed(2)} ${(parent.y + 2).toFixed(2)}, ${c2x.toFixed(2)} ${(child.y - 2).toFixed(2)}, ${child.x.toFixed(2)} ${child.y.toFixed(2)}`;
  }
  const rise = Math.max(28, parent.y - child.y);
  const c1x = parent.x + dx * 0.16 + bend;
  const c2x = child.x - dx * 0.18 + bend;
  return `M${parent.x.toFixed(2)} ${(parent.y - 10).toFixed(2)} C${c1x.toFixed(2)} ${(parent.y - rise * 0.46).toFixed(2)}, ${c2x.toFixed(2)} ${(child.y + rise * 0.46).toFixed(2)}, ${child.x.toFixed(2)} ${(child.y + 10).toFixed(2)}`;
}

export function layoutTree(inputNodes = []) {
  const nodes = Array.isArray(inputNodes) ? inputNodes.filter((node) => node && typeof node.id === 'string') : [];
  if (!nodes.length) return { mode: 'empty', width: VIEWBOX_WIDTH, height: 300, baseY: 258, root: null, positions: new Map(), parentById: new Map(), children: new Map(), edges: [], labels: [], trunk: null, maxDepth: 0 };

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const root = nodes.find((node) => depthOf(node) === 0) || nodes[0];
  const rootId = root.id;
  const parentById = new Map();
  const parentAnchors = new Map();
  const children = new Map();

  nodes.forEach((node) => {
    if (node.id === rootId) return;
    const candidate = typeof node.parentId === 'string' && node.parentId !== node.id && nodeMap.has(node.parentId) ? node.parentId : rootId;
    parentById.set(node.id, candidate);
    if (!children.has(candidate)) children.set(candidate, []);
    children.get(candidate).push(node);
  });
  children.forEach((list) => list.sort(nodeOrder));

  const weights = new Map();
  const weight = (id) => {
    if (weights.has(id)) return weights.get(id);
    const total = (children.get(id) || []).reduce((sum, child) => sum + weight(child.id), 0) + 1;
    weights.set(id, total);
    return total;
  };
  weight(rootId);

  const maxDepth = Math.max(0, ...nodes.map(depthOf));
  const mode = modeFor(nodes, maxDepth);
  const config = MODES[mode];
  const positions = new Map([[rootId, { x: CENTER_X, y: config.baseY - 28 }]]);
  const primaryY = config.baseY - config.gap + 8;
  const forkY = primaryY - 8;
  const edges = [];

  function placeChildren(parentId, left, right, depth) {
    const list = children.get(parentId) || [];
    if (!list.length) return;
    const total = list.reduce((sum, child) => sum + weight(child.id), 0);
    let cursor = left;
    list.forEach((child) => {
      const span = (right - left) * (weight(child.id) / total);
      const inset = Math.min(24, Math.max(8, span * 0.12));
      const childLeft = cursor + inset;
      const childRight = cursor + span - inset;
      const point = { x: clamp((childLeft + childRight) / 2, MIN_X, MAX_X), y: depth === 1 ? primaryY : config.baseY - depth * config.gap };
      positions.set(child.id, point);
      const parent = positions.get(parentId) || positions.get(rootId);
      const branchOrigin = parentId === rootId ? { x: CENTER_X, y: forkY } : parent;
      parentAnchors.set(child.id, branchOrigin);
      edges.push({ nodeId: child.id, parentId, path: edgePath(branchOrigin, point, depth, child.id), width: branchWidth(depth), depth, kind: depth === 1 ? 'primary' : 'secondary' });
      const childSpan = Math.max(34, (childRight - childLeft) * 0.88);
      placeChildren(child.id, point.x - childSpan / 2, point.x + childSpan / 2, depth + 1);
      cursor += span;
    });
  }

  placeChildren(rootId, MIN_X, MAX_X, 1);
  nodes.forEach((node, index) => {
    if (positions.has(node.id)) return;
    const parentId = parentById.get(node.id) || rootId;
    const parent = positions.get(parentId) || positions.get(rootId);
    const point = { x: clamp(parent.x + ((index % 3) - 1) * 24, MIN_X, MAX_X), y: parent.y - config.gap };
    positions.set(node.id, point);
    const branchOrigin = parentId === rootId ? { x: CENTER_X, y: forkY } : parent;
    parentAnchors.set(node.id, branchOrigin);
    const depth = depthOf(node);
    edges.push({ nodeId: node.id, parentId, path: edgePath(branchOrigin, point, depth, node.id), width: branchWidth(depth), depth, kind: depth === 1 ? 'primary' : 'secondary' });
  });

  const labelCandidates = nodes
    .filter((node) => depthOf(node) <= 1 || nodes.length <= 6)
    .map((node) => labelPlacement(positions.get(node.id), node.id, node.id === rootId))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const labels = [];
  labelCandidates.forEach((candidate) => {
    const crowded = labels.some((kept) => kept.anchor === candidate.anchor && Math.abs(kept.y - candidate.y) < 18 && Math.abs(kept.x - candidate.x) < 78);
    if (!crowded || candidate.nodeId === rootId) labels.push(candidate);
  });

  return {
    mode,
    width: VIEWBOX_WIDTH,
    height: config.height,
    baseY: config.baseY,
    root,
    positions,
    parentById,
    children,
    edges,
    labels,
    trunk: { x: CENTER_X, baseY: config.baseY, rootY: positions.get(rootId).y, forkY, primaryY, shootY: mode === 'seed' ? forkY - 28 : null },
    parentAnchors,
    maxDepth
  };
}

export { branchWidth, labelPlacement };
