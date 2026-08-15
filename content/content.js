(() => {
  if (location.protocol === 'chrome-extension:' || location.protocol === 'chrome:' || location.protocol === 'edge:') return;
  const root = document.createElement('div');
  root.id = 'focus-forest-root';
  document.documentElement.appendChild(root);
  const shadow = root.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `:host{all:initial}.chip{position:fixed;z-index:2147483646;top:16px;right:18px;display:flex;align-items:center;gap:10px;max-width:min(360px,calc(100vw - 32px));padding:9px 12px 9px 10px;border:1px solid rgba(74,104,71,.18);border-radius:16px;background:linear-gradient(120deg,rgba(250,249,242,.95),rgba(242,247,238,.92));box-shadow:0 6px 24px rgba(42,65,41,.1);backdrop-filter:blur(12px);font:13px/1.2 ui-sans-serif,system-ui,sans-serif;color:#29432d}.chip:before{content:"";position:absolute;right:8px;top:3px;width:20px;height:12px;border-radius:100% 0 100% 0;background:rgba(116,158,106,.08);transform:rotate(34deg);pointer-events:none}.chip[hidden],.modal-backdrop[hidden]{display:none}.chip-seed{position:relative;width:23px;height:23px;flex:none;border-radius:50%;background:#e5eee1}.chip-seed:after{content:"";position:absolute;left:8px;top:4px;width:6px;height:11px;border-radius:100% 0 100% 0;background:#6f9869;transform:rotate(35deg)}.chip-copy{display:grid;gap:2px;min-width:0}.chip-kicker{color:#8a9a84;font-size:8px;font-weight:800;letter-spacing:.12em;line-height:1;text-transform:uppercase}.chip-copy strong{display:block;max-width:225px;overflow:hidden;color:#385b3c;font-size:12px;font-weight:750;line-height:1.15;text-overflow:ellipsis;white-space:nowrap}.chip-copy small{display:block;margin-top:0;color:#7f907b;font-size:11px;line-height:1.2}.chip-action{border:0;border-left:1px solid #e0e8dc;margin-left:3px;min-width:52px;padding:4px 0 4px 11px;background:none;color:#64805f;font:600 10px/1.2 ui-sans-serif,system-ui,sans-serif;cursor:pointer}.chip-action:hover,.chip-action:focus{text-decoration:underline;outline:none}.chip-action:focus-visible{outline:2px solid #577f58;outline-offset:3px;text-decoration:none}.ff-soft-drift{filter:saturate(.78)}#focus-forest-root{filter:none!important}.modal-backdrop{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,rgba(232,242,224,.32),rgba(38,55,38,.3));backdrop-filter:blur(3px);font-family:ui-sans-serif,system-ui,sans-serif}.choice-sheet{width:min(470px,calc(100vw - 34px));padding:31px 31px 27px;border:1px solid rgba(89,114,82,.16);border-radius:26px;background:#fbfaf4;color:#29432d;box-shadow:0 28px 90px rgba(28,47,29,.25)}.sheet-mark{height:27px;display:flex;align-items:end;gap:4px;margin-bottom:15px}.sheet-mark span{display:block;width:6px;border-radius:8px;background:#78a171}.sheet-mark span:nth-child(1){height:14px;transform:rotate(-22deg)}.sheet-mark span:nth-child(2){height:25px}.sheet-mark span:nth-child(3){height:18px;transform:rotate(22deg)}.sheet-eyebrow{margin:0 0 8px;text-transform:uppercase;letter-spacing:.16em;color:#7b9076;font-size:10px;font-weight:800}.choice-sheet h2{margin:0;font:500 28px/1.1 Georgia,serif;letter-spacing:-.025em;color:#29432d}.sheet-copy{margin:15px 0 23px;color:#697968;font-size:14px;line-height:1.58}.sheet-copy q{color:#486a4a;font-weight:650}.sheet-actions{display:grid;gap:8px}.choice{display:flex;align-items:center;gap:12px;width:100%;padding:12px 13px;border:1px solid #dce6d8;border-radius:13px;background:#f4f6ee;color:#3c5c3e;text-align:left;cursor:pointer}.choice:hover,.choice:focus{border-color:#9bb596;background:#eef4ea;outline:3px solid rgba(108,151,102,.16)}.choice.primary{border-color:#668c64;background:#577f58;color:white}.choice.primary:hover,.choice.primary:focus{background:#4c754f}.choice-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:rgba(255,255,255,.5);font-size:20px;font-weight:400}.choice.primary .choice-icon{background:rgba(255,255,255,.18)}.choice strong{display:block;font:700 13px ui-sans-serif,system-ui,sans-serif}.choice small{display:block;margin-top:3px;opacity:.76;font:11px ui-sans-serif,system-ui,sans-serif}.choice.primary small{opacity:.85}@media(max-width:600px){.chip{top:10px;right:10px;max-width:calc(100vw - 20px)}.chip-kicker{font-size:7px}.chip-copy strong{font-size:11px}.chip-copy small{font-size:10px}}@media(max-width:520px){.choice-sheet{padding:25px 20px 21px}.choice-sheet h2{font-size:24px}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
  shadow.append(style);
  shadow.innerHTML += `<div class="chip" role="group" aria-label="Focus Forest companion" hidden><span class="chip-seed" aria-hidden="true"></span><span class="chip-copy"><span class="chip-kicker">current mission</span><strong class="mission"></strong><small class="state"></small></span><button class="chip-action" aria-label="Pause Focus Forest">Pause</button></div><div class="modal-backdrop" hidden><section class="choice-sheet" role="dialog" aria-modal="true" aria-labelledby="ff-title"><div class="sheet-mark" aria-hidden="true"><span></span><span></span><span></span></div><p class="sheet-eyebrow">A moment to choose</p><h2 id="ff-title">You may have wandered a little.</h2><p class="sheet-copy"></p><div class="sheet-actions"><button data-action="home" class="choice primary"><span class="choice-icon">↶</span><span><strong>Return to my mission</strong><small>Go back to where this session began.</small></span></button><button data-action="compost" class="choice"><span class="choice-icon">⌁</span><span><strong>Save this for later</strong><small>Put this curiosity in your compost pile.</small></span></button><button data-action="mission" class="choice"><span class="choice-icon">＋</span><span><strong>Start a new mission</strong><small>Let this become the thing you are here to do.</small></span></button></div></section></div>`;

  const chip = shadow.querySelector('.chip');
  const backdrop = shadow.querySelector('.modal-backdrop');
  const sheetCopy = shadow.querySelector('.sheet-copy');
  const missionEl = shadow.querySelector('.mission');
  const stateEl = shadow.querySelector('.state');
  let current = null;
  let lastUrl = location.href;

  function send(type, payload = {}) { return chrome.runtime.sendMessage({ type, ...payload }); }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c])); }

  function update(view) {
    current = view?.session || null;
    if (!current?.node) { chip.hidden = true; backdrop.hidden = true; document.documentElement.classList.remove('ff-soft-drift'); return; }
    const depth = current.node.depth || 0;
    const paused = current.interventionPaused;
    const thresholds = view?.thresholds || { DESATURATE: 4, INTERRUPT: 5 };
    const stateKind = paused ? 'resting' : depth >= thresholds.INTERRUPT ? 'interrupt' : depth >= thresholds.DESATURATE ? 'drift' : depth > 0 ? 'branch' : 'root'; const state = paused ? 'Forest resting' : depth >= thresholds.INTERRUPT ? 'You may be wandering' : depth >= thresholds.DESATURATE ? 'This branch is getting long' : depth > 0 ? `Related branch · ${depth} ${depth === 1 ? 'step' : 'steps'} away` : 'Growing from this mission';
    missionEl.textContent = current.mission;
    stateEl.textContent = state;
    chip.dataset.state = stateKind;
    chip.setAttribute('aria-label', `Focus Forest companion. Mission: ${current.mission}. ${state}.`);
    chip.hidden = false;
    chip.querySelector('.chip-action').textContent = paused ? 'Resume' : 'Pause';
    chip.querySelector('.chip-action').setAttribute('aria-label', paused ? 'Resume Focus Forest' : 'Pause Focus Forest');
    document.documentElement.classList.toggle('ff-soft-drift', !paused && depth >= thresholds.DESATURATE && depth < thresholds.INTERRUPT);
    if (!paused && depth >= thresholds.INTERRUPT && backdrop.dataset.shownFor !== location.href) showChoiceSheet(depth);
  }

  function showChoiceSheet(depth) {
    backdrop.dataset.shownFor = location.href;
    sheetCopy.innerHTML = `You started with <q>${escapeHtml(current?.mission || '')}</q>. You are now <strong>${depth} branches away</strong>, looking at <q>${escapeHtml(document.title || location.hostname)}</q>. That may be exactly where you meant to go — or it may be a path that opened by itself.`;
    backdrop.hidden = false;
    shadow.querySelector('[data-action="home"]').focus();
  }

  function hideChoiceSheet() { backdrop.hidden = true; }

  shadow.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'home') { hideChoiceSheet(); await send('GO_HOME'); }
    if (action === 'compost') { await send('COMPOST', { url: location.href, title: document.title }); hideChoiceSheet(); }
    if (action === 'mission') { await send('END_MISSION', { reason: 'mission_changed' }); hideChoiceSheet(); window.location.href = chrome.runtime.getURL('newtab/index.html'); }
    if (event.target.closest('.chip-action')) { await send('PAUSE_INTERVENTION', { paused: !current?.interventionPaused }); await refresh(false); }
  });

  shadow.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !backdrop.hidden) { hideChoiceSheet(); return; }
    if (event.key !== 'Tab' || backdrop.hidden) return;
    const focusable = [...backdrop.querySelectorAll('button')];
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && shadow.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && shadow.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  document.addEventListener('click', (event) => {
    if (!event.isTrusted || event.button !== 0 || event.defaultPrevented) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    let target;
    try { target = new URL(link.href, location.href); } catch { return; }
    if (!['http:', 'https:'].includes(target.protocol) || (target.href.split('#')[0] === location.href.split('#')[0] && target.hash)) return;
    const opensElsewhere = link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
    send('LINK_CLICK', { url: target.href, title: link.textContent?.trim() || target.hostname, targetBlank: opensElsewhere });
  }, true);

  async function refresh(observe = true) {
    try {
      if (observe) await send('OBSERVE_PAGE', { url: location.href, title: document.title });
      update(await send('GET_ACTIVE_VIEW'));
    } catch { update(null); }
  }

  let watchTimer = 0;
  function scheduleWatch() {
    window.clearTimeout(watchTimer);
    if (document.hidden) return;
    watchTimer = window.setTimeout(() => {
      if (location.href !== lastUrl) { lastUrl = location.href; backdrop.removeAttribute('data-shown-for'); refresh(true); }
      scheduleWatch();
    }, 3200);
  }

  const onNavigation = () => { if (location.href !== lastUrl) { lastUrl = location.href; backdrop.removeAttribute('data-shown-for'); refresh(true); } };
  window.addEventListener('popstate', onNavigation, { passive: true });
  window.addEventListener('pageshow', () => refresh(false), { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.clearTimeout(watchTimer); else { refresh(false); scheduleWatch(); } });
  refresh(true);
  scheduleWatch();
})();
