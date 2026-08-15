const form = document.querySelector('#mission-form');
const input = document.querySelector('#mission');
const count = document.querySelector('#count');
const status = document.querySelector('#status');
const resume = document.querySelector('#resume');
const browse = document.querySelector('#browse');
const shortcutGrid = document.querySelector('#shortcut-grid');
const shortcutEmpty = document.querySelector('#shortcut-empty');
const addShortcut = document.querySelector('#add-shortcut');
const shortcutDialog = document.querySelector('#shortcut-dialog');
const shortcutForm = document.querySelector('#shortcut-form');
const shortcutDialogTitle = document.querySelector('#shortcut-dialog-title');
const shortcutLabel = document.querySelector('#shortcut-label');
const shortcutUrl = document.querySelector('#shortcut-url');
const shortcutError = document.querySelector('#shortcut-error');
const shortcutCancel = document.querySelector('#shortcut-cancel');

let editingShortcutId = null;
let shortcuts = [];
let shortcutReturnFocus = null;

async function message(type, payload = {}) { return chrome.runtime.sendMessage({ type, ...payload }); }
function updateCount() { count.textContent = `${input.value.length}/140`; }
function escapeHtml(value) { return String(value || '').replace(/[&<>\'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c])); }
function safeShortcutUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.href.slice(0, 1024);
  } catch { return null; }
}
function shortcutHost(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } }
function shortcutInitial(item) { const source = item.label || shortcutHost(item.url); return escapeHtml(source.trim().charAt(0).toUpperCase() || '•'); }
function renderShortcuts() {
  shortcutGrid.innerHTML = shortcuts.map((item) => `<article class="shortcut-tile"><a class="shortcut-link" href="${escapeHtml(item.url)}" aria-label="Open ${escapeHtml(item.label)}"><span class="shortcut-orb" aria-hidden="true">${shortcutInitial(item)}</span><span class="shortcut-label">${escapeHtml(item.label)}</span><small>${escapeHtml(shortcutHost(item.url))}</small></a><div class="shortcut-actions"><button type="button" data-edit-shortcut="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(item.label)}">Edit</button><button type="button" data-delete-shortcut="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.label)}">Remove</button></div></article>`).join('');
  shortcutEmpty.hidden = shortcuts.length > 0;
  shortcutGrid.hidden = shortcuts.length === 0;
}
function closeShortcutDialog() { shortcutDialog.hidden = true; shortcutError.textContent = ''; editingShortcutId = null; const target = shortcutReturnFocus; shortcutReturnFocus = null; if (target && document.contains(target)) target.focus(); }
function openShortcutDialog(shortcut = null, trigger = addShortcut) { editingShortcutId = shortcut?.id || null; shortcutDialogTitle.textContent = shortcut ? 'Tend this path' : 'Add a quick path'; shortcutLabel.value = shortcut?.label || ''; shortcutUrl.value = shortcut?.url || ''; shortcutError.textContent = ''; shortcutReturnFocus = trigger; shortcutDialog.hidden = false; shortcutLabel.focus(); }
async function loadShortcuts() { try { shortcuts = await message('GET_SHORTCUTS') || []; renderShortcuts(); } catch { shortcuts = []; renderShortcuts(); } }

async function init() {
  const snap = await message('GET_SNAPSHOT');
  if (snap.session) { resume.hidden = false; resume.textContent = `Resume current garden · “${snap.session.mission}”`; }
  await loadShortcuts();
  input.focus();
}

input.addEventListener('input', updateCount);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const mission = input.value.trim();
  if (!mission) return;
  try {
    await message('START_MISSION', { mission, tab: { url: location.href, title: 'Focus Forest' } });
    status.textContent = 'Seed planted. Your next page becomes the root; links grow branches. Nothing is blocked.';
    input.value = '';
    updateCount();
    input.blur();
  } catch { status.textContent = 'The seed could not be planted yet. Your clearing is still here.'; }
});

resume.addEventListener('click', async () => { try { await message('GO_HOME'); status.textContent = 'Your current garden is ready in its origin tab.'; } catch { status.textContent = 'Your garden could not be opened yet.'; } });
browse.addEventListener('click', async () => { await message('END_MISSION', { reason: 'browse_without_mission' }); window.location.href = 'https://www.google.com'; });
addShortcut.addEventListener('click', () => openShortcutDialog());
shortcutCancel.addEventListener('click', closeShortcutDialog);
shortcutDialog.addEventListener('click', (event) => { if (event.target === shortcutDialog) closeShortcutDialog(); });
shortcutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = safeShortcutUrl(shortcutUrl.value);
  if (!url) { shortcutError.textContent = 'Use a full http:// or https:// address.'; shortcutUrl.focus(); return; }
  const label = shortcutLabel.value.trim() || shortcutHost(url);
  const saved = await message('SAVE_SHORTCUT', { shortcut: { id: editingShortcutId, label, url } });
  if (saved?.capped) { shortcutError.textContent = 'Your clearing is full. Remove one path before adding another.'; return; }
  closeShortcutDialog();
  await loadShortcuts();
});
shortcutGrid.addEventListener('click', async (event) => {
  const editId = event.target.closest('[data-edit-shortcut]')?.dataset.editShortcut;
  const deleteId = event.target.closest('[data-delete-shortcut]')?.dataset.deleteShortcut;
  if (editId) { event.preventDefault(); const item = shortcuts.find((shortcut) => shortcut.id === editId); if (item) openShortcutDialog(item, event.target); return; }
  if (deleteId) { event.preventDefault(); await message('DELETE_SHORTCUT', { id: deleteId }); await loadShortcuts(); }
});
document.addEventListener('keydown', (event) => { if (shortcutDialog.hidden) return; if (event.key === 'Escape') { event.preventDefault(); closeShortcutDialog(); } if (event.key === 'Tab') { const focusable = [shortcutLabel, shortcutUrl, shortcutCancel, shortcutForm.querySelector('.shortcut-save')]; const first = focusable[0]; const last = focusable.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });

updateCount();
init();
