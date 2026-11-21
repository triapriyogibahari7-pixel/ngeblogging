import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {assertServiceWorkerRelease} from './helpers/service-worker-release-contract.mjs';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const css=await read('src/studio-mobile-final-v369.css'),editor=await read('src/ContentEditor.jsx'),studio=await read('src/StudioNext.jsx'),comments=await read('src/CommentsPanelV124.jsx'),sw=await read('public/sw.js');
test('v369 mobile authority is loaded after existing editor/studio CSS',()=>{assert.match(editor,/content-editor-mobile-v324\.css/);assert.match(editor,/studio-mobile-app-pages-editor-v368\.css/);assert.match(studio,/studio-recovery-v135\.css/);assert.match(studio,/studio-mobile-app-pages-editor-v368\.css/);});
test('v369 only targets the small device family',()=>{assert.match(css,/html\[data-studio-device-mode="small"\]/);assert.match(css,/html\.editor-v266-small/);assert.doesNotMatch(css,/data-studio-device-mode="large"/);assert.doesNotMatch(css,/editor-v266-large/);assert.doesNotMatch(css,/@media\s*\(min-width/);});
test('v369 covers Studio surfaces including comment pages through their shared page ancestor',()=>{
 for(const marker of ['.sn-view-pad','.sn-content-card','.sn-settings-grid','.sn-members','.sn-api-page','.sv124-page','.sv124-comment-workspace','.sv124-domain-page','.tn-studio','.sn-analytics-data-host','.ce-app','.ce-paper','.ce-sidebar','.ce-preview-layer','.ce-source-layer'])assert.ok(css.includes(marker),'missing mobile selector: '+marker);
 assert.match(comments,/className="sv124-page sv124-comments-page"/);
 assert.match(css,/:is\(html\.editor-v266-small,html\[data-studio-device-mode="small"\]\) \.sv124-page\s*,/);
 assert.match(css,/overflow-wrap:anywhere/);assert.match(css,/min-height:44px/);assert.match(css,/font-size:16px/);assert.match(css,/@media\(display-mode:\s*standalone\)/);
});
test('v369 keeps editor SEO/content implementation unchanged',()=>{assert.match(editor,/const isPage = doc\.type === "page"/);assert.match(editor,/dangerouslySetInnerHTML=\{\{ __html: doc\.content \|\| "" \}\}/);assert.match(editor,/<h1>\{doc\.title\}<\/h1>/);assert.match(editor,/canonicalUrl/);assert.match(editor,/schemaType/);});
test('active service-worker cache rotates coherently beyond the legacy mobile release',()=>{assertServiceWorkerRelease(sw,{minimumVersion:369});assert.match(sw,/ngeblogging-app-v369-mobile-final-20261001/);assert.match(sw,/studio-mobile-final-cache-v369/);});
test('service-worker release validation rejects regressed versions and stale cache aliases',()=>{
 assert.throws(()=>assertServiceWorkerRelease(sw.replace(/^const VERSION = [^;]+;/m,'const VERSION = "ngeblogging-app-v304-regression";')));
 assert.throws(()=>assertServiceWorkerRelease(sw.replace(/^const CACHE_RELEASE = [^;]+;/m,'const CACHE_RELEASE = "v304-stale-cache";')));
 assert.throws(()=>assertServiceWorkerRelease(sw.replace(/^const ACTIVE_VERSION_V305 = [^;]+;/m,'const ACTIVE_VERSION_V305 = "stale-version";')));
});
test('v369 editor uses natural mobile flow and never changes large layout',()=>{assert.match(css,/\.ce-titlebar[\s\S]*position:relative!important/);assert.match(css,/\.ce-tabs[\s\S]*position:relative!important/);assert.match(css,/\.ce-ribbon[\s\S]*position:relative!important/);assert.match(css,/\.ce-workspace[\s\S]*display:flex!important/);assert.match(css,/\.ce-field-grid[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);assert.doesNotMatch(css,/html\.editor-v266-large/);assert.doesNotMatch(css,/data-studio-device-mode="large"/);});
