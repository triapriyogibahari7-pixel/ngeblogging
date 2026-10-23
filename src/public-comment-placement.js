const pendingDisplay = new WeakMap();

function relocatePublicComments() {
  const comments = document.getElementById('ngeblogging-comments');
  if (!comments) return false;
  const article = document.querySelector('#root > .ps-site > .ps-content-shell > article.ps-content');
  const sheet = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => {
    try { return new URL(link.href, document.baseURI).pathname === '/comments-v93.css'; }
    catch { return false; }
  });
  const ready = Boolean(sheet?.sheet && !sheet.disabled && (!sheet.media || window.matchMedia(sheet.media).matches));
  if (!article || !ready) {
    if (!pendingDisplay.has(comments)) pendingDisplay.set(comments, { value: comments.style.getPropertyValue('display'), priority: comments.style.getPropertyPriority('display') });
    comments.style.setProperty('display', 'none', 'important');
    return false;
  }
  const moved = comments.parentElement !== article;
  if (moved) article.append(comments);
  const previous = pendingDisplay.get(comments);
  if (previous) {
    if (previous.value) comments.style.setProperty('display', previous.value, previous.priority);
    else comments.style.removeProperty('display');
    pendingDisplay.delete(comments);
  }
  return moved;
}

if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  let queued = false;
  const options = { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'rel', 'media', 'disabled'] };
  const observer = new MutationObserver(schedule);
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      observer.disconnect();
      try { relocatePublicComments(); }
      finally { observer.observe(document.documentElement, options); }
    });
  }
  function stylesheetChanged(event) {
    if (event.target?.tagName === 'LINK') schedule();
  }
  observer.observe(document.documentElement, options);
  document.addEventListener('load', stylesheetChanged, true);
  document.addEventListener('error', stylesheetChanged, true);
  window.addEventListener('pageshow', schedule, { passive: true });
  schedule();
}

export { relocatePublicComments };
