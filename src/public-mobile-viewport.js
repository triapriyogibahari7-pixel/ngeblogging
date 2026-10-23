export function publicMobileViewport(content = '') {
  const rest = String(content || '').split(',').map(item => item.trim()).filter(Boolean).filter(item => !/^(width|initial-scale|minimum-scale)\s*=/i.test(item));
  return ['width=device-width', 'initial-scale=1', 'minimum-scale=1', ...rest].join(',');
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const mobile = window.matchMedia('(max-width: 760px)');
  let saved = null;
  let queued = false;
  function restore() {
    if (!saved) return;
    const { meta, content, created, applied } = saved;
    if (meta.getAttribute('content') === applied) {
      if (created) meta.remove();
      else if (content === null) meta.removeAttribute('content');
      else meta.setAttribute('content', content);
    }
    saved = null;
  }
  function sync() {
    queued = false;
    const article = document.querySelector('#root > .ps-site');
    const pending = document.querySelector('#root > .ps-state') && window.location.pathname.split('/').filter(Boolean).length > 0;
    if (!mobile.matches || (!article && !pending)) { restore(); return; }
    if (saved && !saved.meta.isConnected) restore();
    if (saved) return;
    let meta = document.querySelector('meta[name="viewport"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.append(meta);
    }
    const content = meta.getAttribute('content');
    const applied = publicMobileViewport(content);
    saved = { meta, content, created, applied };
    meta.setAttribute('content', applied);
  }
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(sync);
  }
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  if (mobile.addEventListener) mobile.addEventListener('change', schedule);
  else mobile.addListener(schedule);
  window.addEventListener('pageshow', schedule, { passive: true });
  window.addEventListener('popstate', schedule);
  schedule();
}
