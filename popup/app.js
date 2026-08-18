import { logError, wrapWithErrorBoundary, ERROR_CATEGORIES } from '../shared/error-tracing.js';

async function message(type, payload = {}) { return chrome.runtime.sendMessage({ type, ...payload }); }
const empty = document.querySelector('#empty'); const active = document.querySelector('#active'); const completion = document.querySelector('#completion'); const footer = document.querySelector('#popup-footer');
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
let latest = null; let ritualReturnFocus = null;

function reflectionFor(session) {
  const nodes = session.nodes || [];
  const branches = nodes.filter((node) => node.depth > 0).length;
  const neutral = nodes.filter((node) => node.relationshipConfidence === 'external').length;
  const saved = session.events.filter((event) => event.type === 'composted').length;
  const deepest = Math.max(0, ...nodes.map((node) => node.depth));
  const pages = nodes.length === 1 ? 'one page' : `${nodes.length} pages`;
  const branchLine = branches ? `The path grew through ${branches} ${branches === 1 ? 'branch' : 'branches'}.` : 'The path stayed close to its root.';
  const neutralLine = neutral ? `You also crossed ${neutral} unlinked ${neutral === 1 ? 'path' : 'paths'} without needing to call them a mistake.` : 'The path stayed close to the links you chose.';
  const savedLine = saved ? `${saved} ${saved === 1 ? 'curiosity is' : 'curiosities are'} resting in the compost pile.` : 'Nothing needed to be set aside for later.';
  return { deepest, copy: `You began with “${session.mission}”. ${branchLine} You grew through ${pages}, reached a deepest branch of ${deepest}, and ${savedLine} ${neutralLine}` };
}

function setRitual(open) { completion.hidden = !open; footer.hidden = open; if (open) { document.querySelector('#complete').focus(); } else if (ritualReturnFocus) { ritualReturnFocus.focus(); } }

const safeRender = wrapWithErrorBoundary(render, { category: ERROR_CATEGORIES.UI_RENDER, function: 'render' });
async function render() {
  const snap = await message('GET_SNAPSHOT'); latest = snap.session; const session = snap.session;
  empty.hidden = Boolean(session); active.hidden = !session; setRitual(false); footer.hidden = Boolean(session) ? false : true;
  if (!session) return;
  const reflection = reflectionFor(session); const current = session.nodes.filter((node) => !node.closedAt).at(-1); const depth = current?.depth || 0;
  const thresholds = snap.thresholds || { DESATURATE: 4, INTERRUPT: 5 };
  const state = session.interventionPaused ? 'Forest resting for this mission.' : depth >= thresholds.INTERRUPT ? 'This path is getting very deep.' : depth >= thresholds.DESATURATE ? 'This branch is getting long.' : depth > 0 ? `A healthy branch, ${depth} ${depth === 1 ? 'step' : 'steps'} from the root.` : 'Growing from the root of your mission.';
  document.querySelector('#mission').textContent = session.mission; document.querySelector('#state').textContent = state;
  document.querySelector('#depth-label').textContent = `Deepest branch ${reflection.deepest}`; document.querySelector('#meter-fill').style.width = `${clamp((reflection.deepest / thresholds.INTERRUPT) * 100, 4, 100)}%`;
  document.querySelector('#nodes').textContent = session.nodes.length; document.querySelector('#compost').textContent = snap.state.compostItems.length;
  document.querySelector('#nodes').textContent = session.nodes.length; document.querySelector('#compost').textContent = snap.state.compostItems.length;
  const pause = document.querySelector('#pause'); pause.textContent = session.interventionPaused ? 'Resume the forest' : 'Pause interventions'; pause.setAttribute('aria-pressed', String(Boolean(session.interventionPaused)));
}

function renderSafely() { return safeRender().catch((error) => { logError(error, { category: ERROR_CATEGORIES.UI_RENDER, function: 'renderSafely' }); latest = null; active.hidden = true; completion.hidden = true; footer.hidden = true; empty.hidden = false; }); }

document.querySelector('#return').addEventListener('click', wrapWithErrorBoundary(() => message('GO_HOME'), { category: ERROR_CATEGORIES.MESSAGING, function: 'return.click', swallow: true }));
document.querySelector('#pause').addEventListener('click', wrapWithErrorBoundary(async () => { const snap = await message('GET_SNAPSHOT'); if (!snap?.session) return; await message('PAUSE_INTERVENTION', { paused: !snap.session.interventionPaused }); await renderSafely(); }, { category: ERROR_CATEGORIES.MESSAGING, function: 'pause.click', swallow: true }));
document.querySelector('#dashboard').addEventListener('click', wrapWithErrorBoundary(() => chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') }), { category: ERROR_CATEGORIES.UI_RENDER, function: 'dashboard.click', swallow: true }));
document.querySelector('#settings').addEventListener('click', wrapWithErrorBoundary(() => chrome.runtime.openOptionsPage(), { category: ERROR_CATEGORIES.UI_RENDER, function: 'settings.click', swallow: true }));
document.querySelector('#end').addEventListener('click', wrapWithErrorBoundary(() => { if (!latest) return; ritualReturnFocus = document.querySelector('#end'); const reflection = reflectionFor(latest); document.querySelector('#completion-copy').textContent = reflection.copy; document.querySelector('#completion-title').textContent = reflection.deepest >= 4 ? 'This garden has a long path to remember.' : 'This garden can rest now.'; active.hidden = true; setRitual(true); }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'end.click', swallow: true }));
document.querySelector('#complete').addEventListener('click', wrapWithErrorBoundary(async () => { await message('END_MISSION', { reason: 'user_ended' }); ritualReturnFocus = null; await renderSafely(); }, { category: ERROR_CATEGORIES.MESSAGING, function: 'complete.click', swallow: true }));
document.querySelector('#keep').addEventListener('click', wrapWithErrorBoundary(() => { active.hidden = false; setRitual(false); }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'keep.click', swallow: true }));
document.querySelector('#review').addEventListener('click', wrapWithErrorBoundary(() => chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') }), { category: ERROR_CATEGORIES.UI_RENDER, function: 'review.click', swallow: true }));
document.addEventListener('keydown', wrapWithErrorBoundary((event) => { if (event.key === 'Escape' && !completion.hidden) { active.hidden = false; setRitual(false); } }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'keydown', swallow: true }));
renderSafely();
