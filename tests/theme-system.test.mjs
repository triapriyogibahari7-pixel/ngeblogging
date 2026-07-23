import assert from "node:assert/strict";
import test from "node:test";
import {
  activateTheme,
  buildThemeSrcDoc,
  createDefaultThemeState,
  normalizeThemeState,
  parseThemeFile,
  publishThemeDraft,
  restoreThemeVersion,
  saveThemeCode,
  serializeThemeBackup,
} from "../src/theme-system.js";

test("theme state normalizes unsafe or malformed values", () => {
  const state = normalizeThemeState({
    activeThemeId: "missing-theme",
    draftConfig: { primary: "red", radius: 999, brandName: 42 },
    code: { html: 44 },
  });
  assert.equal(state.activeThemeId, "editorial-noir");
  assert.equal(state.draftConfig.primary, "#171717");
  assert.equal(state.draftConfig.radius, 32);
  assert.equal(typeof state.code.html, "string");
});

test("theme backup round-trips and records an import version", () => {
  const state = activateTheme(createDefaultThemeState(), "collective-hub");
  const restored = parseThemeFile(serializeThemeBackup(state));
  assert.equal(restored.activeThemeId, "collective-hub");
  assert.equal(restored.history[0].note, "Tema diimpor");
});

test("publishing and restoring a version preserves configuration", () => {
  const initial = createDefaultThemeState();
  const published = publishThemeDraft(initial, { ...initial.draftConfig, accent: "#123456" });
  assert.equal(published.publishedConfig.accent, "#123456");
  const restored = restoreThemeVersion(published, initial.history[0].id);
  assert.equal(restored.publishedConfig.accent, initial.publishedConfig.accent);
});

test("custom preview escapes closing script tags", () => {
  const doc = buildThemeSrcDoc({ html: "<main>OK</main>", css: "", javascript: "console.log('</script>')" });
  assert.match(doc, /<\\\/script>/);
  assert.doesNotMatch(doc, /console\.log\('<\/script>'\)/);
});

test("saving custom code explicitly enables the sandboxed public renderer", () => {
  const initial = createDefaultThemeState();
  assert.equal(initial.code.enabled, false);
  const updated = saveThemeCode(initial, {
    html: "<main>Custom</main>",
    css: "main{color:red}",
    javascript: "",
  });
  assert.equal(updated.code.enabled, true);
  assert.equal(updated.history[0].note, "Kode tema diperbarui");
});

test("invalid import is rejected", () => {
  assert.throws(() => parseThemeFile("{}"), /Format file/);
  assert.throws(() => parseThemeFile("not-json"), /bukan JSON/);
});
