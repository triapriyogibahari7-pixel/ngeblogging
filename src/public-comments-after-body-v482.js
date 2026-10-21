const SYSTEM_HOSTS = new Set(['ngeblogging.com', 'www.ngeblogging.com', 'studio.ngeblogging.com', 'api.ngeblogging.com']);

export function placePublicCommentsAfterBodyV482() {
  if (SYSTEM_HOSTS.has(window.location.hostname.toLowerCase())) return false;
  const article = document.querySelector('.ps-site.is-post .ps-content,.ps-site.is-page .ps-content');
  const body = article?.querySelector(':scope > .ps-body');
  const comments = document.getElementById('ngeblogging-comments');
  if (!article || !body || !comments?.classList.contains('ngc-root') || comments.contains(article)) return false;
  if (body.nextElementSibling === comments) return false;
  body.after(comments);
  return true;
}

if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined' && !SYSTEM_HOSTS.has(window.location.hostname.toLowerCase())) {
  let frame = 0;
  const observer = new MutationObserver(schedule);
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      observer.disconnect();
      try { placePublicCommentsAfterBodyV482(); }
      finally { observer.observe(document.documentElement, { childList: true, subtree: true }); }
    });
  }
  observer.observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}
