import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformPublicTypography} from '../scripts/public-typography-v444.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('theme frame receives width CSS without changing template or widget inputs',()=>{const source=read('src/theme-system.js'),out=transformPublicTypography(source,'/repo/src/theme-system.js').code;assert.ok(out.includes('${widgetCss}${themeWidthCssV476}'));assert.ok(out.includes('widgetsMarkup(widgets, "sidebar")'));assert.ok(out.includes('code?.html'));assert.equal(transformPublicTypography(out,'/repo/src/theme-system.js'),null);});
test('public article renderer imports width CSS and preserves title and sidebar',()=>{const out=transformPublicTypography(read('src/PublicSiteNext.jsx'),'/repo/src/PublicSiteNext.jsx').code;assert.ok(out.includes('import "./styles/public-width-v476.css"'));assert.ok(out.includes('<h1>{content.title}</h1>'));assert.ok(out.includes('className="ps-side"'));});
test('editor and storage modules untouched',()=>{for(const path of ['ContentEditor.jsx','StudioNext.jsx','MediaLibrary.jsx','lib/content-data.js'])assert.equal(transformPublicTypography('same','/repo/src/'+path),null);});
test('theme spacing and family max widths are not zeroed globally',()=>{const css=read('src/styles/public-width-v476.css');assert.ok(css.includes('padding-inline:clamp(18px,2vw,32px)!important'));assert.ok(!css.includes('padding-inline:0'));assert.ok(!css.includes(':has('));assert.ok(!css.includes('.ng-section'));assert.ok(!css.includes('.ng-header'));assert.ok(!css.includes('.ng-cards{'));assert.ok(!css.includes('display:none'));assert.ok(!css.includes('100vw'));assert.ok(!css.includes('.ce-'));});
