import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(process.env.PUBLIC_THEME_SOURCE || new URL("../src/PublicSiteNext.jsx", import.meta.url), "utf8");
const homeSource = source.slice(source.indexOf("function homeCode("), source.indexOf("\nfunction share("));
const homeCode = vm.runInNewContext(`(${homeSource})`, { URLSearchParams, window: { location: { search: "", hash: "#posts" } } });
const title = "Cerita </script><script>alert(1)</script>";
const post = { title, slug: "cerita ruang & tanda", excerpt: "Ringkasan", metadata: { categories: ["Cerita"], tags: ["uji"] } };

for (const preview of [false, true]) {
  for (const count of [0, 1, 12]) {
    test(`home script compiles: preview=${preview}, posts=${count}`, () => {
      const context = { URLSearchParams, window: { location: { search: preview ? "?ngeblogging-free-preview=1" : "", hash: "#posts" } } };
      const render = vm.runInNewContext(`(${homeSource})`, context);
      const code = render({ name: "Situs pemilik", theme: {} }, { code: { html: "<main></main>", css: "", javascript: "" } }, Array.from({length: count}, () => post), [{title: "Tentang", slug: "tentang kami"}]);
      assert.doesNotThrow(() => new vm.Script(code.javascript));
      assert.equal(code.javascript.includes("</script>"), false);
      const payload = JSON.parse(code.javascript.match(/const data=(.*);\n/)[1]);
      assert.equal(payload.site.name, "Situs pemilik");
      assert.equal(payload.initialAnchor, "#posts");
      assert.equal(payload.posts.length, count);
      if (count) assert.equal(payload.posts[0].title, title);
      const linkDeclaration = code.javascript.split("\n").find(line => line.trim().startsWith("const linkTo="));
      const href = vm.runInNewContext(`const freePreview=${preview};${linkDeclaration};linkTo(${JSON.stringify(post.slug)})`);
      assert.equal(href, "/" + encodeURIComponent(post.slug) + (preview ? "?ngeblogging-free-preview=1" : ""));
      assert.ok(code.javascript.includes("link.href=linkTo(post.slug);link.target='_top'"));
      assert.ok(code.javascript.includes("Dikembangkan oleh Tri Apriyogi Bahari"));
    });
  }
}

test("Post/Page Posts link keeps preview query before fragment", () => {
  const declaration = source.split("\n").find(line => line.trim().startsWith("const publicHref="));
  for (const previewQuery of ["", "?ngeblogging-free-preview=1"]) {
    const result = vm.runInNewContext(`const previewQuery=${JSON.stringify(previewQuery)};${declaration};[publicHref('/'),publicHref('/#posts'),publicHref('/cerita')]`);
    assert.deepEqual(Array.from(result), ["/"+previewQuery, "/"+previewQuery+"#posts", "/cerita"+previewQuery]);
  }
});

test("credit is separate from content authors and scoped to theme footer", () => {
  assert.ok(source.includes("const footer=root?.querySelector('footer')"));
  assert.ok(source.includes("!footer.querySelector('[data-theme-credit]')"));
  assert.ok(source.includes("<b>{metadata.authorName}</b>"));
  assert.ok(source.includes('data-theme-credit="true"'));
  assert.ok(source.includes("event.target===card"));
});
