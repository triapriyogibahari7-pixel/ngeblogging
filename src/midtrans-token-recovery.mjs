export const validSnapToken = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{10,200}$/.test(value);
export function recoverSnapToken({ token, orderId, environment, storage }) {
  if (!['production','sandbox'].includes(environment) || typeof orderId !== 'string' || !/^NARA-[a-f0-9]{40}$/.test(orderId)) return null;
  const key = `ngeblogging:snap-token:${environment}:${orderId}`;
  if (validSnapToken(token)) {
    try { storage?.setItem(key, token); } catch {}
    return token;
  }
  try { const saved = storage?.getItem(key); return validSnapToken(saved) ? saved : null; } catch { return null; }
}
