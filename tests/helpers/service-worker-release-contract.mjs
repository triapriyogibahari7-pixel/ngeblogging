import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
export function assertServiceWorkerRelease(source,{minimumVersion=305}={}){
 const handlers=new Map();
 const self={location:{origin:'https://ngeblogging.com'},addEventListener:(type,handler)=>{assert.equal(handlers.has(type),false,'duplicate service-worker handler');handlers.set(type,handler);}};
 const state=runInNewContext(source+'\n;({VERSION,CACHE_RELEASE,SHELL_CACHE,ASSET_CACHE,ACTIVE_VERSION_V303,ACTIVE_CACHE_RELEASE_V303,ACTIVE_VERSION_V305,ACTIVE_CACHE_RELEASE_V305,payload:versionPayload("TEST"),isAuthSurface,notifyOpenWindows});',{self,URL},{timeout:1000});
 const version=state.VERSION.match(/^ngeblogging-app-v(\d+)-[a-z0-9-]+$/);
 assert.ok(version,'active service-worker version must be explicit');
 assert.ok(Number(version[1])>=minimumVersion,'active service-worker version regressed');
 const cache=state.CACHE_RELEASE.match(/(?:^|-)v(\d+)(?:-|$)/);
 assert.ok(cache,'cache release must identify its version');
 assert.equal(cache[1],version[1],'active version and cache release must rotate together');
 assert.equal(state.SHELL_CACHE,`${state.VERSION}-${state.CACHE_RELEASE}-shell`);
 assert.equal(state.ASSET_CACHE,`${state.VERSION}-${state.CACHE_RELEASE}-assets`);
 assert.notEqual(state.SHELL_CACHE,state.ASSET_CACHE);
 for(const suffix of ['V303','V305']){assert.equal(state['ACTIVE_VERSION_'+suffix],state.VERSION);assert.equal(state['ACTIVE_CACHE_RELEASE_'+suffix],state.CACHE_RELEASE);}
 assert.equal(state.payload.version,state.VERSION);
 assert.equal(state.payload.release,state.CACHE_RELEASE);
 assert.equal(state.payload.studioAddSiteReleaseV303,'studio-add-site-free-subdomain-v303-20260805');
 assert.equal(state.payload.studioSidebarHardLockReleaseV301,'studio-sidebar-hard-lock-v301-20260805');
 for(const path of ['/login','/signup','/signin','/forgot-password','/reset-password','/auth/callback','/?code=test','/?auth=recovery'])assert.equal(state.isAuthSurface(new URL(path,self.location.origin)),true,path);
 assert.equal(state.isAuthSurface(new URL('/studio',self.location.origin)),false);
 assert.ok(handlers.has('activate'));assert.ok(handlers.has('message'));assert.ok(handlers.has('fetch'));
 let intercepted=0;
 const respondWith=()=>{intercepted++;};
 for(const [method,path] of [['GET','/api/domains/config'],['GET','/auth/callback'],['POST','/studio']])handlers.get('fetch')({request:{method,url:new URL(path,self.location.origin).href,mode:'navigate'},respondWith});
 assert.equal(intercepted,0,'API, auth and mutation requests must bypass service-worker caching');
 const notify=String(state.notifyOpenWindows);
 assert.match(notify,/reloadRequired:\s*false/);
 assert.doesNotMatch(notify,/await\s+client\.navigate|location\.(?:reload|replace)\s*\(/);
 assert.doesNotMatch(source,/localStorage\.clear|sessionStorage\.clear|location\.(?:reload|replace)\s*\(/);
 return {version:state.VERSION,cacheRelease:state.CACHE_RELEASE};
}
