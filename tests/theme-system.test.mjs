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
  saveThemeWidgets,
  serializeThemeBackup,
} from "../src/theme-system.js";

 test("theme state normalizes unsafe or malformed values", () => {
  const state = normalizeThemeState({
    activeThemeId: "missing-theme",
    draftConfig: { primary: "red", radius: 999, brandName: 42 },
    code: { html: 44 },
  });
  assert.equal(state.activeThemeId, "editorial-prime");
  assert.match(state.draftConfig.primary, /^hsl\(/);
  assert.equal(state.draftConfig.radius, 40);
  assert.equal(typeof state.code.html, "string");
  assert.ok(Array.isArray(state.widgets));
});

test("theme backup round-trips widgets and records an import version", () => {
  const state = activateTheme(createDefaultThemeState(), "collective-prime");
  const withWidgets = saveThemeWidgets(state, [...state.widgets, { id:"faq",enabled:true,area:"footer",order:99,title:"FAQ",settings:{} }]);
  const restored = parseThemeFile(serializeThemeBackup(withWidgets));
  assert.equal(restored.activeThemeId, "collective-prime");
  assert.equal(restored.history[0].note, "Tema diimpor");
  assert.ok(restored.widgets.some((widget) => widget.id === "faq"));
});

test("publishing and restoring a version preserves configuration", () => {
  const initial = createDefaultThemeState();
  const published = publishThemeDraft(initial, { ...initial.draftConfig, accent: "#123456" });
  assert.equal(published.publishedConfig.accent, "#123456");
  const restored = restoreThemeVersion(published, initial.history[0].id);
  assert.equal(restored.publishedConfig.accent, initial.publishedConfig.accent);
});

test("custom preview escapes closing script tags and adds sandbox CSP", () => {
  const doc = buildThemeSrcDoc({ html: "<main>OK</main>", css: "", javascript: "console.log('</script>')" });
  assert.match(doc, /<\\\/script>/);
  assert.doesNotMatch(doc, /console\.log\('<\/script>'\)/);
  assert.match(doc, /Content-Security-Policy/);
  assert.match(doc, /frame-ancestors 'none'/);
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
