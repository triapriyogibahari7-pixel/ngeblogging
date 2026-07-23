import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKUP_FORMAT, BACKUP_VERSION, exportLocalBackup, finalizeLocalBackup,
  normalizeBackup, verifyBackupIntegrity,
} from "../src/lib/backup-data.js";

test("portable backup preserves complete Post and Page metadata", async () => {
  const source = exportLocalBackup([
    { type:"article",title:"Post audit",slug:"post-audit",status:"published",visibility:"public",content:"<h1>Post</h1><p>Isi lengkap</p>",excerpt:"Ringkas",metadata:{tags:["audit"],locationName:"Jakarta"},seo:{index:true},publishedAt:"2026-07-23T00:00:00.000Z" },
    { type:"page",title:"Tentang",slug:"tentang",status:"draft",visibility:"public",content:"<h1>Tentang</h1>",metadata:{template:"default-page"},seo:{follow:true} },
  ]);
  const backup = await finalizeLocalBackup(source);
  assert.equal(backup.format,BACKUP_FORMAT);
  assert.equal(backup.version,BACKUP_VERSION);
  assert.equal(backup.contents.length,2);
  assert.equal(backup.contents[0].body_html,"<h1>Post</h1><p>Isi lengkap</p>");
  assert.equal(backup.contents[0].metadata.locationName,"Jakarta");
  assert.match(backup.integrity.checksum,/^[a-f0-9]{64}$/);
  const verified = await verifyBackupIntegrity(backup);
  assert.equal(verified.valid,true);
  assert.equal(verified.backup.contents[1].kind,"page");
});

test("backup checksum rejects modified content", async () => {
  const backup = await finalizeLocalBackup(exportLocalBackup([{type:"article",title:"Asli",slug:"asli",content:"<p>Asli</p>"}]));
  const tampered = structuredClone(backup);
  tampered.contents[0].body_html = "<p>Diubah</p>";
  await assert.rejects(() => verifyBackupIntegrity(tampered),/Checksum cadangan tidak cocok/);
});

test("invalid and oversized backup structures are rejected", () => {
  assert.throws(() => normalizeBackup({}),/bukan cadangan Ngeblogging/);
  assert.throws(() => normalizeBackup({format:BACKUP_FORMAT,version:99,contents:[]}),/Versi file/);
});
