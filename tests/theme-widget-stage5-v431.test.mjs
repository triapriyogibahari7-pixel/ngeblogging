import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILT_IN_THEMES,THEME_COUNT,activateTheme,createDefaultThemeState,normalizeThemeState,saveThemeWidgets,serializeThemeBackup,parseThemeFile,saveThemeState,loadThemeState,buildThemeSrcDoc} from '../src/theme-system.js';
import {BUILT_IN_WIDGETS,LAYOUT_AREAS,normalizeWidgetState,widgetPreviewMarkup} from '../src/widget-system.js';
import {transformWidgetDialog} from '../scripts/widget-dialog-v430.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function transformed(path){const source=read(path);return transformWidgetDialog(source,'/'+path)?.code||source;}
test('catalog has exactly 100 distinct theme identifiers',()=>{assert.equal(THEME_COUNT,100);assert.equal(BUILT_IN_THEMES.length,100);assert.equal(new Set(BUILT_IN_THEMES.map(x=>x.id)).size,100);});
test('all catalog themes activate and compose independently',async t=>{
  for(const theme of BUILT_IN_THEMES)await t.test(theme.id,()=>{
    assert.ok(theme.name&&theme.layout&&theme.colors?.primary);
    assert.equal(typeof theme.code?.html,'string');assert.ok(theme.code.html.length>0);
    assert.equal(typeof theme.code?.css,'string');assert.ok(theme.code.css.length>0);
    const original=createDefaultThemeState();const before=JSON.stringify(original);const state=activateTheme(original,theme.id);
    assert.equal(JSON.stringify(original),before,'activation must not mutate the source state');
    assert.equal(state.activeThemeId,theme.id);assert.equal(state.previewThemeId,theme.id);
    const html=buildThemeSrcDoc(state.code,state.publishedConfig,state.widgets);
    assert.ok(html.startsWith('<!doctype html>'));assert.ok(html.includes('name="viewport"'));assert.ok(html.includes(theme.id));assert.ok(html.includes('</html>'));
    assert.equal(normalizeThemeState(state).activeThemeId,theme.id);
  });
});
test('26 widget identifiers and 26 area identifiers are unique',()=>{assert.equal(BUILT_IN_WIDGETS.length,26);assert.equal(LAYOUT_AREAS.length,26);assert.equal(new Set(BUILT_IN_WIDGETS.map(x=>x.id)).size,26);assert.equal(new Set(LAYOUT_AREAS.map(x=>x.id)).size,26);});
test('custom code preserves settings in every supported area',()=>{
  for(const area of LAYOUT_AREAS){const input=[{id:'custom-html',enabled:true,area:area.id,order:0,title:'Kode pengujian',settings:{html:'<div>Konten uji</div>',javascript:'document.title="uji";'}}];const result=normalizeWidgetState(input);assert.equal(result.length,1);assert.equal(result[0].area,area.id);assert.deepEqual(result[0].settings,input[0].settings);}
});
test('code widget iframe remains isolated and escapes srcdoc attributes',()=>{const html=widgetPreviewMarkup('custom-html','Judul " uji','header-primary-right',{html:'<p data-note="uji">Isi</p>',javascript:'document.title="uji";'});assert.ok(html.includes('<iframe'));assert.ok(html.includes('sandbox="allow-scripts allow-forms"'));assert.ok(!html.includes('allow-same-origin'));assert.ok(html.includes('srcdoc="'));assert.ok(html.includes('&lt;p'));});
test('backup and restore preserve active theme and custom widget settings',()=>{
  const original=activateTheme(createDefaultThemeState(),BUILT_IN_THEMES[37].id);
  const widgets=[{id:'custom-html',enabled:true,area:'header-primary-right',order:0,title:'Kode tersimpan',settings:{html:'<strong>Uji simpan</strong>',javascript:'console.log("uji");'}}];
  const saved=saveThemeWidgets(original,widgets);const restored=parseThemeFile(serializeThemeBackup(saved));
  assert.equal(restored.activeThemeId,saved.activeThemeId);assert.deepEqual(restored.widgets,saved.widgets);
});
test('storage round-trip uses an in-memory mock, not cloud or user storage',()=>{
  const values=new Map();const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const state=activateTheme(createDefaultThemeState(),BUILT_IN_THEMES[62].id);saveThemeState(state,storage);
  const restored=loadThemeState(storage);assert.equal(restored.activeThemeId,state.activeThemeId);assert.deepEqual(restored.widgets,state.widgets);assert.equal(values.size,1);
});
test('stages 1-4 integrate into the actual ThemeStudio source',()=>{
  const source=transformed('src/ThemeStudio.jsx');
  for(const marker of ['components/theme/WidgetStudioV427','components/theme/ThemeLayoutMapV428','ngeblogging:open-widget-code-v427','theme={previewTheme}','editable={previewTheme.id===activeTheme.id}','isWidgetDialog','tn-widget-modal-v430','portal || isWidgetDialog'])assert.ok(source.includes(marker),marker);
  assert.ok(!source.includes('function WidgetStudio({ value, onChange })'));
  assert.ok(!source.includes('function LayoutMap({ widgets, onOpenWidgets, mode, onModeChange })'));
});
test('new map opens area cards instead of the old inline editor',()=>{
  const source=transformed('src/components/theme/ThemeLayoutMapV428.jsx');
  assert.ok(source.includes('LayoutAreaCardV429'));assert.ok(source.includes('areaTrigger.current=event.currentTarget'));assert.ok(source.includes('entries={active.filter(x=>x.area===area.id)}'));
  assert.ok(!source.includes('className="tl428-area-editor"'));
});
test('legacy map does not append a generic diagram to the new map',()=>{const source=transformed('src/studio-theme-layout-v264.js');assert.ok(source.includes('studio?.dataset.layoutV428 === "true"'));assert.ok(source.includes('openCodeEditor(area)'));assert.ok(source.includes('ngeblogging:open-widget-code-v427'));});
test('public renderer links real posts and keeps custom code eligible',()=>{
  const source=transformed('src/PublicSiteNext.jsx');
  assert.ok(source.includes('postLink.href=linkTo(post.slug)'));assert.ok(source.includes("'tags','custom-html'"));assert.ok(source.includes('<FeaturedImage src={content.featured_image_path}'));assert.ok(source.includes('./styles/public-layout-v429.css'));
});
test('widget inputs preserve code as settings and do not evaluate it in Studio',()=>{
  const source=read('src/components/theme/WidgetStudioV427.jsx');
  assert.ok(source.includes('value={entry.settings?.html||'));assert.ok(source.includes('value={entry.settings?.javascript||'));assert.ok(source.includes("setting(widget.id,entry,'html'"));assert.ok(source.includes("setting(widget.id,entry,'javascript'"));
  assert.ok(!/\beval\s*\(|new\s+Function\s*\(|dangerouslySetInnerHTML/.test(source));
});
test('widget header and summary geometry stays scoped',()=>{const css=read('src/styles/widget-dialog-v430.css');assert.ok(css.includes('.tn-widget-modal-v430>.tn-modal>header'));assert.ok(css.includes('grid-template-rows:auto minmax(0,1fr) auto'));assert.ok(css.includes('grid-template-columns:minmax(0,1fr) auto'));assert.ok(css.includes('@media(max-width:760px)'));});
test('source mismatch fails closed instead of silently replacing unrelated code',()=>{assert.throws(()=>transformWidgetDialog('export default function Other(){}','/src/ThemeStudio.jsx'));});
