(() => {
  if (location.protocol === 'chrome-extension:' || location.protocol === 'chrome:' || location.protocol === 'edge:') return;
  const root = document.createElement('div');
  root.id = 'focus-forest-root';
  document.documentElement.appendChild(root);
  const shadow = root.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<link rel="stylesheet" href="${chrome.runtime.getURL('content/content.css')}"><div class="chip" role="group" aria-label="Focus Forest companion" hidden><span class="chip-seed" aria-hidden="true"></span><span class="chip-copy"><span class="chip-kicker">current mission</span><strong class="mission"></strong><small class="state"></small></span><button class="chip-action" aria-label="Pause Focus Forest">Pause</button></div><div class="modal-backdrop" hidden><section class="choice-sheet" role="dialog" aria-modal="true" aria-labelledby="ff-title"><div class="sheet-mark" aria-hidden="true"><span></span><span></span><span></span></div><p class="sheet-eyebrow">A moment to choose</p><h2 id="ff-title">You may have wandered a little.</h2><p class="sheet-copy"></p><div class="sheet-actions"><button data-action="home" class="choice primary"><span class="choice-icon">↶</span><span><strong>Return to my mission</strong><small>Go back to where this session began.</small></span></button><button data-action="compost" class="choice"><span class="choice-icon">⌁</span><span><strong>Save this for later</strong><small>Put this curiosity in your compost pile.</small></span></button><button data-action="mission" class="choice"><span class="choice-icon">＋</span><span><strong>Start a new mission</strong><small>Let this become the thing you are here to do.</small></span></button></div></section></div>`;

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
    if (event.button !== 0 || event.defaultPrevented) return;
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
