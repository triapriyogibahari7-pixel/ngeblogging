import {defineConfig} from 'vite';
import {transformBrandingModule,transformBrandingHtml} from './scripts/branding-v415.mjs';
import {brandPng} from './scripts/brand-icons-v415.mjs';
export default defineConfig({plugins:[{name:'ngeblogging-branding-v415',enforce:'pre',transform:transformBrandingModule,transformIndexHtml:transformBrandingHtml,generateBundle(){for(const size of [180,192,512])this.emitFile({type:'asset',fileName:`brand/icon-${size}-v415.png`,source:brandPng(size)});}}]});
