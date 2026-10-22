import test from 'node:test';import assert from 'node:assert/strict';import {transformDocumentSave} from '../scripts/document-save-v456.mjs';
test('studio transform wires persistence and guarded navigation',()=>{const fixture=`  useEffect(() => { if (dataMode === "local") localStorage.setItem(LOCAL_STORE, JSON.stringify(docs)); }, [docs, dataMode]);
  const persistPatch = (id, values) => { oldSave(); };
  const patch = (values) => {
    if (dataMode === "local") { clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => setSaved(true), 400); }
    else persistPatch(activeId, values);
  };
<ContentEditor saved={saved} patch={patch} onBack={() => setView(active.type === "page" ? "pages" : "posts")}/>`;const out=transformDocumentSave(fixture,'/repo/src/StudioNext.jsx').code;assert.ok(out.includes('onSaveV456={() => persistenceV456.save(active)}'));assert.ok(out.includes('await persistenceV456.flush()'));assert.ok(out.startsWith('/* DOCUMENT_SAVE_V456 */\nimport'));assert.equal(transformDocumentSave(out,'/repo/src/StudioNext.jsx'),null);});
test('editor transform connects callbacks without editing HTML box',()=>{const fixture=`function ContentEditor({saved, patch, publish,}){}
    <div className="ce-ribbon">
{saved ? <><Check/> Tersimpan otomatis</> : <><LoaderCircle className="spin"/> Menyimpan…</>}`;const out=transformDocumentSave(fixture,'/repo/src/ContentEditor.jsx').code;assert.ok(out.includes('onSave={onSaveV456}'));assert.ok(out.includes('Tersimpan di server'));assert.ok(!out.includes('setSourceDraft'));});
test('size guard remains ahead of saved-state text',()=>{const fixture=`function ContentEditor({saved, patch, publish,}){}
    <div className="ce-ribbon">
{String(doc.content || "").length > MAX_CONTENT_UNITS ? "Belum tersimpan: isi melewati batas" : saved ? <><Check/> Tersimpan otomatis</> : <><LoaderCircle className="spin"/> Menyimpan…</>}`;const out=transformDocumentSave(fixture,'/repo/src/ContentEditor.jsx').code;assert.ok(out.includes('length > MAX_CONTENT_UNITS'));assert.ok(out.includes('Gagal menyimpan'));});
