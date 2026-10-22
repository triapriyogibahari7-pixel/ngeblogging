export function transformEditorShell(code,id){
 const path=id.split('?')[0].replaceAll('\\','/');
 if(!path.endsWith('/src/ContentEditor.jsx'))return null;
 if(code.includes('import { EditorWorkspaceBarV444'))return null;
 const edits=[['    <div className="ce-ribbon">','    <EditorWorkspaceBarV444 saved={saved} onPreview={() => setPreview(true)} onSource={() => { setSourceDraft(doc.content || ""); setSourceOpen(true); }}/>'+'\n    <EditorTypographyV444 key={doc.id} editor={editor} patch={patch}/>'+'\n    <div className="ce-ribbon">'],['      <aside className="ce-sidebar">','      <aside className="ce-sidebar"><EditorLibraryV444/>'],['    {preview && <Preview','    <EditorStatusV444 words={words} isPage={isPage}/>'+'\n    {preview && <Preview']];
 let result=code;for(const [before,after] of edits){if(result.split(before).length!==2)throw new Error('EDITOR_V444_ANCHOR_INVALID: '+before);result=result.replace(before,after);}
 return {code:'import { EditorWorkspaceBarV444, EditorLibraryV444, EditorStatusV444 } from "./EditorShellV444";\nimport EditorTypographyV444 from "./EditorTypographyV444";\n'+result,map:null};
}
