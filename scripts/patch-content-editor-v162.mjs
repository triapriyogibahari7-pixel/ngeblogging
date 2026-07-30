import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const editorPath = resolve("src/ContentEditor.jsx");
const dataPath = resolve("src/lib/content-data.js");
let editor = readFileSync(editorPath, "utf8");
let data = readFileSync(dataPath, "utf8");
const release = "content-editor-v162-20260730";

function replaceOnce(source, anchor, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(anchor)) throw new Error(`PATCH_EDITOR_V162_${label}_ANCHOR_MISSING`);
  return source.replace(anchor, replacement);
}

editor = replaceOnce(
  editor,
  'import "./content-editor.css";',
  'import "./content-editor.css";\nimport "./content-editor-v162.css";',
  "CSS_IMPORT",
);
editor = replaceOnce(
  editor,
  '  const readingMinutes = Math.max(1, Math.ceil(words / 220));',
  '  const readingMinutes = Math.max(1, Math.ceil(words / 220));\n  const wordLimitState = words > 5000 ? "over" : words >= 4500 ? "warning" : "ok";\n  const wordsToReduce = Math.max(0, words - 5000);',
  "WORD_STATE",
);
editor = replaceOnce(
  editor,
  '  return <div className="ce-app">',
  '  return <div className="ce-app" data-editor-release="v162">',
  "ROOT_RELEASE",
);
editor = replaceOnce(
  editor,
  '<button className="ce-primary" onClick={publish}><Send/>{doc.status === "published" ? "Jadikan draf" : doc.status === "scheduled" ? "Terjadwal" : "Terbitkan"}</button>',
  '<button className="ce-primary" onClick={publish} disabled={words > 5000} title={words > 5000 ? `Kurangi ${wordsToReduce.toLocaleString("id-ID")} kata sebelum publikasi` : "Publikasikan konten"}><Send/>{doc.status === "published" ? "Jadikan draf" : doc.status === "scheduled" ? "Terjadwal" : "Terbitkan"}</button>',
  "PUBLISH_GUARD",
);
editor = replaceOnce(
  editor,
  '<div className="ce-word-status"><span>{words.toLocaleString("id-ID")} kata</span><span>± {readingMinutes} menit membaca</span><span>{String(doc.content || "").length.toLocaleString("id-ID")} karakter HTML</span></div>',
  '<div className="ce-word-status" data-limit-state={wordLimitState}><span>{words.toLocaleString("id-ID")} / 5.000 kata</span><span>± {readingMinutes} menit membaca</span><span>{String(doc.content || "").length.toLocaleString("id-ID")} karakter HTML</span>{wordLimitState === "warning" && <span className="ce-word-limit-message">Mendekati batas utama 5.000 kata</span>}{wordLimitState === "over" && <span className="ce-word-limit-message">Kurangi {wordsToReduce.toLocaleString("id-ID")} kata untuk menerbitkan. Draf tetap disimpan dan tulisan tidak dipotong.</span>}</div>',
  "WORD_STATUS",
);
editor = replaceOnce(
  editor,
  '<option value="landing">Landing page</option><option value="contact">Kontak</option><option value="portfolio">Portofolio</option>',
  '<option value="landing">Landing page</option><option value="contact">Kontak</option><option value="about">About Page</option><option value="portfolio">Portofolio</option><option value="profile">Profile Page</option>',
  "PAGE_TEMPLATES",
);
editor = replaceOnce(
  editor,
  '{isPage && <Field label="Urutan menu"><input type="number" min="0" max="9999" value={metadata.menuOrder || 0} onChange={(event) => updateMetadata({menuOrder:Number(event.target.value)})}/></Field>}<Toggle label="Tampilkan penulis"',
  '{isPage && <Field label="Urutan menu"><input type="number" min="0" max="9999" value={metadata.menuOrder || 0} onChange={(event) => updateMetadata({menuOrder:Number(event.target.value)})}/></Field>}{isPage && <Toggle label="Tampilkan di navigasi" checked={metadata.showInNavigation !== false} onChange={(value) => updateMetadata({showInNavigation:value})}/>} {isPage && <Toggle label="Jadikan Page default" checked={metadata.defaultPage} onChange={(value) => updateMetadata({defaultPage:value})}/>}<Toggle label="Tampilkan penulis"',
  "PAGE_FLAGS",
);
editor = replaceOnce(
  editor,
  '<section><h3>SEO & sosial</h3><Field label="Meta description"',
  '<section><h3>SEO & sosial</h3><Field label="SEO title" help={`${(metadata.seoTitle || doc.title || "").length}/65 karakter`}><input maxLength={65} value={metadata.seoTitle || ""} onChange={(event) => updateMetadata({seoTitle:event.target.value})} placeholder={doc.title || "Judul hasil pencarian"}/></Field><Field label="Meta description"',
  "SEO_TITLE",
);
editor = replaceOnce(
  editor,
  '<Field label="Schema type"><select value={metadata.schemaType || (isPage ? "WebPage" : "BlogPosting")} onChange={(event) => updateMetadata({schemaType:event.target.value})}>',
  '<Field label="Judul sosial"><input value={metadata.socialTitle || ""} onChange={(event) => updateMetadata({socialTitle:event.target.value})} placeholder={metadata.seoTitle || doc.title}/></Field><Field label="Deskripsi sosial"><textarea maxLength={300} value={metadata.socialDescription || ""} onChange={(event) => updateMetadata({socialDescription:event.target.value})}/></Field><Field label="Gambar sosial"><input type="url" value={metadata.socialImage || ""} onChange={(event) => updateMetadata({socialImage:event.target.value})} placeholder="https://..."/></Field><Field label="Twitter Card"><select value={metadata.twitterCard || "summary_large_image"} onChange={(event) => updateMetadata({twitterCard:event.target.value})}><option value="summary_large_image">Summary large image</option><option value="summary">Summary</option></select></Field><Field label="Schema type"><select value={metadata.schemaType || (isPage ? "WebPage" : "BlogPosting")} onChange={(event) => updateMetadata({schemaType:event.target.value})}>',
  "SOCIAL_FIELDS",
);
editor = replaceOnce(
  editor,
  '<div className="ce-score"><span>Skor SEO</span><b className={seoScore >= 80 ? "good" : seoScore >= 60 ? "medium" : "low"}>{seoScore}/100</b></div></section>',
  '<div className="ce-score"><span>Skor SEO</span><b className={seoScore >= 80 ? "good" : seoScore >= 60 ? "medium" : "low"}>{seoScore}/100</b></div><div className="ce-seo-preview-v162"><small>{site?.slug ? `https://${site.slug}.ngeblogging.com/${doc.slug}` : `/${doc.slug}`}</small><b>{metadata.seoTitle || doc.title || "Judul konten"}</b><p>{doc.excerpt || "Tambahkan meta description agar cuplikan hasil pencarian lebih jelas."}</p></div></section>',
  "SEO_PREVIEW",
);

data = replaceOnce(
  data,
  '    socialImage: String(input.socialImage || "").slice(0, 2000),',
  '    socialImage: String(input.socialImage || "").slice(0, 2000),\n    seoTitle: String(input.seoTitle || "").slice(0, 300),\n    twitterCard: ["summary", "summary_large_image"].includes(input.twitterCard) ? input.twitterCard : "summary_large_image",',
  "NORMALIZE_SEO_SOCIAL",
);
data = replaceOnce(
  data,
  '    menuOrder: Math.max(0, Math.min(9999, Number(input.menuOrder) || 0)),',
  '    menuOrder: Math.max(0, Math.min(9999, Number(input.menuOrder) || 0)),\n    showInNavigation: input.showInNavigation !== false,\n    defaultPage: Boolean(input.defaultPage),',
  "NORMALIZE_PAGE_FLAGS",
);

for (const marker of ["data-editor-release=\"v162\"", "wordLimitState", "SEO title", "Tampilkan di navigasi", "ce-seo-preview-v162"]) {
  if (!editor.includes(marker)) throw new Error(`PATCH_EDITOR_V162_INCOMPLETE_${marker}`);
}
for (const marker of ["seoTitle", "twitterCard", "showInNavigation", "defaultPage"]) {
  if (!data.includes(marker)) throw new Error(`PATCH_EDITOR_DATA_V162_INCOMPLETE_${marker}`);
}

writeFileSync(editorPath, editor, "utf8");
writeFileSync(dataPath, data, "utf8");
console.log(`Content editor authority ${release} aktif.`);
