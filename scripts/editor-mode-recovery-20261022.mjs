const MARK = '/* EDITOR_THREE_MODES_RECOVERY_20261022 */';
function once(code, anchor, replacement) {
  if (code.split(anchor).length !== 2) throw new Error('EDITOR_MODE_RECOVERY_ANCHOR: ' + anchor.slice(0, 80));
  return code.replace(anchor, replacement);
}
export function transformEditorModeRecovery(code, id) {
  const path = id.split('?')[0].replaceAll('\\', '/');
  if (code.includes(MARK)) return null;
  if (path.endsWith('/src/ContentEditor.jsx')) {
    const anchor = '    <nav className="ce-tabs">';
    code = once(code, anchor, '    <EditorModeRecovery20261022/>\n' + anchor);
    return {code: MARK + '\nimport EditorModeRecovery20261022 from "./EditorModeRecovery20261022.jsx";\n' + code, map: null};
  }
  if (path.endsWith('/src/studio-device-mode-v140.js')) {
    const anchor = 'function classifyResponsiveMode(view, handheld, desktopSitePhone = desktopSiteRequested(view, handheld)) {';
    code = once(code, anchor, anchor + '\n  const editorOverride = editorResponsiveOverride(view);\n  if (editorOverride) return editorOverride;');
    return {code: MARK + '\nimport {editorResponsiveOverride} from "./lib/editor-mode-recovery-20261022.mjs";\n' + code, map: null};
  }
  return null;
}
