const OWNER_EMAIL = 'triapriyogibahari7@gmail.com';
const MAX_IMAGE_BYTES = 2_500_000;
export function isNaraMultimodalOwner(user) {
  return Boolean(user?.id && user?.email_confirmed_at && String(user.email || '').trim().toLowerCase() === OWNER_EMAIL);
}
export function validateHistoryImage(item) {
  if (item?.kind !== 'image') throw new Error('IMAGE_KIND_INVALID');
  const url = String(item.dataUrl || '');
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(url);
  if (!match || match[2].length % 4 !== 0) throw new Error('IMAGE_DATA_INVALID');
  const bytes = match[2].length * 3 / 4 - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
  if (bytes <= 0 || bytes > MAX_IMAGE_BYTES) throw new Error('IMAGE_SIZE_INVALID');
  return { type: 'image_url', image_url: { url } };
}
export function buildOwnerMultimodalHistory(history, user, limit = 16) {
  if (!isNaraMultimodalOwner(user)) throw new Error('OWNER_REQUIRED');
  const count = Math.max(1, Math.min(16, Number(limit) || 16));
  const items = Array.isArray(history) ? history.slice(-count) : [];
  let imageCount = 0;
  return items.flatMap((item) => {
    if (!['user', 'assistant'].includes(item?.role)) return [];
    const text = String(item.content || '').trim().slice(0, 8000);
    const images = item.role === 'user' && Array.isArray(item.attachments) ? item.attachments.filter((entry) => entry?.kind === 'image') : [];
    imageCount += images.length;
    if (imageCount > 4) throw new Error('HISTORY_IMAGE_LIMIT');
    if (!images.length) return text ? [{ role: item.role, content: text }] : [];
    return [{ role: 'user', content: [{ type: 'text', text: text || 'Analisis gambar terlampir sesuai konteks percakapan.' }, ...images.map(validateHistoryImage)] }];
  });
}
