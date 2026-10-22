const MARK = '/* SIDEBAR_HEIGHT_RESET_20261022 */';
export function repairSidebarHeight(code, id) {
  const path = id.split('?')[0].replaceAll('\\', '/');
  if (!path.endsWith('/src/studio-sidebar-hard-lock-v301.js')) return null;
  if (code.includes(MARK)) return null;
  const anchor = '  important(side, "height", "100dvh");\n  important(side, "padding", "10px 8px");';
  if (code.split(anchor).length !== 2) throw new Error('SIDEBAR_HEIGHT_RESET_ANCHOR_MISMATCH');
  const replacement = '  important(side, "height", "100dvh");\n  important(side, "min-height", "0");\n  important(side, "max-height", "100dvh");\n  important(side, "padding", "10px 8px");';
  return {code: MARK + '\n' + code.replace(anchor, replacement), map: null};
}
