import { requireConnectorAdminIdentity } from './nara-connector-admin-identity.mjs';
// Internal routing policy only. Never use a browser-supplied user or authorization callback.
// This does not execute inference, grant Pro quota, or authorize provider writes.
const MODELS = new Set(['nara-mini','nara-writer','nara-vision','nara-max']);
const LEVELS = new Set(['light','standard','high','xhigh']);
export async function resolvePrivateNaraRoute(verifiedUser, selection, checkActiveAdmin) {
 if (!selection || typeof selection !== 'object' || Array.isArray(selection) || Object.keys(selection).some(key => !['model','intelligence','hasImage'].includes(key)) || !MODELS.has(selection.model) || !LEVELS.has(selection.intelligence) || typeof selection.hasImage !== 'boolean') throw Error('INVALID_NARA_SELECTION');
 if (selection.hasImage && selection.model === 'nara-writer') throw Error('VISION_MODEL_REQUIRED');
 const ordinary = { model: selection.model, intelligence: selection.intelligence, route: 'public-existing', enhanced: false };
 const requested = selection.intelligence === 'xhigh' || selection.model === 'nara-vision' || selection.model === 'nara-max';
 if (!requested) return ordinary;
 try { requireConnectorAdminIdentity(verifiedUser); } catch { return ordinary; }
 if (typeof checkActiveAdmin !== 'function') throw Error('PRIVATE_NARA_AUTH_UNAVAILABLE');
 let active;
 try { active = await checkActiveAdmin(verifiedUser.id); } catch { throw Error('PRIVATE_NARA_AUTH_UNAVAILABLE'); }
 if (active !== true) return ordinary;
 return { model: selection.model, intelligence: selection.intelligence, route: selection.hasImage || selection.model === 'nara-vision' ? 'private-vision' : 'private-max', enhanced: true };
}
