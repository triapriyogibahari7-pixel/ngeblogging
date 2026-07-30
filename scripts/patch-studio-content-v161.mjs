import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("src/StudioNext.jsx");
let source = readFileSync(file, "utf8");
const release = "studio-content-workflow-v161-20260730";

function replaceOnce(anchor, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(anchor)) throw new Error(`PATCH_STUDIO_CONTENT_V161_${label}_ANCHOR_MISSING`);
  source = source.replace(anchor, replacement);
}

replaceOnce(
  'import ContentEditor from "./ContentEditor";',
  'import ContentEditor from "./ContentEditor";\nimport { StudioContentListV161, StudioSummaryV161 } from "./StudioContentV161.jsx";',
  "IMPORT",
);

replaceOnce(
  `  const removeDoc = async (id) => {\n    if (!window.confirm("Hapus konten ini?")) return;\n    try { if (dataMode === "cloud") await deleteContentDocument(id); setDocs((all) => all.filter((document) => document.id !== id)); setToast("Konten dihapus"); }\n    catch (error) { setToast(error.message || "Konten belum dapat dihapus"); }\n  };`,
  `  const removeDoc = async (id) => {\n    if (!window.confirm("Hapus konten ini?")) return;\n    try { if (dataMode === "cloud") await deleteContentDocument(id); setDocs((all) => all.filter((document) => document.id !== id)); setToast("Konten dihapus"); }\n    catch (error) { setToast(error.message || "Konten belum dapat dihapus"); }\n  };\n\n  const duplicateDoc = async (id) => {\n    const listed = docs.find((document) => document.id === id);\n    if (!listed) return;\n    setContentLoading(true);\n    try {\n      const sourceDocument = listed.hydrated || dataMode !== "cloud" ? listed : await getContentDocument(id);\n      const title = \\`Salinan \\${sourceDocument.title || (sourceDocument.type === "page" ? "Page" : "Post")}\\`;\n      const slug = \\`\\${slugify(title)}-\\${Math.random().toString(36).slice(2, 8)}\\`;\n      let copy;\n      if (dataMode === "cloud" && site?.id && user?.id) {\n        const created = await createContentDocument({ siteId: site.id, userId: user.id, type: sourceDocument.type });\n        const values = {\n          type: sourceDocument.type, title, slug, status: "draft", visibility: sourceDocument.visibility || "public",\n          excerpt: sourceDocument.excerpt || "", content: sourceDocument.content || "", featuredImagePath: sourceDocument.featuredImagePath || "",\n          metadata: normalizeMetadata(sourceDocument.metadata, sourceDocument.type), seo: normalizeSeo(sourceDocument.seo, sourceDocument.metadata),\n          scheduledAt: "", publishedAt: "",\n        };\n        await updateContentDocument(created.id, values);\n        copy = { ...created, ...values, id: created.id, hydrated: true, updated: Date.now(), updatedAt: new Date().toISOString() };\n      } else {\n        copy = {\n          ...sourceDocument, id: crypto.randomUUID(), title, slug, status: "draft", scheduledAt: "", publishedAt: "",\n          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updated: Date.now(), hydrated: true,\n          metadata: normalizeMetadata(sourceDocument.metadata, sourceDocument.type), seo: normalizeSeo(sourceDocument.seo, sourceDocument.metadata),\n        };\n      }\n      setDocs((all) => [copy, ...all]);\n      setToast(\\`\\${sourceDocument.type === "page" ? "Page" : "Post"} diduplikasi sebagai draf\\`);\n    } catch (error) {\n      console.error("Duplicate content failed", error);\n      setToast(error.message || "Konten belum dapat diduplikasi");\n    } finally {\n      setContentLoading(false);\n    }\n  };`,
  "DUPLICATE",
);

replaceOnce(
  '      {view === "home" && <HomeView docs={docs} displayName={displayName} site={site} loading={contentLoading} createDoc={createDoc} openDoc={openDoc} openNara={() => setNaraOpen(true)}/>} ',
  '      {view === "home" && <StudioSummaryV161 docs={docs} displayName={displayName} site={site} loading={contentLoading} createDoc={createDoc} openDoc={openDoc} openNara={() => setNaraOpen(true)}/>} ',
  "SUMMARY",
);

replaceOnce(
  '      {view === "posts" && <ContentList docs={docs} type="article" query={query} setQuery={setQuery} createDoc={createDoc} openDoc={openDoc} removeDoc={removeDoc} loading={contentLoading} hasMore={pageInfo.hasMore} loadMore={loadMore}/>} ',
  '      {view === "posts" && <StudioContentListV161 docs={docs} type="article" query={query} setQuery={setQuery} site={site} createDoc={createDoc} openDoc={openDoc} removeDoc={removeDoc} duplicateDoc={duplicateDoc} loading={contentLoading} hasMore={pageInfo.hasMore} loadMore={loadMore}/>} ',
  "POSTS",
);

replaceOnce(
  '      {view === "pages" && <ContentList docs={docs} type="page" query={query} setQuery={setQuery} createDoc={createDoc} openDoc={openDoc} removeDoc={removeDoc} loading={contentLoading} hasMore={pageInfo.hasMore} loadMore={loadMore}/>} ',
  '      {view === "pages" && <StudioContentListV161 docs={docs} type="page" query={query} setQuery={setQuery} site={site} createDoc={createDoc} openDoc={openDoc} removeDoc={removeDoc} duplicateDoc={duplicateDoc} loading={contentLoading} hasMore={pageInfo.hasMore} loadMore={loadMore}/>} ',
  "PAGES",
);

if (!source.includes("StudioSummaryV161") || !source.includes("duplicateDoc={duplicateDoc}")) {
  throw new Error("PATCH_STUDIO_CONTENT_V161_INCOMPLETE");
}

writeFileSync(file, source, "utf8");
console.log(`Studio content authority ${release} aktif.`);
