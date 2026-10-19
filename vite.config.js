import {defineConfig} from 'vite';
import {transformBrandingHtml} from './scripts/branding-v415.mjs';
import {transformSiteMenus} from './scripts/site-menus-v420.mjs';
import {brandPng} from './scripts/brand-icons-v415.mjs';
export default defineConfig({plugins:[{name:'ngeblogging-site-menus-v420',enforce:'pre',transform:transformSiteMenus,transformIndexHtml:transformBrandingHtml,generateBundle(){for(const size of [180,192,512])this.emitFile({type:'asset',fileName:`brand/icon-${size}-v415.png`,source:brandPng(size)});}}]});
