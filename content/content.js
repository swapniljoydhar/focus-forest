(() => {
  if (location.protocol === 'chrome-extension:' || location.protocol === 'chrome:' || location.protocol === 'edge:') return;

  // Minimal error tracing for content script
  const ERROR_CATEGORIES = { CONTENT_SCRIPT: 'content_script', MESSAGING: 'messaging', UI_RENDER: 'ui_render', UNKNOWN: 'unknown' };
  const ERROR_SEVERITY = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };
  function logError(error, context = {}) {
    const trace = {
      id: `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      message: error?.message || String(error),
      stack: error?.stack || (new Error()).stack,
      category: context.category || ERROR_CATEGORIES.UNKNOWN,
      severity: context.severity || ERROR_SEVERITY.MEDIUM,
      context: { url: location.href, userAgent: navigator.userAgent, ...context }
    };
    console.error('[Focus Forest Error]', JSON.stringify(trace, null, 2));
    return trace;
  }
  function wrapWithErrorBoundary(fn, context = {}) {
    return async (...args) => {
      try { return await fn(...args); }
      catch (error) { logError(error, { ...context, category: context.category || ERROR_CATEGORIES.UNKNOWN }); throw error; }
    };
  }

  const root = document.createElement('div');
  root.id = 'focus-forest-root';
  document.documentElement.appendChild(root);
  const shadow = root.attachShadow({ mode: 'closed' });

  // Remote approach: separate style element (better for CSP/maintainability)
  const style = document.createElement('style');
  style.textContent = `:host{all:initial}.chip{position:fixed;z-index:2147483646;top:16px;right:18px;display:flex;align-items:center;gap:10px;max-width:min(360px,calc(100vw - 32px));padding:9px 12px 9px 10px;border:1px solid rgba(74,104,71,.18);border-radius:16px;background:linear-gradient(120deg,rgba(250,249,242,.95),rgba(242,247,238,.92));box-shadow:0 6px 24px rgba(42,65,41,.1);backdrop-filter:blur(12px);font:13px/1.2 ui-sans-serif,system-ui,sans-serif;color:#29432d}.chip:before{content:"";position:absolute;right:8px;top:3px;width:20px;height:12px;border-radius:100% 0 100% 0;background:rgba(116,158,106,.08);transform:rotate(34deg);pointer-events:none}.chip[hidden],.modal-backdrop[hidden]{display:none}.chip-seed{position:relative;width:23px;height:23px;flex:none;border-radius:0;background:transparent}.chip-seed:before{content:"";position:absolute;left:3px;right:3px;bottom:3px;height:4px;border-radius:100%;background:#b9c9ac}.chip-growth-stem{position:absolute;left:10px;bottom:5px;width:3px;height:11px;border-radius:4px;background:#6c9868;transform:scaleY(.7);transform-origin:bottom}.chip-growth-leaf{position:absolute;width:7px;height:11px;border-radius:100% 0 100% 0;background:#6f9869;opacity:0;transform:scale(.25)}.chip-growth-leaf-left{left:4px;top:3px;transform:rotate(-35deg) scale(.25);transform-origin:bottom right}.chip-growth-leaf-right{right:3px;top:1px;transform:rotate(35deg) scale(.25);transform-origin:bottom left}.ff-growth-ritual .chip-growth-stem{animation:ff-grow-stem .42s cubic-bezier(.2,.8,.3,1) both}.ff-growth-ritual .chip-growth-leaf-left{animation:ff-grow-leaf-left .25s .28s ease-out both}.ff-growth-ritual .chip-growth-leaf-right{animation:ff-grow-leaf-right .25s .38s ease-out both}.ff-growth-flash .chip-seed{animation:ff-growth-flicker .16s steps(2,end) 6 both}.ff-growth-flash .chip-growth-leaf{opacity:.95}@keyframes ff-grow-stem{to{transform:scaleY(1)}}@keyframes ff-grow-leaf-left{to{opacity:.95;transform:rotate(-35deg) scale(1)}}@keyframes ff-grow-leaf-right{to{opacity:.95;transform:rotate(35deg) scale(1)}}@keyframes ff-growth-flicker{0%,100%{opacity:1}50%{opacity:.4}}.chip-copy{display:flex;align-items:center;gap:10px;flex:1;min-width:0}.chip-kicker{font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:#6c8c68;white-space:nowrap}.chip-action{appearance:none;border:1px solid rgba(74,104,71,.18);border-radius:10px;background:rgba(250,249,242,.9);color:#29432d;font:inherit;font-size:11px;padding:4px 10px;cursor:pointer;transition:background .15s,border-color .15s}.chip-action:hover{background:rgba(242,247,238,.95);border-color:rgba(74,104,71,.32)}.modal-backdrop{position:fixed;inset:0;background:rgba(42,65,41,.18);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;z-index:2147483647}.choice-sheet{background:rgba(250,249,242,.97);border:1px solid rgba(74,104,71,.12);border-radius:20px;box-shadow:0 12px 40px rgba(42,65,41,.14);max-width:420px;width:100%;padding:22px 20px 18px;position:relative}.sheet-mark{display:flex;gap:6px;margin-bottom:12px}.sheet-mark span{width:8px;height:8px;border-radius:50%;background:#b9c9ac}.sheet-eyebrow{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6c8c68;margin:0 0 6px}.choice-sheet h2{font:600 16px/1.3 ui-sans-serif,system-ui,sans-serif;color:#29432d;margin:0 0 10px}.sheet-copy{font:13px/1.5 ui-sans-serif,system-ui,sans-serif;color:#3d5239;margin:0 0 16px}.sheet-actions{display:flex;flex-direction:column;gap:8px}.choice{appearance:none;border:1px solid rgba(74,104,71,.14);border-radius:14px;background:rgba(255,255,255,.6);color:#29432d;font:inherit;text-align:left;padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .15s,border-color .15s}.choice:hover{background:rgba(242,247,238,.85);border-color:rgba(74,104,71,.28)}.choice.primary{background:rgba(250,249,242,.95);border-color:rgba(74,104,71,.22)}.choice-icon{font-size:16px;width:22px;text-align:center;flex:none}.choice span{display:block}.choice strong{font-weight:600;font-size:13px}.choice small{font-size:11px;color:#6c8c68;margin-top:1px}`;
  shadow.append(style);

  // Remote approach: HTML structure with centered modal choice sheet
  shadow.insertAdjacentHTML('beforeend', `<div class="chip" role="group" aria-label="Focus Forest companion" hidden><span class="chip-seed" aria-hidden="true"><span class="chip-growth-stem"></span><span class="chip-growth-leaf chip-growth-leaf-left"></span><span class="chip-growth-leaf chip-growth-leaf-right"></span></span><span class="chip-copy"><span class="chip-kicker">current mission</span><strong class="mission"></strong><small class="state" aria-live="polite"></small></span><button class="chip-action" aria-label="Pause Focus Forest">Pause</button></div><div class="modal-backdrop" hidden><section class="choice-sheet" role="dialog" aria-modal="true" aria-labelledby="ff-title"><div class="sheet-mark" aria-hidden="true"><span></span><span></span><span></span></div><p class="sheet-eyebrow">A moment to choose</p><h2 id="ff-title">You may have wandered a little.</h2><p class="sheet-copy"></p><div class="sheet-actions"><button data-action="home" class="choice primary"><span class="choice-icon">↶</span><span><strong>Return to my mission</strong><small>Go back to where this session began.</small></span></button><button data-action="compost" class="choice"><span class="choice-icon">⌁</span><span><strong>Save this for later</strong><small>Put this curiosity in your compost pile.</small></span></button><button data-action="mission" class="choice"><span class="choice-icon">＋</span><span><strong>Start a new mission</strong><small>Let this become the thing you are here to do.</small></span></button></div></section></div>`);

  const chip = shadow.querySelector('.chip');
  const backdrop = shadow.querySelector('.modal-backdrop');
  const sheetCopy = shadow.querySelector('.sheet-copy');
  const missionEl = shadow.querySelector('.mission');
  const stateEl = shadow.querySelector('.state');
  let current = null;
  let lastUrl = location.href;
  let ritualToken = 0;
  let ritualTimer = 0;
  let growthAnimationTrigger = 'mission-origin';
  let originRitualPlayed = sessionStorage.getItem('ff-origin-ritual-played') === 'true';

  function send(type, payload = {}) { return chrome.runtime.sendMessage({ type, ...payload }); }

  async function loadSettings() {
    try {
      const snap = await send('GET_SNAPSHOT');
      growthAnimationTrigger = snap.settings?.growthAnimationTrigger || 'mission-origin';
    } catch (error) {
      logError(error, { category: ERROR_CATEGORIES.MESSAGING, function: 'loadSettings' });
      growthAnimationTrigger = 'mission-origin';
    }
  }

  function cancelGrowthRitual() { ritualToken += 1; window.clearTimeout(ritualTimer); ritualTimer = 0; chip.classList.remove('ff-growth-ritual', 'ff-growth-flash'); }
  function waitForGrowth(ms, token) { return new Promise((resolve) => { ritualTimer = window.setTimeout(() => resolve(token === ritualToken), ms); }); }

  const safeShowGrowthRitual = wrapWithErrorBoundary(showGrowthRitual, { category: ERROR_CATEGORIES.UI_RENDER, function: 'showGrowthRitual' });

  // Local's showGrowthRitual with isOrigin parameter (kept)
  async function showGrowthRitual(isOrigin = false) {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return false;
    if (growthAnimationTrigger === 'none') return false;
    if (growthAnimationTrigger === 'mission-origin' && !isOrigin) return false;
    if (growthAnimationTrigger === 'mission-origin' && originRitualPlayed) return false;
    const token = ++ritualToken;
    window.clearTimeout(ritualTimer);
    chip.classList.remove('ff-growth-flash');
    chip.classList.add('ff-growth-ritual');
    stateEl.textContent = 'A small branch is growing';
    stateEl.setAttribute('aria-live', 'polite');
    chip.hidden = false;
    if (!await waitForGrowth(700, token)) return false;
    chip.classList.remove('ff-growth-ritual');
    chip.classList.add('ff-growth-flash');
    if (!await waitForGrowth(1000, token)) return false;
    chip.classList.remove('ff-growth-flash');
    if (isOrigin) {
      originRitualPlayed = true;
      try { sessionStorage.setItem('ff-origin-ritual-played', 'true'); } catch { /* storage may be unavailable */ }
    }
    return true;
  }

  const safeUpdate = wrapWithErrorBoundary(update, { category: ERROR_CATEGORIES.UI_RENDER, function: 'update' });
  async function update(view) {
    const previous = current;
    current = view?.session || null;
    if (!current?.node) { cancelGrowthRitual(); chip.hidden = true; backdrop.hidden = true; document.documentElement.classList.remove('ff-soft-drift'); return; }
    const previousSessionId = previous?.id || null;
    const currentSessionId = current.id || null;
    if (previousSessionId && currentSessionId && previousSessionId !== currentSessionId) {
      originRitualPlayed = false;
      try { sessionStorage.removeItem('ff-origin-ritual-played'); } catch { /* storage may be unavailable */ }
    }
    const depth = current.node.depth || 0;
    const paused = current.interventionPaused;
    const thresholds = view?.thresholds || { DESATURATE: 4, INTERRUPT: 5 };
    const stateKind = paused ? 'resting' : depth >= thresholds.INTERRUPT ? 'interrupt' : depth >= thresholds.DESATURATE ? 'drift' : depth > 0 ? 'branch' : 'root';
    const state = paused ? 'Forest resting' : depth >= thresholds.INTERRUPT ? 'You may be wandering' : depth >= thresholds.DESATURATE ? 'This branch is getting long' : depth > 0 ? `Related branch · ${depth} ${depth === 1 ? 'step' : 'steps'} away` : 'Growing from this mission';
    const enteredNewBranch = !paused && previous?.node?.id && previous.node.id !== current.node.id && depth > (previous.node.depth || 0);
    const isOriginLoad = !paused && !previous?.node?.id && depth === 0;
    missionEl.textContent = current.mission;
    chip.dataset.state = enteredNewBranch ? 'growing' : stateKind;
    chip.setAttribute('aria-label', `Focus Forest companion. Mission: ${current.mission}. ${enteredNewBranch ? 'A small branch is growing.' : state}.`);
    chip.hidden = false;
    chip.querySelector('.chip-action').textContent = paused ? 'Resume' : 'Pause';
    chip.querySelector('.chip-action').setAttribute('aria-label', paused ? 'Resume Focus Forest' : 'Pause Focus Forest');
    document.documentElement.classList.toggle('ff-soft-drift', !paused && depth >= thresholds.DESATURATE && depth < thresholds.INTERRUPT);
    // Local's isOriginLoad detection (kept)
    if (isOriginLoad) await showGrowthRitual(true); else if (enteredNewBranch) await showGrowthRitual(false); else cancelGrowthRitual();
    if (!paused && depth >= thresholds.INTERRUPT && backdrop.dataset.shownFor !== location.href) showChoiceSheet(depth);
    stateEl.textContent = state;
    chip.dataset.state = stateKind;
    chip.setAttribute('aria-label', `Focus Forest companion. Mission: ${current.mission}. ${state}.`);
  }

  // DOM-safe choice sheet: all dynamic content set via textContent/elements, no innerHTML.
  function showChoiceSheet(depth) {
    backdrop.dataset.shownFor = location.href;
    sheetCopy.replaceChildren();
    const missionEl = document.createElement('q');
    missionEl.textContent = current?.mission || '';
    const depthEl = document.createElement('strong');
    depthEl.textContent = String(depth);
    const pageEl = document.createElement('q');
    pageEl.textContent = document.title || location.hostname;
    sheetCopy.append(
      document.createTextNode('You started with '),
      missionEl,
      document.createTextNode('. You are now '),
      depthEl,
      document.createTextNode(' branches away, looking at '),
      pageEl,
      document.createTextNode('. That may be exactly where you meant to go — or it may be a path that opened by itself.')
    );
    backdrop.hidden = false;
    shadow.querySelector('[data-action="home"]').focus();
  }

  function hideChoiceSheet() { backdrop.hidden = true; }

  shadow.addEventListener('click', wrapWithErrorBoundary(async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'home') { hideChoiceSheet(); await send('GO_HOME'); }
    if (action === 'compost') { await send('COMPOST', { url: location.href, title: document.title }); hideChoiceSheet(); }
    if (action === 'mission') { await send('END_MISSION', { reason: 'mission_changed' }); hideChoiceSheet(); window.location.href = chrome.runtime.getURL('newtab/index.html'); }
    if (event.target.closest('.chip-action')) { await send('PAUSE_INTERVENTION', { paused: !current?.interventionPaused }); await safeRefresh(false); }
  }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'shadow.click' }));

  shadow.addEventListener('keydown', wrapWithErrorBoundary((event) => {
    if (event.key === 'Escape' && !backdrop.hidden) { hideChoiceSheet(); return; }
    if (event.key !== 'Tab' || backdrop.hidden) return;
    const focusable = [...backdrop.querySelectorAll('button')];
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && shadow.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && shadow.activeElement === last) { event.preventDefault(); first.focus(); }
  }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'shadow.keydown' }));

  document.addEventListener('click', wrapWithErrorBoundary((event) => {
    if (!event.isTrusted || event.button !== 0 || event.defaultPrevented) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    let target;
    try { target = new URL(link.href, location.href); } catch { return; }
    if (!['http:', 'https:'].includes(target.protocol) || (target.href.split('#')[0] === location.href.split('#')[0] && target.hash)) return;
    const opensElsewhere = link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
    send('LINK_CLICK', { url: target.href, title: link.textContent?.trim() || target.hostname, targetBlank: opensElsewhere });
  }, { category: ERROR_CATEGORIES.CONTENT_SCRIPT, function: 'document.click' }), true);

  const safeRefresh = wrapWithErrorBoundary(refresh, { category: ERROR_CATEGORIES.MESSAGING, function: 'refresh' });
  async function refresh(observe = true) {
    try {
      if (observe) await send('OBSERVE_PAGE', { url: location.href, title: document.title });
      await update(await send('GET_ACTIVE_VIEW'));
    } catch { update(null); }
  }

  // Adaptive SPA-URL watch: polls only while the tab is visible, backs off
  // when idle, and stops entirely on hidden tabs. The service worker also
  // receives webNavigation.onHistoryStateUpdated, so this is a render fallback.
  let watchTimer = 0;
  const WATCH_INTERVAL = 4000;
  function scheduleWatch() {
    window.clearTimeout(watchTimer);
    if (document.hidden) return;
    watchTimer = window.setTimeout(() => {
      if (location.href !== lastUrl) { lastUrl = location.href; backdrop.removeAttribute('data-shown-for'); refresh(true); }
      scheduleWatch();
    }, WATCH_INTERVAL);
  }

  const onNavigation = () => { if (location.href !== lastUrl) { lastUrl = location.href; backdrop.removeAttribute('data-shown-for'); safeRefresh(true); } };
  const safeOnNavigation = wrapWithErrorBoundary(onNavigation, { category: ERROR_CATEGORIES.CONTENT_SCRIPT, function: 'onNavigation' });
  window.addEventListener('popstate', safeOnNavigation, { passive: true });
  window.addEventListener('pageshow', wrapWithErrorBoundary(() => safeRefresh(false), { category: ERROR_CATEGORIES.CONTENT_SCRIPT, function: 'pageshow' }), { passive: true });
  document.addEventListener('visibilitychange', wrapWithErrorBoundary(() => { if (document.hidden) window.clearTimeout(watchTimer); else { safeRefresh(false); scheduleWatch(); } }, { category: ERROR_CATEGORIES.CONTENT_SCRIPT, function: 'visibilitychange' }));

  const safeLoadSettings = wrapWithErrorBoundary(loadSettings, { category: ERROR_CATEGORIES.MESSAGING, function: 'loadSettings' });
  const safeScheduleWatch = wrapWithErrorBoundary(scheduleWatch, { category: ERROR_CATEGORIES.CONTENT_SCRIPT, function: 'scheduleWatch' });

  safeLoadSettings();
  safeRefresh(true);
  safeScheduleWatch();
})();
