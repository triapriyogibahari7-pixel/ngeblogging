import {defineConfig} from 'vite';
import {transformBrandingHtml} from './scripts/branding-v415.mjs';
import {transformThemePreview} from './scripts/theme-preview-v443.mjs';
import {brandPng} from './scripts/brand-icons-v415.mjs';
import {repairSidebarHeight} from './scripts/sidebar-height-reset-20261022.mjs';
function transformWithSidebarHeight(code,id){const prior=transformThemePreview(code,id);return repairSidebarHeight(prior?.code??code,id)??prior;}
export default defineConfig({plugins:[{name:'ngeblogging-account-names-v422',enforce:'pre',transform:transformWithSidebarHeight,transformIndexHtml:transformBrandingHtml,generateBundle(){for(const size of [180,192,512])this.emitFile({type:'asset',fileName:`brand/icon-${size}-v415.png`,source:brandPng(size)});}}]});
