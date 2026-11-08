const ARTICLE_PROMPTS = new Set(['Buat ide artikel', 'Perbaiki tulisan', 'Perbaiki artikel', 'Audit SEO']);
export function isNaraArticlePrompt(value) { return ARTICLE_PROMPTS.has(String(value || '').trim()); }
export function isNaraDefaultWelcome(value) {
  const text = String(value || '').trim();
  return /^Halo\b/.test(text) && text.includes('Saya Nara, asisten Ngeblogging Anda.') && text.endsWith('Saya bisa membantu menulis, meriset ide, memperbaiki SEO, dan memahami lampiran.');
}
const hiddenNodes = new Map(), placeholders = new Map();
function hide(node) {
  if (hiddenNodes.has(node)) return;
  hiddenNodes.set(node, { value: node.style.getPropertyValue('display'), priority: node.style.getPropertyPriority('display') });
  node.style.setProperty('display', 'none', 'important');
}
// Presentation only. Caller must first verify the owner; this grants no permissions.
export function applyNaraOwnerChatCopy(shell) {
  for (const [node] of hiddenNodes) if (!node.isConnected) hiddenNodes.delete(node);
  for (const [node] of placeholders) if (!node.isConnected) placeholders.delete(node);
  const prompts = shell.querySelector('.nara-quick-prompts');
  prompts?.querySelectorAll('button').forEach(button => { if (isNaraArticlePrompt(button.textContent)) hide(button); });
  const first = shell.querySelector('.nara-assistant-messages .nara-message.assistant');
  const text = first?.querySelector('.nara-message-content')?.textContent;
  if (first && isNaraDefaultWelcome(text)) hide(first);
  shell.querySelectorAll('.nara-composer textarea').forEach(input => {
    if (!placeholders.has(input)) placeholders.set(input, { placeholder: input.getAttribute('placeholder'), aria: input.getAttribute('aria-label') });
    if (!input.getAttribute('aria-label')) input.setAttribute('aria-label', 'Pesan untuk Nara');
    input.setAttribute('placeholder', '');
  });
}
export function restoreNaraOwnerChatCopy() {
  for (const [node, previous] of hiddenNodes) {
    if (previous.value) node.style.setProperty('display', previous.value, previous.priority);
    else node.style.removeProperty('display');
  }
  hiddenNodes.clear();
  for (const [input, previous] of placeholders) {
    for (const [attribute, value] of [['placeholder', previous.placeholder], ['aria-label', previous.aria]]) {
      if (value === null) input.removeAttribute(attribute); else input.setAttribute(attribute, value);
    }
  }
  placeholders.clear();
}
