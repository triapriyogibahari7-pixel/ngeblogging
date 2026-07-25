const RELEASE = "nara-request-mode-v29-20260725";
const FLAG = Symbol.for("ngeblogging.nara.fetch.v29");

if (!window[FLAG]) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (/\/api\/nara(?:\?|$)/.test(url) && typeof init.body === "string") {
      try {
        const payload = JSON.parse(init.body);
        const shell = document.querySelector('.nara-assistant-shell[data-nara-controls-v29="true"]');
        const taskMode = shell?.dataset.naraTaskModeV29 || "Otomatis";
        init = { ...init, body: JSON.stringify({ ...payload, taskMode, uiRelease: RELEASE }) };
      } catch {
        // Leave non-JSON bodies untouched.
      }
    }
    return nativeFetch(input, init);
  };
  window[FLAG] = true;
  document.documentElement.dataset.naraRequestModeV29 = RELEASE;
}
