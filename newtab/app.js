const form = document.querySelector('#mission-form');
const input = document.querySelector('#mission');
const count = document.querySelector('#count');
const status = document.querySelector('#status');
const resume = document.querySelector('#resume');
const browse = document.querySelector('#browse');

async function message(type, payload = {}) { return chrome.runtime.sendMessage({ type, ...payload }); }
function updateCount() { count.textContent = `${input.value.length}/140`; }

async function init() {
  const snap = await message('GET_SNAPSHOT');
  if (snap.session) {
    resume.hidden = false;
    resume.textContent = `Resume current garden · “${snap.session.mission}”`;
  }
  input.focus();
}

function initSafely() { return init().catch(() => { status.textContent = 'The forest could not read its local garden. You can still browse without a mission.'; input.focus(); }); }

input.addEventListener('input', updateCount);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const mission = input.value.trim();
  if (!mission) return;
  await message('START_MISSION', { mission, tab: { url: location.href, title: 'Focus Forest' } });
  status.textContent = 'Seed planted. Your next page becomes the root; links grow branches. Nothing is blocked.';
  input.value = '';
  updateCount();
  input.blur();
});

resume.addEventListener('click', async () => { await message('GO_HOME'); status.textContent = 'Your current garden is ready in its origin tab.'; });
browse.addEventListener('click', async () => { await message('END_MISSION', { reason: 'browse_without_mission' }); window.location.href = 'https://www.google.com'; });

updateCount();
initSafely();
