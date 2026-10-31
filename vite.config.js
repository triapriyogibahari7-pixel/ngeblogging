import {defineConfig} from 'vite';
import {transformBrandingHtml} from './scripts/branding-v415.mjs';
import {transformThemeCustomizer} from './scripts/theme-customizer-desktop.mjs';
import {brandPng} from './scripts/brand-icons-v415.mjs';
import {runStage5NativeBuild} from './scripts/stage5-cloudflare-native-build.mjs';
import {runStage5AuthTransferBuild} from './scripts/stage5-auth-transfer-build.mjs';
import {runStage5BuildDiagnostics,makeStage5PreviewOnlyConfig} from './scripts/stage5-build-diagnostics.mjs';
export default defineConfig(async({command})=>{
  const native=command==='build'?await runStage5BuildDiagnostics(async()=>{await runStage5NativeBuild();await runStage5AuthTransferBuild();}):null;
  const diagnostic=command==='build'?makeStage5PreviewOnlyConfig(native):{build:{},plugins:[]};
  return {...diagnostic,plugins:[...diagnostic.plugins,{name:'ngeblogging-account-names-v422',enforce:'pre',transform:transformThemeCustomizer,transformIndexHtml:transformBrandingHtml,generateBundle(){for(const size of [180,192,512])this.emitFile({type:'asset',fileName:`brand/icon-${size}-v415.png`,source:brandPng(size)});}}]};
});
