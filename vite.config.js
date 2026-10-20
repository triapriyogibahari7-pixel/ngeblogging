import {defineConfig} from 'vite';
import {transformBrandingHtml} from './scripts/branding-v415.mjs';
import {transformThemePreview} from './scripts/theme-preview-v443.mjs';
import {transformEditorShell} from './scripts/editor-shell-v444.mjs';
import {transformPublicTypography} from './scripts/public-typography-v444.mjs';
import {transformEditorTabs} from './scripts/editor-tabs-v445.mjs';
import {brandPng} from './scripts/brand-icons-v415.mjs';
export default defineConfig({plugins:[{name:'ngeblogging-editor-tabs-v445',enforce:'pre',transform:transformEditorTabs},{name:'ngeblogging-public-typography-v444',enforce:'pre',transform:transformPublicTypography},{name:'ngeblogging-editor-shell-v444',enforce:'pre',transform:transformEditorShell},{name:'ngeblogging-account-names-v422',enforce:'pre',transform:transformThemePreview,transformIndexHtml:transformBrandingHtml,generateBundle(){for(const size of [180,192,512])this.emitFile({type:'asset',fileName:`brand/icon-${size}-v415.png`,source:brandPng(size)});}}]});
