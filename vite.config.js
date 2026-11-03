import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {transformBrandingHtml} from './scripts/branding-v415.mjs';
import {transformThemeCustomizer} from './scripts/theme-customizer-desktop.mjs';
import {brandPng} from './scripts/brand-icons-v415.mjs';
import {runStage5NativeBuild} from './scripts/stage5-cloudflare-native-build.mjs';
import {runStage5AuthTransferBuild} from './scripts/stage5-auth-transfer-build.mjs';
import {runStage5BuildDiagnostics,makeStage5PreviewOnlyConfig} from './scripts/stage5-build-diagnostics.mjs';
import {runDomainCommerceBuildGate,domainCommerceBuildProofPlugin} from './scripts/domain-commerce-cloudflare-build.mjs';
import {runLifecycleDiagnostic} from './scripts/domain-quality/lifecycle-diagnostic.mjs';
import {runAutonomousDomainProbe} from './scripts/domain-quality/autonomous-runtime-probe.mjs';
export default defineConfig(async({command})=>{
  if(command==='build')await runAutonomousDomainProbe(runLifecycleDiagnostic);
  if(command==='build')await runLifecycleDiagnostic();
  let previewQuality=null;
  if(command==='build'&&process.env.WORKERS_CI==='1'&&process.env.WORKERS_CI_BRANCH==='fix/domain-commerce-midtrans-20261102'){
    const {runCloudflarePreviewGate}=await import('./scripts/domain-quality/cloudflare-preview-gate.mjs');
    previewQuality=runCloudflarePreviewGate();
  }
  if(command==='build'&&process.env.WORKERS_CI==='1'&&process.env.WORKERS_CI_BRANCH==='feat/domain-commerce-cloudflare-prod-20261102'&&JSON.parse(readFileSync(resolve('package.json'),'utf8')).devDependencies?.wrangler==='4.113.0'){
    const repair=spawnSync(process.execPath,[resolve('scripts/domain-commerce-repair-toolchain.mjs')],{cwd:process.cwd(),env:process.env,stdio:'inherit',timeout:900000});
    throw Error(repair.status===78?'DOMAIN_TOOLCHAIN_REPAIR_BUNDLE_READY_NO_DEPLOY':'DOMAIN_TOOLCHAIN_REPAIR_FAILED_NO_DEPLOY');
  }
  const commerce=command==='build'&&process.env.WORKERS_CI==='1'?await runDomainCommerceBuildGate():null;
  const native=command==='build'?await runStage5BuildDiagnostics(async()=>{await runStage5NativeBuild();await runStage5AuthTransferBuild();}):null;
  const diagnostic=command==='build'?makeStage5PreviewOnlyConfig(native):{build:{},plugins:[]};
  const integration=[];
  if(previewQuality)integration.push(previewQuality);
  if(command==='build'){
    integration.push({name:'worker-free-variable-limit-prepare',closeBundle(){
      const prepared=spawnSync(process.execPath,[resolve('scripts/deploy-worker-free-limit.mjs'),'--prepare'],{cwd:process.cwd(),env:process.env,stdio:'inherit',timeout:60000});
      if(prepared.error||prepared.status!==0) throw Error('WORKER_VARIABLE_PREPARE_FAILED_NO_DEPLOY');
    }});
  }
  if(command==='build'&&native?.proof?.cloudflareBuild?.branch==='feature/domain-stages5-10-integration-20261030'){
    const {buildStage5TransferPackage}=await import('./scripts/build-stage5-transfer-package.mjs');
    await buildStage5TransferPackage({commit:native.proof.cloudflareBuild.commit});
  }
  integration.push({name:'domain-studio-integrated-entry',enforce:'pre',transform(source,id){
    if(!id.split('?')[0].replace(/\\/g,'/').endsWith('/src/StudioNext.jsx'))return null;
    const from='import DomainPanelV124 from "./DomainPanelV124.jsx";',entry='<DomainPanelV124 site={site} sites={sites} onSiteUpdate={setSite} setToast={setToast}/>';
    if(source.split(from).length!==2||source.split(entry).length!==2)throw Error('DOMAIN_STUDIO_ENTRY_ANCHOR_CHANGED');
    return {code:source.replace(from,'import DomainPanelV124 from "./DomainPanelProductionEntry.jsx";').replace(entry,'<DomainPanelV124 user={user} site={site} sites={sites} onSiteUpdate={setSite} setToast={setToast}/>'),map:null};
  }});
  if(diagnostic.build?.rollupOptions?.input!==undefined)throw Error('DOMAIN_STATUS_BUILD_INPUT_CONFLICT');
  const build={...diagnostic.build,rollupOptions:{...diagnostic.build?.rollupOptions,input:{index:resolve('index.html'),domainOrderStatus:resolve('domain-order-status.html')}}};
  return {...diagnostic,build,plugins:[...diagnostic.plugins,...(commerce?.selected?[domainCommerceBuildProofPlugin(commerce)]:[]),{name:'ngeblogging-account-names-v422',enforce:'pre',transform:transformThemeCustomizer,transformIndexHtml(html,context){if(context?.filename?.replace(/\\/g,'/').endsWith('/domain-order-status.html'))return html;return transformBrandingHtml(html);},generateBundle(){for(const size of [180,192,512])this.emitFile({type:'asset',fileName:`brand/icon-${size}-v415.png`,source:brandPng(size)});}},...integration]};
});
