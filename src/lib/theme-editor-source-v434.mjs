import {getTheme,normalizeThemeState} from '../theme-system.js';
export const CODE_KEYS=['html','css','javascript'];
export function editorSource(stored){if(!stored?.activeThemeId)throw Error('Konfigurasi tema situs belum tersedia di server.');const theme=getTheme(stored.activeThemeId);if(theme.id!==stored.activeThemeId)throw Error('Tema aktif tidak dikenali; editor tidak memakai tema pengganti.');const state=normalizeThemeState(stored);const source=stored.code?.enabled?stored.code:theme.code;const code={enabled:Boolean(stored.code?.enabled)};for(const key of CODE_KEYS)code[key]=typeof source?.[key]==='string'?source[key]:String(theme.code?.[key]||'');return {theme,state,code};}
export function sameCode(a,b){return CODE_KEYS.every(key=>String(a?.[key]??'')===String(b?.[key]??''));}
