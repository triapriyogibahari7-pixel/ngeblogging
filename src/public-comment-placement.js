function relocatePublicComments() {
  const host = window.location.hostname.toLowerCase();
  if (['ngeblogging.com', 'www.ngeblogging.com', 'studio.ngeblogging.com', 'api.ngeblogging.com'].includes(host)) return false;
  const article = document.querySelector('#root > .ps-site > .ps-content-shell > article.ps-content');
  const comments = document.getElementById('ngeblogging-comments');
  const body = article?.querySelector(':scope > .ps-body');
  if (!article || !body || !comments || comments.contains(article)) return false;
  if (body.nextElementSibling === comments) return false;
  body.after(comments);
  return true;
}

if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  let frame = 0;
  const observer = new MutationObserver(schedule);
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      observer.disconnect();
      try { relocatePublicComments(); }
      finally { observer.observe(document.documentElement, {childList: true, subtree: true}); }
    });
  }
  observer.observe(document.documentElement, {childList: true, subtree: true});
  schedule();
}

export { relocatePublicComments };
