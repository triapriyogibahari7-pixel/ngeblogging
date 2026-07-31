import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE = "studio-screenshot-fixes-v177-20260731";

function patchFile(path, transform) {
  const file = resolve(path);
  const before = readFileSync(file, "utf8");
  const after = transform(before);
  if (after !== before) writeFileSync(file, after, "utf8");
}

function replaceOnce(source, anchor, replacement, code) {
  if (source.includes(replacement)) return source;
  if (!source.includes(anchor)) throw new Error(`PATCH_V177_${code}_ANCHOR_MISSING`);
  return source.replace(anchor, replacement);
}

patchFile("src/StudioNext.jsx", (input) => {
  let source = input;
  source = replaceOnce(
    source,
    'import ContentEditor from "./ContentEditor";',
    'import ContentEditor from "./ContentEditor";\nimport { ProfileViewV177, SiteSettingsViewV177 } from "./ProfileSettingsV177.jsx";',
    "STUDIO_IMPORT",
  );

  const cloudAnchor = '  useEffect(() => {\n    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return; }';
  const profileEvents = `  useEffect(() => {\n    const openProfile = () => { setView("profile"); setMobileSidebar(false); };\n    const openSettings = () => { setView("settings"); setMobileSidebar(false); };\n    window.addEventListener("ngeblogging:open-profile", openProfile);\n    window.addEventListener("ngeblogging:open-settings", openSettings);\n    return () => {\n      window.removeEventListener("ngeblogging:open-profile", openProfile);\n      window.removeEventListener("ngeblogging:open-settings", openSettings);\n    };\n  }, []);\n\n${cloudAnchor}`;
  source = replaceOnce(source, cloudAnchor, profileEvents, "PROFILE_EVENTS");

  const settingsAnchor = '      {view === "settings" && <SettingsView site={site} setSite={setSite} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>} ';
  const separatedViews = '      {view === "profile" && <ProfileViewV177 site={site} profile={profile} setProfile={setProfile} user={user} setToast={setToast}/>} \n      {view === "settings" && <SiteSettingsViewV177 site={site} setSite={setSite} setToast={setToast}/>} ';
  source = replaceOnce(source, settingsAnchor, separatedViews, "SEPARATE_PROFILE_SETTINGS");

  if (!source.includes("ProfileViewV177") || !source.includes('view === "profile"')) {
    throw new Error("PATCH_V177_PROFILE_INCOMPLETE");
  }
  return source;
});

patchFile("src/NaraAssistant.jsx", (input) => {
  let source = input;
  const closeAnchor = `  const closeNara = () => {\n    stopSpeech();\n    setOpen(false);\n  };`;
  const closeReplacement = `  const closeNara = () => {\n    activeRequest.current?.abort?.();\n    activeRequest.current = null;\n    try { recognition.current?.stop?.(); } catch { /* recognition may already be stopped */ }\n    recognition.current = null;\n    setListening(false);\n    setAttachmentMenu(false);\n    stopSpeech();\n    setOpen(false);\n  };`;
  source = replaceOnce(source, closeAnchor, closeReplacement, "NARA_CLOSE");

  const launcherAnchor = `      <button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">\n        <span><Sparkles /></span>\n        <b>Nara AI</b>\n        <small>Assistant</small>\n      </button>`;
  const launcherReplacement = `      {!open && (\n        <button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">\n          <span><Sparkles /></span>\n          <b>Nara AI</b>\n          <small>Assistant</small>\n        </button>\n      )}`;
  source = replaceOnce(source, launcherAnchor, launcherReplacement, "NARA_LAUNCHER");

  source = replaceOnce(
    source,
    '        <div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">',
    '        <div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} data-nara-interaction={size === "full" ? "modal" : "nonmodal"} aria-label="Nara AI Assistant">',
    "NARA_LAYER",
  );
  source = replaceOnce(
    source,
    '          <button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />',
    '          {size === "full" && <button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />}',
    "NARA_BACKDROP",
  );

  if (!source.includes('data-nara-interaction={size === "full" ? "modal" : "nonmodal"}') || !source.includes("recognition.current = null")) {
    throw new Error("PATCH_V177_NARA_INCOMPLETE");
  }
  return source;
});

patchFile("src/studio-recovery-v150.js", (input) => {
  let source = input;
  source = replaceOnce(
    source,
    '    <button type="button" role="menuitem" data-action="install"><span>Dapatkan aplikasi</span><small>Pasang PWA pada handphone atau komputer</small></button>\n',
    "",
    "PROFILE_REMOVE_INSTALL",
  );
  source = replaceOnce(
    source,
    '    if (action === "profile" || action === "settings") openSettings();',
    '    if (action === "profile") { closeProfileMenu(); window.dispatchEvent(new CustomEvent("ngeblogging:open-profile")); }\n    if (action === "settings") { closeProfileMenu(); window.dispatchEvent(new CustomEvent("ngeblogging:open-settings")); }',
    "PROFILE_ACTIONS",
  );
  if (!source.includes("ngeblogging:open-profile") || !source.includes("ngeblogging:open-settings")) {
    throw new Error("PATCH_V177_PROFILE_MENU_INCOMPLETE");
  }
  return source;
});

console.log(`Studio screenshot authority ${RELEASE} aktif.`);
