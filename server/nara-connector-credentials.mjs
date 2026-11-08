const encoder = new TextEncoder();
const decoder = new TextDecoder();
function hex(bytes) { return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join(''); }
function unhex(text) {
  if (typeof text !== 'string' || text.length % 2 || !/^[a-f0-9]+$/.test(text)) throw new Error('INVALID_ENCRYPTED_CREDENTIAL');
  return Uint8Array.from(text.match(/../g), value => parseInt(value, 16));
}
async function keyFromHex(keyHex) {
  if (typeof keyHex !== 'string' || !/^[a-f0-9]{64}$/.test(keyHex)) throw new Error('CONNECTOR_KEY_UNAVAILABLE');
  return crypto.subtle.importKey('raw', unhex(keyHex), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
function context(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'connectionId,ownerId,provider') throw new Error('INVALID_CREDENTIAL_CONTEXT');
  if (Object.values(value).some(item => typeof item !== 'string' || !item || item.length > 128 || /[\u0000-\u001f\u007f]/.test(item))) throw new Error('INVALID_CREDENTIAL_CONTEXT');
  return encoder.encode(JSON.stringify([value.ownerId, value.connectionId, value.provider]));
}
export async function sealCredential(token, keyHex, scope) {
  if (typeof token !== 'string' || !token || token.length > 8192 || /[\s\u0000-\u001f\u007f]/.test(token)) throw new Error('INVALID_CREDENTIAL');
  const additionalData = context(scope);
  const key = await keyFromHex(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, key, encoder.encode(token));
  return { version: 1, iv: hex(iv), ciphertext: hex(new Uint8Array(encrypted)) };
}
export async function openCredential(sealed, keyHex, scope) {
  try {
    if (!sealed || sealed.version !== 1 || !/^[a-f0-9]{24}$/.test(sealed.iv || '') || typeof sealed.ciphertext !== 'string' || sealed.ciphertext.length > 16416) throw new Error();
    const key = await keyFromHex(keyHex);
    const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unhex(sealed.iv), additionalData: context(scope), tagLength: 128 }, key, unhex(sealed.ciphertext));
    return decoder.decode(bytes);
  } catch { throw new Error('CREDENTIAL_UNAVAILABLE'); }
}
