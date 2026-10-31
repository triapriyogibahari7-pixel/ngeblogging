import {defineConfig} from 'vite';
import {transformBrandingHtml} from './scripts/branding-v415.mjs';
import {transformThemeCustomizer} from './scripts/theme-customizer-desktop.mjs';
import {brandPng} from './scripts/brand-icons-v415.mjs';
import {runStage5NativeBuild} from './scripts/stage5-cloudflare-native-build.mjs';
import {runStage5BuildDiagnostics} from './scripts/stage5-build-diagnostics.mjs';
export default defineConfig(async({command})=>{
  if(command==='build')await runStage5BuildDiagnostics(runStage5NativeBuild);
  return {plugins:[{name:'ngeblogging-account-names-v422',enforce:'pre',transform:transformThemeCustomizer,transformIndexHtml:transformBrandingHtml,generateBundle(){for(const size of [180,192,512])this.emitFile({type:'asset',fileName:`brand/icon-${size}-v415.png`,source:brandPng(size)});}}]};
});
