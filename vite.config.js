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
  const integration=[];
  if(command==='build'&&native?.proof?.cloudflareBuild?.branch==='feature/domain-stages5-10-integration-20261030'){
    const {buildStage5TransferPackage}=await import('./scripts/build-stage5-transfer-package.mjs');
    await buildStage5TransferPackage({commit:native.proof.cloudflareBuild.commit});
    integration.push({name:'stage5-studio-transfer-preview-entry',enforce:'pre',transform(source,id){
      if(!id.split('?')[0].replace(/\\/g,'/').endsWith('/src/StudioNext.jsx'))return null;
      const from='import DomainPanelV124 from "./DomainPanelV124.jsx";',entry='<DomainPanelV124 site={site} sites={sites} onSiteUpdate={setSite} setToast={setToast}/>';
      if(source.split(from).length!==2||source.split(entry).length!==2)throw Error('STAGE5_STUDIO_ENTRY_ANCHOR_CHANGED');
      return {code:source.replace(from,'import DomainPanelV124 from "./DomainPanelStage5Entry.jsx";').replace(entry,'<DomainPanelV124 user={user} site={site} sites={sites} onSiteUpdate={setSite} setToast={setToast}/>'),map:null};
    }});
  }
  return {...diagnostic,plugins:[...diagnostic.plugins,{name:'ngeblogging-account-names-v422',enforce:'pre',transform:transformThemeCustomizer,transformIndexHtml:transformBrandingHtml,generateBundle(){for(const size of [180,192,512])this.emitFile({type:'asset',fileName:`brand/icon-${size}-v415.png`,source:brandPng(size)});}},...integration]};
});
