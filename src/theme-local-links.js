export const THEME_LOCAL_LINKS_SCRIPT = String.raw`
(() => {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target?.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || link.getAttribute('target') === '_blank') return;
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#') || href.length === 1) return;
    let id;
    try { id = decodeURIComponent(href.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
  });
})();
`;
