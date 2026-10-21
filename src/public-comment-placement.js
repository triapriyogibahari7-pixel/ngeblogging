function relocatePublicComments() {
  const article = document.querySelector('#root > .ps-site > .ps-content-shell > article.ps-content');
  const comments = document.getElementById('ngeblogging-comments');
  if (!article || !comments || comments.parentElement === article) return false;
  article.append(comments);
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
