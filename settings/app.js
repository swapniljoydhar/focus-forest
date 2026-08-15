async function message(type, payload = {}) { return chrome.runtime.sendMessage({ type, ...payload }); }
const gentle = document.querySelector('#gentle'); const choice = document.querySelector('#choice'); const motion = document.querySelector('#motion'); const status = document.querySelector('#status'); const save = document.querySelector('#save');
const original = { gentleDepth: 4, choiceDepth: 5, ambientMotion: true }; let saved = { ...original }; let ready = false;
function currentSettings() { return { gentleDepth: Number(gentle.value), choiceDepth: Number(choice.value), ambientMotion: motion.checked }; }
function markDirty() { if (!ready) return; const dirty = JSON.stringify(currentSettings()) !== JSON.stringify(saved); save.disabled = !dirty; if (dirty) status.textContent = 'You have a rhythm change ready to save.'; }
function sync() {
  const g = Number(gentle.value);
  if (Number(choice.value) <= g) choice.value = String(Math.min(10, g + 1));
  const c = Number(choice.value);
  document.querySelector('#gentle-value').textContent = g;
  document.querySelector('#choice-value').textContent = c;
  document.querySelector('#gentle-preview-label').textContent = `Quieter at ${g}`;
  document.querySelector('#choice-preview-label').textContent = `Choice at ${c}`;
  document.querySelector('#preview-gentle').style.left = `${(g / 10) * 100}%`;
  document.querySelector('#preview-choice').style.left = `${(c / 10) * 100}%`;
  document.querySelector('#preview-copy').textContent = g <= 3 ? 'The forest will whisper early, useful for short and deliberate paths.' : c >= 7 ? 'There is more room to explore before the forest offers a choice.' : 'The path stays open. The forest simply becomes easier to notice.';
  markDirty();
}
async function load() { try { const snap = await message('GET_SNAPSHOT'); const settings = snap.settings || original; saved = { gentleDepth: settings.gentleDepth || original.gentleDepth, choiceDepth: settings.choiceDepth || original.choiceDepth, ambientMotion: settings.ambientMotion !== false }; gentle.value = saved.gentleDepth; choice.value = saved.choiceDepth; motion.checked = saved.ambientMotion; ready = true; sync(); save.disabled = true; status.textContent = 'Your current rhythm is already tending the forest.'; } catch { status.textContent = 'The forest could not read its local rhythm. Try again.'; } }
gentle.addEventListener('input', sync); choice.addEventListener('input', sync); motion.addEventListener('change', markDirty);
save.addEventListener('click', async () => { sync(); try { await message('UPDATE_SETTINGS', { settings: currentSettings() }); saved = currentSettings(); save.disabled = true; status.textContent = 'Your rhythm is tending the forest now.'; } catch { status.textContent = 'The rhythm could not be saved. Nothing was changed.'; } });
document.querySelector('#reset').addEventListener('click', async () => { try { await message('UPDATE_SETTINGS', { settings: original }); saved = { ...original }; gentle.value = original.gentleDepth; choice.value = original.choiceDepth; motion.checked = original.ambientMotion; sync(); save.disabled = true; status.textContent = 'The original rhythm has returned.'; } catch { status.textContent = 'The original rhythm could not be restored.'; } });
load();
