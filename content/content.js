(() => {
  if (location.protocol === 'chrome-extension:' || location.protocol === 'chrome:' || location.protocol === 'edge:') return;

  // Fallback implementations in case module loading fails
  const fallbackErrorCategories = { CONTENT_SCRIPT: 'content_script', MESSAGING: 'messaging', UI_RENDER: 'ui_render', UNKNOWN: 'unknown' };
  function fallbackLogError(error, context = {}) {
    const trace = {
      id: `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      message: error?.message || String(error),
      stack: error?.stack || (new Error()).stack,
      category: context.category || fallbackErrorCategories.UNKNOWN,
      severity: context.severity || 'medium',
      context: { url: location.href, userAgent: navigator.userAgent, ...context }
    };
    console.error('[Focus Forest Error]', JSON.stringify(trace, null, 2));
    return trace;
  }
  function fallbackWrapWithErrorBoundary(fn, context = {}) {
    const shouldRethrow = context.rethrow !== false && !context.swallow;
    return async (...args) => {
      try { return await fn(...args); }
      catch (error) {
        fallbackLogError(error, { ...context, category: context.category || fallbackErrorCategories.UNKNOWN });
        if (shouldRethrow) throw error;
        return undefined;
      }
    };
  }

  function initContentScript() {
    // Try to use shared error-tracing module, fall back to local implementations
    let logError = fallbackLogError;
    let wrapWithErrorBoundary = fallbackWrapWithErrorBoundary;
    let ERROR_CATEGORIES = fallbackErrorCategories;

    import('../shared/error-tracing.js').then(({ logError: sharedLogError, wrapWithErrorBoundary: sharedWrap, ERROR_CATEGORIES: sharedCategories }) => {
      logError = sharedLogError;
      wrapWithErrorBoundary = sharedWrap;
      ERROR_CATEGORIES = sharedCategories;
      // Re-initialize with shared modules if needed for dynamic behavior
    }).catch((error) => {
      console.error('[Focus Forest] Failed to load error-tracing module:', error);
    });

    async function send(type, payload = {}) { return chrome.runtime.sendMessage({ type, ...payload }); }

  // Root host: pointer-events:none so the page behind stays fully interactive.
  // Only specific children (the chip, the choice card) opt back in with auto.
  const root = document.createElement('div');
  root.id = 'focus-forest-root';
  document.documentElement.appendChild(root);
  const shadow = root.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `:host{all:initial}#ff-root{position:fixed;z-index:2147483646;inset:0;pointer-events:none}#ff-root *{box-sizing:border-box}.chip{position:fixed;top:16px;right:18px;display:flex;align-items:center;gap:9px;max-width:min(380px,calc(100vw - 32px));padding:8px 8px 8px 12px;border:1px solid rgba(74,104,71,.22);border-radius:999px;background:linear-gradient(120deg,rgba(252,251,245,.97),rgba(243,248,239,.95));box-shadow:0 8px 28px rgba(42,65,41,.16),0 1px 0 rgba(255,255,255,.6) inset;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font:13px/1.25 ui-sans-serif,system-ui,-apple-system,sans-serif;color:#29432d;pointer-events:auto;cursor:default;transition:transform .18s ease,box-shadow .18s ease,opacity .2s ease;animation:ff-slide-in .28s cubic-bezier(.2,.8,.3,1) both}.chip:hover{box-shadow:0 10px 32px rgba(42,65,41,.22),0 1px 0 rgba(255,255,255,.6) inset}.chip[hidden]{display:none}.chip.dragging{transition:none;box-shadow:0 14px 40px rgba(42,65,41,.3)}.chip[data-state="interrupt"]{border-color:rgba(189,132,115,.5)}.chip[data-state="drift"]{border-color:rgba(198,165,98,.5)}.chip[data-state="resting"]{opacity:.78}.chip-seed{position:relative;width:28px;height:28px;flex:none;cursor:grab;touch-action:none}.chip-seed:active{cursor:grabbing}.chip-seed svg{position:absolute;inset:0;width:100%;height:100%}.chip-growth-ritual .chip-seed-tree{animation:ff-tree-grow 1.2s cubic-bezier(.25,.8,.25,1) both}.chip-growth-flash .chip-seed-tree{animation:ff-tree-flicker .18s ease-in-out 3 both}.chip-copy{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;overflow:hidden}.chip-kicker{font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#6c8c68;white-space:nowrap}.chip-mission{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chip-state{font-size:11px;color:#6c8c68;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chip-actions{display:flex;gap:4px;flex:none}.chip-btn{appearance:none;border:0;border-radius:999px;background:rgba(74,104,71,.1);color:#29432d;font:inherit;font-size:11px;padding:5px 10px;cursor:pointer;transition:background .15s,transform .1s;white-space:nowrap}.chip-btn:hover{background:rgba(74,104,71,.2)}.chip-btn:active{transform:scale(.94)}.chip-btn.minimize{padding:5px 7px;font-size:13px;line-height:1}.chip.minimized .chip-copy,.chip.minimized .chip-btn:not(.minimize){display:none}.chip.minimized{padding:6px}.chip.minimized .chip-mission{display:block;font-size:11px;max-width:90px}@keyframes ff-tree-grow{0%{opacity:0;transform:scale(.3)}60%{opacity:1;transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}@keyframes ff-tree-flicker{0%,100%{opacity:1;filter:brightness(1)}50%{opacity:.5;filter:brightness(1.4)}}@keyframes ff-slide-in{from{opacity:0;transform:translateY(-8px) scale(.96)}}.choice-card{position:fixed;bottom:18px;right:18px;max-width:min(420px,calc(100vw - 32px));padding:18px 18px 16px;border:1px solid rgba(74,104,71,.18);border-radius:18px;background:linear-gradient(120deg,rgba(252,251,245,.98),rgba(243,248,239,.97));box-shadow:0 16px 48px rgba(42,65,41,.2);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);pointer-events:auto;animation:ff-slide-up .3s cubic-bezier(.2,.8,.3,1) both}.choice-card[hidden]{display:none}.choice-card .close{position:absolute;top:10px;right:10px;border:0;background:rgba(74,104,71,.08);border-radius:999px;width:26px;height:26px;font-size:15px;line-height:1;color:#5a7355;cursor:pointer}.choice-card .close:hover{background:rgba(74,104,71,.16)}.choice-eyebrow{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6c8c68;margin:0 0 8px}.choice-card h2{font:600 15px/1.3 ui-sans-serif,system-ui,sans-serif;color:#29432d;margin:0 0 10px}.choice-copy{font:13px/1.55 ui-sans-serif,system-ui,sans-serif;color:#3d5239;margin:0 0 14px}.choice-actions{display:flex;flex-direction:column;gap:7px}.choice{appearance:none;border:1px solid rgba(74,104,71,.16);border-radius:12px;background:rgba(255,255,255,.7);color:#29432d;font:inherit;text-align:left;padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .15s,border-color .15s,transform .1s}.choice:hover{background:rgba(243,248,239,.9);border-color:rgba(74,104,71,.3);transform:translateX(2px)}.choice:active{transform:scale(.99)}.choice.primary{background:linear-gradient(120deg,rgba(108,150,103,.16),rgba(108,150,103,.1));border-color:rgba(108,150,103,.3)}.choice-icon{font-size:15px;width:20px;text-align:center;flex:none}.choice span{display:block}.choice strong{font-weight:600;font-size:13px}.choice small{font-size:11px;color:#6c8c68;margin-top:1px}@keyframes ff-slide-up{from{opacity:0;transform:translateY(12px)}}`;
  shadow.append(style);

  const makeElement = (tag, className = '', attributes = {}, text = null) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value === true ? '' : String(value)));
    if (text != null) element.textContent = text;
    return element;
  };
  const makeChoice = (action, className, icon, title, copy) => {
    const button = makeElement('button', className, { 'data-action': action });
    const iconEl = makeElement('span', 'choice-icon', { 'aria-hidden': 'true' }, icon);
    const textEl = makeElement('span');
    textEl.append(makeElement('strong', '', {}, title), makeElement('small', '', {}, copy));
    button.append(iconEl, textEl);
    return button;
  };
  const rootEl = makeElement('div');
  rootEl.id = 'ff-root';
  const chipEl = makeElement('div', 'chip', { role: 'group', 'aria-label': 'Focus Forest companion', hidden: true });
  const seedEl = makeElement('span', 'chip-seed', { 'aria-hidden': 'true', 'data-drag-handle': '', title: 'Drag to move' });
  // Inline SVG tree icon with trunk, asymmetrical branches, and leaf buds
  const treeSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  treeSVG.setAttribute('viewBox', '0 0 28 28');
  treeSVG.setAttribute('class', 'chip-seed-tree');
  treeSVG.innerHTML = '<defs><linearGradient id="ff-trunk-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#5d7a55"/><stop offset="50%" style="stop-color:#6c9868"/><stop offset="100%" style="stop-color:#5d7a55"/></linearGradient></defs><path d="M14 24 C13 18 14 12 14 8 M14 14 C10 12 6 10 4 6 M14 12 C18 10 22 8 24 5 M14 8 C12 6 10 5 8 3 M14 6 C16 5 18 4 20 2" stroke="url(#ff-trunk-grad)" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.95"/><circle cx="4" cy="6" r="1.8" fill="#7fb375" opacity="0.9"/><circle cx="24" cy="5" r="1.6" fill="#7fb375" opacity="0.85"/><circle cx="8" cy="3" r="1.4" fill="#8fc485" opacity="0.8"/><circle cx="20" cy="2" r="1.3" fill="#8fc485" opacity="0.75"/>';
  seedEl.appendChild(treeSVG);
  const copyEl = makeElement('span', 'chip-copy');
  copyEl.append(makeElement('span', 'chip-kicker', '', 'current mission'), makeElement('strong', 'chip-mission'), makeElement('small', 'chip-state', { 'aria-live': 'polite' }));
  const actionsEl = makeElement('div', 'chip-actions');
  actionsEl.append(makeElement('button', 'chip-btn', { 'data-action': 'pause', 'aria-label': 'Pause Focus Forest' }, 'Pause'), makeElement('button', 'chip-btn minimize', { 'data-action': 'minimize', 'aria-label': 'Minimize Focus Forest' }, '–'));
  chipEl.append(seedEl, copyEl, actionsEl);
  const choiceCardEl = makeElement('section', 'choice-card', { role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'ff-title', hidden: true });
  choiceCardEl.append(makeElement('button', 'close', { 'data-action': 'dismiss', 'aria-label': 'Dismiss' }, '×'), makeElement('p', 'choice-eyebrow', {}, 'A moment to choose'), makeElement('h2', '', { id: 'ff-title' }, 'You may have wandered a little.'), makeElement('p', 'choice-copy'));
  const choiceActionsEl = makeElement('div', 'choice-actions');
  choiceActionsEl.append(makeChoice('home', 'choice primary', '↶', 'Return to my mission', 'Go back to where this session began.'), makeChoice('compost', 'choice', '⌁', 'Save this for later', 'Put this curiosity in your compost pile.'), makeChoice('mission', 'choice', '＋', 'Start a new mission', 'Let this become the thing you are here to do.'));
  choiceCardEl.append(choiceActionsEl);
  rootEl.append(chipEl, choiceCardEl);
  shadow.append(rootEl);

  const chip = shadow.querySelector('.chip');
  const choiceCard = shadow.querySelector('.choice-card');
  const choiceCopy = shadow.querySelector('.choice-copy');
  const missionEl = shadow.querySelector('.chip-mission');
  const stateEl = shadow.querySelector('.chip-state');
  const pauseBtn = shadow.querySelector('[data-action="pause"]');
  const minimizeBtn = shadow.querySelector('[data-action="minimize"]');
  let current = null;
  let lastUrl = location.href;
  let ritualToken = 0;
  let ritualTimer = 0;
  let growthAnimationTrigger = 'mission-origin';
  let originRitualPlayed = false;
  try { originRitualPlayed = sessionStorage.getItem('ff-origin-ritual-played') === 'true'; } catch { /* storage may be unavailable */ }

  // --- Drag-to-move the chip (Pointer Events + setPointerCapture) ---
  let chipPos = null;
  try { const saved = sessionStorage.getItem('ff-chip-pos'); if (saved) chipPos = JSON.parse(saved); } catch { /* ignore */ }
  if (chipPos && Number.isFinite(chipPos.x) && Number.isFinite(chipPos.y)) applyChipPos(chipPos.x, chipPos.y);
  function applyChipPos(x, y) { chip.style.left = `${x}px`; chip.style.top = `${y}px`; chip.style.right = 'auto'; }
  const dragHandle = shadow.querySelector('[data-drag-handle]');
  dragHandle.addEventListener('pointerdown', wrapWithErrorBoundary((e) => {
    e.preventDefault();
    const rect = chip.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    chip.classList.add('dragging');
    dragHandle.setPointerCapture(e.pointerId);
    const onMove = wrapWithErrorBoundary((ev) => {
      const x = Math.max(8, Math.min(window.innerWidth - rect.width - 8, ev.clientX - offsetX));
      const y = Math.max(8, Math.min(window.innerHeight - rect.height - 8, ev.clientY - offsetY));
      applyChipPos(x, y);
    }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'drag.pointermove', swallow: true });
    const onUp = wrapWithErrorBoundary((ev) => {
      chip.classList.remove('dragging');
      dragHandle.releasePointerCapture(ev.pointerId);
      const finalRect = chip.getBoundingClientRect();
      try { sessionStorage.setItem('ff-chip-pos', JSON.stringify({ x: finalRect.left, y: finalRect.top })); } catch { /* ignore */ }
      dragHandle.removeEventListener('pointermove', onMove);
      dragHandle.removeEventListener('pointerup', onUp);
    }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'drag.pointerup', swallow: true });
    dragHandle.addEventListener('pointermove', onMove);
    dragHandle.addEventListener('pointerup', onUp);
  }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'drag.pointerdown', swallow: true }));

  async function loadSettings() {
    try {
      const snap = await send('GET_ACTIVE_VIEW');
      growthAnimationTrigger = snap.settings?.growthAnimationTrigger || 'mission-origin';
    } catch (error) {
      logError(error, { category: ERROR_CATEGORIES.MESSAGING, function: 'loadSettings' });
      growthAnimationTrigger = 'mission-origin';
    }
  }

  function cancelGrowthRitual() { ritualToken += 1; window.clearTimeout(ritualTimer); ritualTimer = 0; chip.classList.remove('ff-growth-ritual', 'ff-growth-flash'); }
  function waitForGrowth(ms, token) { return new Promise((resolve) => { ritualTimer = window.setTimeout(() => resolve(token === ritualToken), ms); }); }

  const safeShowGrowthRitual = wrapWithErrorBoundary(showGrowthRitual, { category: ERROR_CATEGORIES.UI_RENDER, function: 'showGrowthRitual' });

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
    stateEl.textContent = 'A branch is growing';
    chip.hidden = false;
    // Tree grows for ~1.2s, then flickers for ~0.5s before notification
    if (!await waitForGrowth(1200, token)) return false;
    chip.classList.remove('ff-growth-ritual');
    chip.classList.add('ff-growth-flash');
    if (!await waitForGrowth(540, token)) return false;
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
    if (!current?.node) { cancelGrowthRitual(); chip.hidden = true; choiceCard.hidden = true; return; }
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
    const state = paused ? 'Forest resting' : depth >= thresholds.INTERRUPT ? 'You may be wandering' : depth >= thresholds.DESATURATE ? 'This branch is getting long' : depth > 0 ? `Branch \u00b7 ${depth} ${depth === 1 ? 'step' : 'steps'} deep` : 'Growing from this mission';
    const enteredNewBranch = !paused && previous?.node?.id && previous.node.id !== current.node.id && depth > (previous.node.depth || 0);
    const isOriginLoad = !paused && !previous?.node?.id && depth === 0;
    missionEl.textContent = current.mission;
    chip.dataset.state = enteredNewBranch ? 'growing' : stateKind;
    chip.setAttribute('aria-label', `Focus Forest companion. Mission: ${current.mission}. ${state}.`);
    chip.hidden = false;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    pauseBtn.setAttribute('aria-label', paused ? 'Resume Focus Forest' : 'Pause Focus Forest');
    if (isOriginLoad) await safeShowGrowthRitual(true); else if (enteredNewBranch) await safeShowGrowthRitual(false); else cancelGrowthRitual();
    if (!paused && depth >= thresholds.INTERRUPT && choiceCard.dataset.shownFor !== location.href) showChoiceSheet(depth);
    stateEl.textContent = state;
  }

  // DOM-safe choice sheet: all dynamic content set via textContent/elements, no innerHTML.
  function showChoiceSheet(depth) {
    choiceCard.dataset.shownFor = location.href;
    choiceCopy.replaceChildren();
    const missionEl = document.createElement('q');
    missionEl.textContent = current?.mission || '';
    const depthEl = document.createElement('strong');
    depthEl.textContent = String(depth);
    const pageEl = document.createElement('q');
    pageEl.textContent = document.title || location.hostname;
    choiceCopy.append(
      document.createTextNode('You started with '),
      missionEl,
      document.createTextNode('. You are now '),
      depthEl,
      document.createTextNode(' branches away, looking at '),
      pageEl,
      document.createTextNode('. That may be exactly where you meant to go \u2014 or it may be a path that opened by itself.')
    );
    choiceCard.hidden = false;
    shadow.querySelector('[data-action="home"]').focus();
  }

  function hideChoiceCard() { choiceCard.hidden = true; }

  shadow.addEventListener('click', wrapWithErrorBoundary(async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'home') { hideChoiceCard(); await send('GO_HOME'); }
    else if (action === 'compost') { await send('COMPOST', { url: location.href, title: document.title }); hideChoiceCard(); }
    else if (action === 'mission') { await send('END_MISSION', { reason: 'mission_changed' }); hideChoiceCard(); window.location.href = chrome.runtime.getURL('newtab/index.html'); }
    else if (action === 'dismiss') { hideChoiceCard(); }
    else if (action === 'pause') { await send('PAUSE_INTERVENTION', { paused: !current?.interventionPaused }); await safeRefresh(false); }
    else if (action === 'minimize') { chip.classList.toggle('minimized'); minimizeBtn.textContent = chip.classList.contains('minimized') ? '+' : '\u2013'; }
  }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'shadow.click', swallow: true }));

  shadow.addEventListener('keydown', wrapWithErrorBoundary((event) => {
    if (event.key === 'Escape' && !choiceCard.hidden) { hideChoiceCard(); return; }
  }, { category: ERROR_CATEGORIES.UI_RENDER, function: 'shadow.keydown', swallow: true }));

  document.addEventListener('click', wrapWithErrorBoundary(async (event) => {
    if (!event.isTrusted || event.button !== 0 || event.defaultPrevented) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    let target;
    try { target = new URL(link.href, location.href); } catch { return; }
    if (!['http:', 'https:'].includes(target.protocol) || (target.href.split('#')[0] === location.href.split('#')[0] && target.hash)) return;
    const opensElsewhere = link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
    await send('LINK_CLICK', { url: target.href, title: link.textContent?.trim() || target.hostname, targetBlank: opensElsewhere });
  }, { category: ERROR_CATEGORIES.CONTENT_SCRIPT, function: 'document.click', swallow: true }), true);

  const safeRefresh = wrapWithErrorBoundary(refresh, { category: ERROR_CATEGORIES.MESSAGING, function: 'refresh', swallow: true });
  async function refresh(observe = true) {
    try {
      if (observe) await send('OBSERVE_PAGE', { url: location.href, title: document.title });
      await safeUpdate(await send('GET_ACTIVE_VIEW'));
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
      if (location.href !== lastUrl) { lastUrl = location.href; choiceCard.removeAttribute('data-shown-for'); refresh(true); }
      scheduleWatch();
    }, WATCH_INTERVAL);
  }

  const onNavigation = () => { if (location.href !== lastUrl) { lastUrl = location.href; choiceCard.removeAttribute('data-shown-for'); safeRefresh(true); } };
  const safeOnNavigation = wrapWithErrorBoundary(onNavigation, { category: ERROR_CATEGORIES.CONTENT_SCRIPT, function: 'onNavigation', swallow: true });
  window.addEventListener('popstate', safeOnNavigation, { passive: true });
  window.addEventListener('pageshow', wrapWithErrorBoundary(() => safeRefresh(false), { category: ERROR_CATEGORIES.CONTENT_SCRIPT, function: 'pageshow', swallow: true }), { passive: true });
  document.addEventListener('visibilitychange', wrapWithErrorBoundary(() => { if (document.hidden) window.clearTimeout(watchTimer); else { safeRefresh(false); scheduleWatch(); } }, { category: ERROR_CATEGORIES.CONTENT_SCRIPT, function: 'visibilitychange', swallow: true }));

  const safeLoadSettings = wrapWithErrorBoundary(loadSettings, { category: ERROR_CATEGORIES.MESSAGING, function: 'loadSettings', swallow: true });
  const safeScheduleWatch = wrapWithErrorBoundary(scheduleWatch, { category: ERROR_CATEGORIES.CONTENT_SCRIPT, function: 'scheduleWatch', swallow: true });

  safeLoadSettings();
  safeRefresh(true);
  safeScheduleWatch();
}

initContentScript();
})();
