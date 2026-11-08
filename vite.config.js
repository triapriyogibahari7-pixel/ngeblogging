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
import {runReferenceFxCloudflareBuild} from './scripts/domain-reference-fx-cloudflare-build.mjs';
import {provisionPublicAuditorPreview} from './scripts/provision-public-auditor-preview.mjs';
export default defineConfig(async({command})=>{
  const referenceFxProof=command==='build'?runReferenceFxCloudflareBuild():null;
  if(command==='build'&&process.env.WORKERS_CI==='1'&&process.env.WORKERS_CI_BRANCH==='agent/fix-live-registrar-search-20261103'){
    const checked=spawnSync(process.execPath,['--test','tests/live-registrar-search.test.mjs','tests/registrar-search-view.test.mjs'],{env:{PATH:process.env.PATH||'',CI:'true',NODE_ENV:'test',LANG:'C.UTF-8'},stdio:'inherit',shell:false,timeout:120000});
    if(checked.error||checked.signal||checked.status!==0)throw Error('LIVE_REGISTRAR_SEARCH_TESTS_FAILED');
  }
  let registrarSyncPlan=null;
  if(command==='build'&&process.env.WORKERS_CI==='1'&&process.env.WORKERS_CI_BRANCH==='agent/sync-registrar-runtime-20261103'){
    const {runRegistrarRuntimeSyncPreflight}=await import('./scripts/registrar-runtime-sync-preflight.mjs');
    registrarSyncPlan=await runRegistrarRuntimeSyncPreflight();
  }
  let previewQuality=null;
  if(command==='build'&&process.env.WORKERS_CI==='1'&&['fix/domain-commerce-midtrans-20261102','agent/fix-domain-search-pricing-20261103'].includes(process.env.WORKERS_CI_BRANCH)){
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
  if(referenceFxProof)integration.push(referenceFxProof);
  if(registrarSyncPlan)integration.push(registrarSyncPlan);
  if(previewQuality)integration.push(previewQuality);
  if(command==='build'){
    integration.push({name:'worker-free-variable-limit-prepare',closeBundle(){
      const prepared=spawnSync(process.execPath,[resolve('scripts/prepare-worker-connector-capacity.mjs')],{cwd:process.cwd(),env:process.env,stdio:'inherit',timeout:90000});
      if(prepared.error||prepared.status!==0) throw Error('WORKER_VARIABLE_PREPARE_FAILED_NO_DEPLOY');
    }});
    integration.push({name:'public-auditor-preview-provision',closeBundle:provisionPublicAuditorPreview});
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
