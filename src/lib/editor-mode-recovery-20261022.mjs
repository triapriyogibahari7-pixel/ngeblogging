export const EDITOR_MODE_KEY = 'ngeblogging-content-editor-mode-v463';
export const EDITOR_MODE_EVENT = 'ngeblogging-editor-layout-change';
export function normalizeEditorMode(value) {
  return ['auto', 'mobile', 'desktop'].includes(value) ? value : 'auto';
}
export function resolveEditorMode(env = {}, preference = 'auto') {
  const dimension = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : Infinity;
  const sw = dimension(env.screenWidth), sh = dimension(env.screenHeight), width = Number(env.viewportWidth);
  const phone = env.mobileHint === true || (env.coarse && Number(env.touchPoints) > 0 && Math.min(sw, sh) <= 600);
  if (phone && Number.isFinite(sw) && Number.isFinite(sh) && width <= Math.max(sw, sh) + 1) return 'mobile';
  const choice = normalizeEditorMode(preference);
  if (choice !== 'auto') return choice;
  if (!(width >= 768)) return 'mobile';
  if (env.mobileHint === false) return 'desktop';
  return phone ? 'mobile' : 'desktop';
}
export function createEditorPreferenceStore(storage, notify = () => {}) {
  let session;
  return {
    get() { if (session !== undefined) return session; try { return normalizeEditorMode(storage.getItem(EDITOR_MODE_KEY)); } catch { return 'auto'; } },
    set(value) {
      if (normalizeEditorMode(value) !== value) throw new Error('Mode editor tidak valid.');
      session = value;
      let persisted = false;
      try { storage.setItem(EDITOR_MODE_KEY, value); persisted = true; } catch {}
      notify();
      return {value, persisted};
    },
    sync() { session = undefined; notify(); }
  };
}
const store = createEditorPreferenceStore({getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value)}, () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EDITOR_MODE_EVENT));
});
export const currentEditorPreference = () => store.get();
export const setEditorPreference = value => store.set(value);
export function syncEditorPreference(event) { if (event.key === EDITOR_MODE_KEY || event.key === null) store.sync(); }
export function editorResponsiveOverride(view) {
  if (typeof document === 'undefined' || !document.querySelector('.ce-app')) return null;
  const preference = currentEditorPreference();
  if (preference === 'auto') return null;
  const env = {screenWidth: view.screenWidth, screenHeight: view.screenHeight, viewportWidth: view.layoutWidth, mobileHint: navigator.userAgentData?.mobile, touchPoints: navigator.maxTouchPoints || 0, coarse: window.matchMedia?.('(pointer: coarse)')?.matches === true};
  // Keep normal phones on their existing compact path, as in the original v463 policy.
  if (resolveEditorMode(env, 'desktop') === 'mobile') return null;
  return resolveEditorMode(env, preference) === 'desktop' ? 'desktop' : 'compact';
}
