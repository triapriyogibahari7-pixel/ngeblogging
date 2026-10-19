import {defineConfig} from 'vite';
import {transformBrandingHtml} from './scripts/branding-v415.mjs';
import {transformHtmlAccess} from './scripts/theme-html-access-v435.mjs';
import {brandPng} from './scripts/brand-icons-v415.mjs';
export default defineConfig({plugins:[{name:'ngeblogging-account-names-v422',enforce:'pre',transform:transformHtmlAccess,transformIndexHtml:transformBrandingHtml,generateBundle(){for(const size of [180,192,512])this.emitFile({type:'asset',fileName:`brand/icon-${size}-v415.png`,source:brandPng(size)});}}]});
