import { logError, wrapWithErrorBoundary, ERROR_CATEGORIES } from '../shared/error-tracing.js';

const form = document.querySelector('#mission-form');
const input = document.querySelector('#mission');
const count = document.querySelector('#count');
const status = document.querySelector('#status');
const resume = document.querySelector('#resume');
const browse = document.querySelector('#browse');

async function message(type, payload = {}) { return chrome.runtime.sendMessage({ type, ...payload }); }
function updateCount() { count.textContent = `${input.value.length}/140`; }

const safeInit = wrapWithErrorBoundary(init, { category: ERROR_CATEGORIES.UI_RENDER, function: 'init' });
async function init() {
  const snap = await message('GET_SNAPSHOT');
  if (snap.session) {
    resume.hidden = false;
    resume.textContent = `Resume current garden · “${snap.session.mission}”`;
  }
  input.focus();
}

function initSafely() { return safeInit().catch((error) => { logError(error, { category: ERROR_CATEGORIES.UI_RENDER, function: 'initSafely' }); status.textContent = 'The forest could not read its local garden. You can still browse without a mission.'; input.focus(); }); }

input.addEventListener('input', wrapWithErrorBoundary(updateCount, { category: ERROR_CATEGORIES.UI_RENDER, function: 'updateCount', swallow: true }));
form.addEventListener('submit', wrapWithErrorBoundary(async (event) => {
  event.preventDefault();
  const mission = input.value.trim();
  if (!mission) return;
  await message('START_MISSION', { mission, tab: { url: location.href, title: 'Focus Forest' } });
  status.textContent = 'Seed planted. Your next page becomes the root; links grow branches. Nothing is blocked.';
  input.value = '';
  updateCount();
  input.blur();
}, { category: ERROR_CATEGORIES.MESSAGING, function: 'form.submit', swallow: true }));

resume.addEventListener('click', wrapWithErrorBoundary(async () => { await message('GO_HOME'); status.textContent = 'Your current garden is ready in its origin tab.'; }, { category: ERROR_CATEGORIES.MESSAGING, function: 'resume.click', swallow: true }));
browse.addEventListener('click', wrapWithErrorBoundary(async () => { await message('END_MISSION', { reason: 'browse_without_mission' }); resume.hidden = true; status.textContent = 'No mission set. Browse freely \u2014 the forest stays quiet until you plant again.'; input.focus(); }, { category: ERROR_CATEGORIES.MESSAGING, function: 'browse.click', swallow: true }));

updateCount();
initSafely();
