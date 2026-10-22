import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformEditorTabs} from '../scripts/editor-tabs-v445.mjs';
import {transformEditorShell} from '../scripts/editor-shell-v444.mjs';
const source=readFileSync(new URL('../src/ContentEditor.jsx',import.meta.url),'utf8');
test('desktop tabs and HTML dialog integrate with shared editor',()=>{const output=transformEditorTabs(source,'/repo/src/ContentEditor.jsx');assert.ok(output.code.includes('data-editor-tab={wideEditorV445 ? tab : undefined}'));assert.equal((output.code.match(/data-ce-panel="metadata"/g)||[]).length,4);assert.ok(output.code.includes('const safe=sanitizeTypographyHtml(sourceDraft)'));assert.ok(output.code.includes('wideEditorV445 ? <EditorHtmlV445'));assert.ok(output.code.includes('className="ce-source-layer"'));assert.ok(transformEditorShell(output.code,'/repo/src/ContentEditor.jsx').code.includes('<EditorLibraryV444/>'));});
test('integration is idempotent and fails closed',()=>{const output=transformEditorTabs(source,'/repo/src/ContentEditor.jsx');assert.equal(transformEditorTabs(output.code,'/repo/src/ContentEditor.jsx'),null);assert.equal(transformEditorTabs(source,'/repo/src/Other.jsx'),null);assert.throws(()=>transformEditorTabs('changed','/repo/src/ContentEditor.jsx'),/ANCHOR_INVALID/);});
