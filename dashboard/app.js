import { layoutTree } from './tree-layout.js';
import { logError, wrapWithErrorBoundary, ERROR_CATEGORIES } from '../shared/error-tracing.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
async function message(type, payload = {}) { return chrome.runtime.sendMessage({ type, ...payload }); }
const svg = document.querySelector('#tree'); const sessionSelect = document.querySelector('#session-select'); const detail = document.querySelector('#branch-detail'); const careDialog = document.querySelector('#care-dialog'); const careTitle = document.querySelector('#care-dialog-title'); const careCopy = document.querySelector('#care-dialog-copy'); const careCancel = document.querySelector('#care-cancel'); const careConfirm = document.querySelector('#care-confirm');
let selectedSessionId = null; let selectedNodeId = null; let careAction = null; let careReturnFocus = null;

function branchClass(node) { return node.state === 'pruned' ? 'pruned' : node.state === 'composted' ? 'saved' : node.depth >= 5 ? 'deep' : node.depth >= 4 ? 'long' : node.depth === 0 ? 'root' : 'healthy'; }
function nodeClasses(node) { return `${branchClass(node)}${node.closedAt ? ' closed' : ''}`; }
function confidenceLabel(node) { return node.relationshipConfidence === 'direct' ? 'direct link' : node.relationshipConfidence === 'tab-inferred' ? 'new tab from a tracked page' : 'unlinked path'; }
function nodeDescription(node) { const state = node.state === 'pruned' ? 'pruned and kept in the trail' : node.state === 'composted' ? 'resting in compost' : node.depth === 0 ? 'mission root' : `${branchClass(node)} branch`; return `${(node.title || node.url || 'Untitled path').slice(0, 80)}, ${state}, ${confidenceLabel(node)}, depth ${node.depth}`; }
function shortLabel(node) { const value = (node.title || node.url || 'Untitled path').replace(/^https?:\/\//, ''); return value.length > 20 ? `${value.slice(0, 19)}…` : value; }
function svgElement(tag, attributes = {}, text = null) { const element = document.createElementNS(SVG_NS, tag); Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value))); if (text != null) element.textContent = text; return element; }
function svgPath(className, d, attributes = {}) { return svgElement('path', { class: className, d, ...attributes }); }
function stateClass(node) { return nodeClasses(node); }
function leafShape(scale = 1, rotate = 0) { return svgElement('path', { class: 'leaf-shape', d: 'M0 0 C6 -10 18 -13 24 -5 C20 4 10 6 0 0 Z', transform: `scale(${scale}) rotate(${rotate})` }); }
function terminalLeaf(node, point, parentPoint) {
  const group = svgElement('g', { class: `terminal-leaf ${stateClass(node)}`, transform: `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})` });
  const dx = point.x - parentPoint.x; const dy = point.y - parentPoint.y;
  const baseAngle = Math.atan2(dy, dx) * 180 / Math.PI;
  // A small cluster of 3 leaves fanning outward from the branch tip.
  const spread = 38;
  group.append(leafShape(1, baseAngle - spread));
  group.append(leafShape(1.15, baseAngle));
  group.append(leafShape(1, baseAngle + spread));
  return group;
}
function nodeMark(node, point, tree) {
  const group = svgElement('g', { class: `node ${stateClass(node)}${node.id === selectedNodeId ? ' selected' : ''}`, tabindex: 0, role: 'button', 'data-node-id': node.id, 'aria-label': nodeDescription(node) });
  group.append(svgElement('title', {}, nodeDescription(node)));
  const children = tree.children.get(node.id) || [];
  if (node.depth === 0) {
    // Mission root: a planted seed/sprout at the base of the trunk.
    group.append(svgElement('ellipse', { cx: point.x, cy: point.y + 6, rx: 16, ry: 9, class: 'root-base' }));
    group.append(svgElement('path', { class: 'root-sprout', d: `M${point.x} ${point.y + 6} C${point.x - 3} ${point.y - 4} ${point.x + 3} ${point.y - 8} ${point.x} ${point.y - 14}` }));
    group.append(leafShape(0.7, -42));
    group.lastChild.setAttribute('transform', `translate(${point.x - 4} ${point.y - 12}) scale(0.7) rotate(-42)`);
    const leaf2 = leafShape(0.7, 42);
    leaf2.setAttribute('transform', `translate(${point.x + 4} ${point.y - 12}) scale(0.7) rotate(42)`);
    group.append(leaf2);
  } else if (children.length) {
    // Junction: a subtle bark knot where a branch forks.
    group.append(svgElement('circle', { cx: point.x, cy: point.y, r: 6, class: 'junction-mark' }));
  } else {
    const parentPoint = tree.positions.get(tree.parentById.get(node.id)) || { x: point.x, y: point.y + 30 };
    group.append(terminalLeaf(node, point, parentPoint));
  }
  return group;
}
function saplingBolePath(tree, groundY, rootPoint) { const x = tree.trunk.x; const r = tree.trunk.rootY; const f = tree.trunk.forkY; return `M${(x - 14).toFixed(2)} ${groundY.toFixed(2)} C${(x - 23).toFixed(2)} ${(groundY - 8).toFixed(2)}, ${(x - 18).toFixed(2)} ${(r + 28).toFixed(2)}, ${(x - 10).toFixed(2)} ${(r + 9).toFixed(2)} C${(x - 8).toFixed(2)} ${(r - 10).toFixed(2)}, ${(x - 12).toFixed(2)} ${(f + 30).toFixed(2)}, ${(x - 8).toFixed(2)} ${(f + 9).toFixed(2)} L${(x + 7).toFixed(2)} ${(f + 9).toFixed(2)} C${(x + 11).toFixed(2)} ${(f + 30).toFixed(2)}, ${(x + 8).toFixed(2)} ${(r - 8).toFixed(2)}, ${(x + 11).toFixed(2)} ${(r + 10).toFixed(2)} C${(x + 18).toFixed(2)} ${(r + 30).toFixed(2)}, ${(x + 24).toFixed(2)} ${(groundY - 9).toFixed(2)}, ${(x + 13).toFixed(2)} ${groundY.toFixed(2)} Z`; }
function leafBud(bud) { return svgElement('path', { class: 'tree-leaf-bud', d: 'M0 0 C3 -14 14 -19 20 -12 C19 -3 10 3 0 0 Z', transform: `translate(${bud.x.toFixed(2)} ${bud.y.toFixed(2)}) rotate(${bud.angle}) scale(${bud.scale})` }); }
function appendBotanicalStructure(structure, tree, groundY, rootPoint) { structure.append(svgPath('tree-ground', `M${tree.width * .28} ${(groundY + 2).toFixed(2)} Q${tree.width / 2} ${(groundY - 24).toFixed(2)} ${tree.width * .72} ${(groundY + 2).toFixed(2)}`)); if (tree.trunk.rootFlare?.length) tree.trunk.rootFlare.forEach((flare) => structure.append(svgPath(`tree-root-flare ${flare.side}`, flare.d))); structure.append(svgPath('tree-bole', tree.mode === 'seed' || tree.mode === 'sapling' ? saplingBolePath(tree, groundY, rootPoint) : `M${tree.width / 2} ${groundY} C${tree.width / 2 - 6} ${groundY - 20} ${tree.width / 2 + 5} ${rootPoint.y + 28} ${rootPoint.x} ${rootPoint.y + 12} C${rootPoint.x - 6} ${rootPoint.y - 14} ${tree.width / 2 + 4} ${tree.trunk.forkY + 24} ${tree.trunk.x} ${tree.trunk.forkY}`)); if (tree.trunk.shoots?.length) tree.trunk.shoots.forEach((shoot) => structure.append(svgPath(`tree-shoot ${shoot.side}`, shoot.d))); if (tree.trunk.buds?.length) tree.trunk.buds.forEach((bud) => structure.append(leafBud(bud))); if (tree.trunk.shootY != null && !tree.trunk.buds?.length) structure.append(svgPath('tree-shoot', `M${tree.trunk.x} ${tree.trunk.forkY} C${tree.trunk.x - 2} ${tree.trunk.forkY - 10} ${tree.trunk.x + 2} ${tree.trunk.shootY + 12} ${tree.trunk.x} ${tree.trunk.shootY}`)); }
function appendLabel(svgRoot, node, label) { const text = svgElement('text', { x: label.x, y: label.y, 'text-anchor': label.anchor, class: 'node-label' }, shortLabel(node)); text.dataset.nodeId = node.id; svgRoot.append(text); }
function appendEmptyGarden() { svg.dataset.treeMode = 'empty'; svg.setAttribute('viewBox', '0 0 900 320'); const title = svgElement('title', {}, 'An empty Focus Forest garden'); const description = svgElement('desc', {}, 'A young rooted sapling waiting for a mission.'); const group = svgElement('g', { class: 'empty-garden' }); group.append(svgPath('empty-ground', 'M360 273 Q450 244 540 273'), svgPath('empty-trunk', 'M450 270 C448 247 449 218 450 178'), svgPath('empty-sprig', 'M450 202 C428 181 411 171 394 170'), svgPath('empty-sprig', 'M450 190 C471 169 490 162 510 163'), svgPath('empty-leaf', 'M392 171 C397 151 414 142 431 147 C425 164 411 174 392 171 Z'), svgPath('empty-leaf', 'M489 164 C501 145 519 141 533 150 C521 166 506 169 489 164 Z'), svgElement('circle', { cx: 450, cy: 273, r: 14, class: 'empty-root' }), svgElement('text', { x: 450, y: 304, 'text-anchor': 'middle', class: 'empty-tree' }, 'Plant a mission to grow your first garden.')); svg.replaceChildren(title, description, group); }
// Build a tapered branch: a closed filled path that is wide at the parent
// end and narrows toward the child, giving an organic bark-like limb.
function taperedBranchPath(parent, child, wParent, wChild) {
  if (!parent || !child) return '';
  const dx = child.x - parent.x; const dy = child.y - parent.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; const ny = dx / len; // normal
  const px = (p) => parent.x + nx * p;
  const py = (p) => parent.y + ny * p;
  const cx = (p) => child.x + nx * p;
  const cy = (p) => child.y + ny * p;
  // Curve the branch slightly using control points offset along the branch.
  const bend = Math.min(14, len * 0.12) * (String(child.x).length % 2 ? 1 : -1);
  const c1x = parent.x + dx * 0.4 + nx * bend; const c1y = parent.y + dy * 0.4 + ny * bend;
  const c2x = child.x - dx * 0.35 + nx * bend; const c2y = child.y - dy * 0.35 + ny * bend;
  return `M${px(wParent).toFixed(2)} ${py(wParent).toFixed(2)} C${(c1x + nx * wParent).toFixed(2)} ${(c1y + ny * wParent).toFixed(2)}, ${(c2x + nx * wChild).toFixed(2)} ${(c2y + ny * wChild).toFixed(2)}, ${cx(wChild).toFixed(2)} ${cy(wChild).toFixed(2)} L${cx(-wChild).toFixed(2)} ${cy(-wChild).toFixed(2)} C${(c2x - nx * wChild).toFixed(2)} ${(c2y - ny * wChild).toFixed(2)}, ${(c1x - nx * wParent).toFixed(2)} ${(c1y - ny * wParent).toFixed(2)}, ${px(-wParent).toFixed(2)} ${py(-wParent).toFixed(2)} Z`;
}
function renderTree(session) {
  svg.replaceChildren();
  if (!session || !session.nodes.length) { appendEmptyGarden(); detail.hidden = true; return; }
  const nodes = session.nodes.slice(); const tree = layoutTree(nodes); svg.dataset.treeMode = tree.mode; svg.setAttribute('viewBox', `0 0 ${tree.width} ${tree.height}`); const nodeMap = new Map(nodes.map(node => [node.id, node]));
  svg.append(svgElement('title', {}, `Living ${tree.mode} tree of ${session.mission}`), svgElement('desc', {}, 'A rooted tree showing browsing paths growing upward from the mission root.')); const structure = svgElement('g', { class: 'tree-structure', 'aria-hidden': 'true' }); const groundY = tree.baseY + 20; const rootPoint = tree.positions.get(tree.root.id); appendBotanicalStructure(structure, tree, groundY, rootPoint); svg.append(structure);
  const branchLayer = svgElement('g', { class: 'branch-layer', 'aria-hidden': 'true' });
  tree.edges.forEach((edge) => {
    const node = nodeMap.get(edge.nodeId);
    const parentPoint = tree.positions.get(edge.parentId);
    const childPoint = tree.positions.get(edge.nodeId);
    const w = edge.width;
    branchLayer.append(svgPath(`branch-taper ${edge.kind} ${stateClass(node)}`, taperedBranchPath(parentPoint, childPoint, w, w * 0.45)));
  });
  svg.append(branchLayer);
  // Highlight the path from root to the selected node.
  if (selectedNodeId) {
    const ancestry = [];
    let cur = nodeMap.get(selectedNodeId);
    while (cur) { ancestry.push(cur.id); cur = cur.parentId && nodeMap.get(cur.parentId) ? nodeMap.get(cur.parentId) : null; }
    const highlightLayer = svgElement('g', { class: 'highlight-layer', 'aria-hidden': 'true' });
    ancestry.reverse().forEach((nodeId, i) => {
      if (i === 0) return;
      const node = nodeMap.get(nodeId);
      const edge = tree.edges.find((e) => e.nodeId === nodeId);
      if (!edge || !node) return;
      const parentPoint = tree.positions.get(edge.parentId);
      const childPoint = tree.positions.get(edge.nodeId);
      const w = edge.width;
      highlightLayer.append(svgPath(`branch-taper ${edge.kind} ${stateClass(node)} highlight`, taperedBranchPath(parentPoint, childPoint, w + 1.5, w * 0.45 + 1)));
    });
    svg.append(highlightLayer);
  }
  const markLayer = svgElement('g', { class: 'mark-layer' }); nodes.forEach((node) => markLayer.append(nodeMark(node, tree.positions.get(node.id), tree))); const labelMap = new Map(tree.labels.map((label) => [label.nodeId, label])); nodes.forEach((node) => { if (node.id === selectedNodeId && !labelMap.has(node.id)) labelMap.set(node.id, { nodeId: node.id, ...{ x: tree.positions.get(node.id).x, y: tree.positions.get(node.id).y - 14, anchor: tree.positions.get(node.id).x >= tree.width / 2 ? 'end' : 'start' } }); }); nodes.forEach((node) => { const label = labelMap.get(node.id); if (label) appendLabel(markLayer, node, label); }); svg.append(markLayer); renderDetail(nodeMap.get(selectedNodeId), session);
}
function makeTextElement(tag, text, className = '') { const element = document.createElement(tag); if (className) element.className = className; element.textContent = text; return element; }
function makeBranchButton(action, label, quiet = false) { const button = makeTextElement('button', label, `detail-button${quiet ? ' quiet' : ''}`); button.type = 'button'; button.dataset.branchAction = action; return button; }
function renderDetail(node, session) {
  detail.replaceChildren();
  if (!node) { detail.hidden = true; return; }
  detail.hidden = false; const isRoot = node.depth === 0; const isPruned = node.state === 'pruned' || node.state === 'composted'; const parent = session.nodes.find(candidate => candidate.id === node.parentId); const parentLabel = parent ? `From “${shortLabel(parent)}”` : isRoot ? 'This is the mission root.' : 'Arrived as an unlinked path.'; const stateLabel = node.state === 'pruned' ? 'pruned' : node.state === 'composted' ? 'resting in compost' : 'growing';
  const copy = document.createElement('div'); copy.className = 'detail-copy'; copy.append(makeTextElement('p', 'SELECTED PATH', 'eyebrow'), makeTextElement('h3', (node.title || node.url || 'Untitled path').slice(0, 72)), makeTextElement('p', `Depth ${node.depth} · ${confidenceLabel(node)} · ${stateLabel}`, 'detail-meta'), makeTextElement('p', parentLabel, 'detail-parent'));
  const actions = document.createElement('div'); actions.className = 'detail-actions'; if (isRoot) actions.append(makeTextElement('span', 'The root stays with this mission.', 'detail-note')); else if (isPruned) actions.append(makeTextElement('span', 'This path remains in the trail for reflection.', 'detail-note')); else actions.append(makeBranchButton('prune', 'Prune this path'), makeBranchButton('compost', 'Return to compost')); actions.append(makeBranchButton('close', 'Leave it growing', true)); detail.append(copy, actions);
}
function readableEvent(e) { if (e.type === 'mission_started') return `Planted “${e.mission || 'a mission'}”.`; if (e.type === 'origin_planted') return 'Found the root page for this mission.'; if (e.type === 'navigation') return `Followed a branch to “${(e.url || '').replace(/^https?:\/\//, '').slice(0, 48)}”.`; if (e.type === 'external_path') return `Arrived at an unlinked path: “${(e.url || '').replace(/^https?:\/\//, '').slice(0, 48)}”.`; if (e.type === 'tab_joined_path') return 'A duplicate tab joined a known path.'; if (e.type === 'return_to_path') return 'Returned to a path already growing in this garden.'; if (e.type === 'composted') return 'Saved an interesting branch for later.'; if (e.type === 'pruned') return 'Pruned a branch while keeping its trail note.'; if (e.type === 'mission_changed') return 'Let this garden rest and chose a new direction.'; if (e.type === 'mission_ended' && e.reason === 'browse_without_mission') return 'Set this mission down and continued without one.'; if (e.type === 'mission_ended') return 'Closed this garden for the day.'; return e.type.replaceAll('_', ' '); }
function renderEvents(session) { const box = document.querySelector('#events'); box.replaceChildren(); const events = (session?.events || []).slice().reverse(); if (!events.length) { box.append(makeTextElement('p', 'Your trail notes will appear here.', 'muted')); return; } events.forEach((event) => { const item = document.createElement('div'); item.className = 'event'; item.append(makeTextElement('span', '', 'event-dot')); const copy = document.createElement('div'); copy.append(makeTextElement('strong', readableEvent(event))); copy.append(makeTextElement('small', `${new Date(event.at).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}${event.depth != null ? ` · branch ${event.depth}` : ''}`)); item.append(copy); box.append(item); }); }
function renderCompost(items) { const box = document.querySelector('#compost'); box.replaceChildren(); if (!items?.length) { box.append(makeTextElement('p', 'Your saved curiosities will rest here.', 'muted')); return; } items.forEach((item) => { const row = document.createElement('div'); row.className = 'compost-item'; const copy = document.createElement('div'); const link = makeTextElement('a', item.title); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; copy.append(link, makeTextElement('small', `${new Date(item.savedAt).toLocaleDateString()} · from “${item.mission}”`)); const remove = makeTextElement('button', 'Remove'); remove.type = 'button'; remove.dataset.id = item.id; row.append(copy, remove); box.append(row); }); }
function renderSessions(sessions, activeId, currentId) { sessionSelect.replaceChildren(); if (!sessions.length) { sessionSelect.append(makeTextElement('option', 'No gardens yet')); } else { sessions.slice().sort((a,b) => (b.endedAt || b.startedAt) - (a.endedAt || a.startedAt)).forEach((session) => { const option = makeTextElement('option', `${session.mission}${session.id === activeId ? ' · active' : ''}`); option.value = session.id; sessionSelect.append(option); }); } sessionSelect.value = currentId || activeId || sessions[0]?.id || ''; }
const safeRender = wrapWithErrorBoundary(render, { category: ERROR_CATEGORIES.UI_RENDER, function: 'render' });
async function render() { const snap = await message('GET_SNAPSHOT', { sessionId: selectedSessionId, includeHistory: true }); selectedSessionId = snap.session?.id || null; renderSessions(snap.state.sessions || [], snap.activeSessionId, selectedSessionId); const session = snap.session; const nodes = session?.nodes || []; if (!nodes.some(node => node.id === selectedNodeId)) selectedNodeId = null; document.querySelector('#mission').textContent = session ? `Mission: ${session.mission}` : 'A visual record of where your attention wandered today.'; const deepest = Math.max(0, ...nodes.map(node => node.depth)); const composted = nodes.filter((node) => node.state === 'composted').length; const pruned = nodes.filter((node) => node.state === 'pruned').length; const changed = session?.endReason === 'mission_changed'; const storyline = !session ? 'A clearing is ready whenever you are.' : changed ? 'You noticed a new direction and gave this garden a graceful ending.' : pruned ? `You grew ${nodes.length} pages and pruned ${pruned} path${pruned === 1 ? '' : 's'} without losing the trail.` : composted ? `You grew ${nodes.length} pages and returned ${composted} curiosit${composted === 1 ? 'y' : 'ies'} to the compost pile.` : deepest >= 4 ? `You grew ${nodes.length} pages and found a long branch worth noticing.` : `You grew ${nodes.length} pages from a single clear intention.`; document.querySelector('#storyline').textContent = storyline; document.querySelector('#weather-cue').textContent = session?.status === 'completed' ? 'Resting garden' : deepest >= 4 ? 'A little dusk' : nodes.length > 4 ? 'Fern light' : 'Soft light'; document.body.dataset.gardenState = session?.status === 'completed' ? 'resting' : 'growing'; renderTree(session); renderEvents(session); renderCompost(snap.state.compostItems); }
async function renderSafely() { 
  try { 
    await safeRender(); 
  } catch (error) { 
    logError(error, { category: ERROR_CATEGORIES.UI_RENDER, function: 'renderSafely' });
    document.querySelector('#mission').textContent = 'The garden could not be read right now.'; 
    document.querySelector('#storyline').textContent = 'Your local data is still on this device. Try opening the garden again.'; 
    sessionSelect.replaceChildren(makeTextElement('option', 'Garden unavailable'));
    renderTree(null);
    renderEvents(null);
    renderCompost([]);
    detail.replaceChildren();
    detail.hidden = true;
    document.body.dataset.gardenState = 'error';
  } 
}
function closeCareDialog() { careDialog.hidden = true; const returnFocus = careReturnFocus; careAction = null; careReturnFocus = null; if (returnFocus && document.contains(returnFocus)) returnFocus.focus(); }
function openCareDialog(action, trigger) { careAction = action; careReturnFocus = trigger; const deletingAll = action === 'clear'; careTitle.textContent = deletingAll ? 'Clear every garden?' : 'Forget this garden?'; careCopy.textContent = deletingAll ? 'This removes all local gardens, trail notes, and saved curiosities from this device. Nothing is sent anywhere.' : 'This removes the selected garden from this device. Its saved curiosities remain in the compost pile unless you remove them separately.'; careConfirm.textContent = deletingAll ? 'Clear local data' : 'Forget garden'; careDialog.hidden = false; careConfirm.focus(); }
const safeConfirmCareAction = wrapWithErrorBoundary(confirmCareAction, { category: ERROR_CATEGORIES.MESSAGING, function: 'confirmCareAction', swallow: true });
async function confirmCareAction() { const action = careAction; const sessionId = selectedSessionId; closeCareDialog(); if (action === 'forget' && sessionId) { await message('DELETE_SESSION', { sessionId }); selectedSessionId = null; selectedNodeId = null; await renderSafely(); } else if (action === 'clear') { await message('CLEAR_DATA'); selectedSessionId = null; selectedNodeId = null; await renderSafely(); } }
careCancel.addEventListener('click', wrapWithErrorBoundary(closeCareDialog, { category: ERROR_CATEGORIES.UI_RENDER, function: 'careCancel.click', swallow: true }));
careConfirm.addEventListener('click', safeConfirmCareAction);
careDialog.addEventListener('click', wrapWithErrorBoundary(event => { if (event.target === careDialog) closeCareDialog(); }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'careDialog.click', swallow: true }));
document.addEventListener('keydown', wrapWithErrorBoundary(event => { if (careDialog.hidden) return; if (event.key === 'Escape') { event.preventDefault(); closeCareDialog(); } if (event.key === 'Tab') { const focusables = [careCancel, careConfirm]; const index = focusables.indexOf(document.activeElement); if (event.shiftKey && index <= 0) { event.preventDefault(); focusables[focusables.length - 1].focus(); } else if (!event.shiftKey && (index === focusables.length - 1 || index < 0)) { event.preventDefault(); focusables[0].focus(); } } }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'document.keydown', swallow: true }));
const safeSelectNode = wrapWithErrorBoundary(selectNode, { category: ERROR_CATEGORIES.UI_RENDER, function: 'selectNode', swallow: true });
async function selectNode(nodeId, returnFocus = false) { selectedNodeId = nodeId; await renderSafely(); if (returnFocus && !detail.hidden) detail.focus({ preventScroll: true }); }
sessionSelect.addEventListener('change', wrapWithErrorBoundary(() => { selectedSessionId = sessionSelect.value; selectedNodeId = null; renderSafely(); }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'sessionSelect.change', swallow: true }));
svg.addEventListener('click', wrapWithErrorBoundary(event => { const node = event.target.closest?.('[data-node-id]'); if (node) safeSelectNode(node.dataset.nodeId); }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'svg.click', swallow: true }));
svg.addEventListener('keydown', wrapWithErrorBoundary(event => { const node = event.target.closest?.('[data-node-id]'); if (node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); safeSelectNode(node.dataset.nodeId, true); } }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'svg.keydown', swallow: true }));
svg.addEventListener('mouseover', wrapWithErrorBoundary(event => { const node = event.target.closest?.('[data-node-id]'); if (node) node.classList.add('hovered'); }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'svg.mouseover', swallow: true }));
svg.addEventListener('mouseout', wrapWithErrorBoundary(event => { const node = event.target.closest?.('[data-node-id]'); if (node) node.classList.remove('hovered'); }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'svg.mouseout', swallow: true }));
detail.addEventListener('click', wrapWithErrorBoundary(async event => { const action = event.target.dataset.branchAction; if (!action) return; if (action === 'close') { selectedNodeId = null; await renderSafely(); return; } if (!selectedSessionId || !selectedNodeId) return; await message('PRUNE_NODE', { sessionId: selectedSessionId, nodeId: selectedNodeId, toCompost: action === 'compost' }); await renderSafely(); }, { category: ERROR_CATEGORIES.MESSAGING, function: 'detail.click', swallow: true }));
document.querySelector('#compost').addEventListener('click', wrapWithErrorBoundary(async event => { const id = event.target.dataset.id; if (id) { await message('DELETE_COMPOST', { id }); await renderSafely(); } }, { category: ERROR_CATEGORIES.MESSAGING, function: 'compost.click', swallow: true }));
document.querySelector('#forget').addEventListener('click', wrapWithErrorBoundary(event => { if (selectedSessionId) openCareDialog('forget', event.currentTarget); }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'forget.click', swallow: true }));
document.querySelector('#clear').addEventListener('click', wrapWithErrorBoundary(event => openCareDialog('clear', event.currentTarget), { category: ERROR_CATEGORIES.UI_RENDER, function: 'clear.click', swallow: true }));
document.querySelector('#theme-toggle').addEventListener('click', wrapWithErrorBoundary(() => { const html = document.documentElement; const current = html.getAttribute('data-theme') || 'light'; const next = current === 'light' ? 'dark' : 'light'; html.setAttribute('data-theme', next); try { localStorage.setItem('focus-forest-theme', next); } catch (e) { /* storage may be unavailable */ } }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'theme-toggle.click', swallow: true }));

// Load saved theme preference on startup
(function loadThemePreference() {
  try {
    const saved = localStorage.getItem('focus-forest-theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch (e) { /* storage may be unavailable */ }
})();
renderSafely();
