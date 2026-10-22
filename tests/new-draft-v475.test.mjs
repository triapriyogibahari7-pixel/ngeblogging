import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformNewDraftV475,transformContentLimit} from '../scripts/content-limit-v449.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('new cloud draft starts empty without changing existing record loader',()=>{const source=read('src/lib/content-data.js'),out=transformNewDraftV475(source,'/repo/src/lib/content-data.js').code;assert.ok(out.includes('body_html: "",'));assert.ok(out.includes('content: hydrated ? (record.body_html || "") : null'));assert.equal(transformNewDraftV475(out,'/repo/src/lib/content-data.js'),null);});
test('new local draft empty while starter documents remain untouched',()=>{const source=read('src/StudioNext.jsx'),out=transformContentLimit(source,'/repo/src/StudioNext.jsx').code;assert.ok(out.includes('Post tanpa judul", "")'));const start=source.indexOf('const STARTER = ['),end=source.indexOf('function loadLocalDocs()',start);assert.ok(out.includes(source.slice(start,end)));});
test('title gets accessible label without changing title or content binding',()=>{const out=transformNewDraftV475(read('src/ContentEditor.jsx'),'/repo/src/ContentEditor.jsx').code;assert.ok(out.includes('aria-label={isPage ? "Judul halaman" : "Judul postingan"}'));assert.ok(out.includes('value={doc.title}'));assert.ok(out.includes('initialContent={doc.content || ""}'));});
test('public renderer and persistence hook are not modified',()=>{for(const file of ['PublicSiteNext.jsx','useDocumentSaveV456.jsx'])assert.equal(transformNewDraftV475('unchanged','/repo/src/'+file),null);});
