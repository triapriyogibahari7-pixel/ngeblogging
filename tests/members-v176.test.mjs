import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const component = read("src/MembersPanelV176.jsx");
const css = read("src/members-v176.css");
const migration = read("supabase/migrations/20260731033000_studio_members_v176_max_20.sql");
const studio = read("src/StudioNext.jsx");

const roles = ["owner", "admin", "editor", "author", "viewer"];
const rpcNames = [
  "get_site_members_v176",
  "invite_site_member_v176",
  "update_site_member_role_v176",
  "remove_site_member_v176",
  "cancel_site_invitation_v176",
];

test("Members v176 supports active users, pending invitations and all requested roles", () => {
  for (const role of roles) assert.ok(component.includes(`"${role}"`) || component.includes(`${role}:`), `missing role ${role}`);
  for (const rpc of rpcNames) assert.ok(component.includes(rpc), `component missing ${rpc}`);
  for (const marker of ["Aktif", "Menunggu", "Tambah anggota", "Sisa tempat", "Muat ulang", "Tidak ada hasil"]) {
    assert.ok(component.includes(marker), `UI marker missing ${marker}`);
  }
  assert.match(component, /get_site_member_quota/);
  assert.match(component, /Maksimal 20 anggota/);
});

test("database enforces the 20-person limit transactionally, not only in the interface", () => {
  assert.match(migration, /select 20/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /enforce_site_member_limit_v176/);
  assert.match(migration, /enforce_site_invitation_limit_v176/);
  assert.match(migration, /active_count \+ pending_count >= private\.site_collaborator_limit\(\)/);
  assert.match(migration, /Batas anggota situs adalah % orang/);
});

test("member RPCs require authenticated owner or admin and protect the owner", () => {
  for (const rpc of rpcNames) assert.ok(migration.includes(`public.${rpc}`), `migration missing ${rpc}`);
  assert.match(migration, /private\.has_site_role\(target_site,array\['owner'::public\.member_role,'admin'::public\.member_role\]\)/);
  assert.match(migration, /Pemilik situs tidak dapat dihapus/);
  assert.match(migration, /Peran pemilik tidak dapat diubah/);
  assert.match(migration, /Anda tidak dapat mengubah peran sendiri/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.match(migration, /revoke all[\s\S]*from public/);
});

test("known accounts become active and unknown emails remain pending for seven days", () => {
  assert.match(migration, /from auth\.users where lower\(email\) = normalized_email/);
  assert.match(migration, /insert into public\.site_members/);
  assert.match(migration, /insert into public\.site_invitations/);
  assert.match(migration, /interval '7 days'/);
  assert.match(component, /Pengguna terdaftar ditambahkan langsung/);
  assert.match(component, /email lain menjadi undangan menunggu/);
});

test("Members React authority replaces the active page while preserving old fallback code", () => {
  assert.match(studio, /view === "members" && <MembersPanelV176/);
  assert.match(studio, /function MembersView/);
  assert.match(component, /data-members-release/);
  assert.match(component, /studio-members-v176-20260731/);
});

test("Members page has responsive, scroll-safe, empty, loading and error states", () => {
  for (const selector of [".mv176-page", ".mv176-tools", ".mv176-list", ".mv176-empty", ".mv176-loading", ".mv176-error"]) {
    assert.ok(css.includes(selector), `missing ${selector}`);
  }
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /grid-template-columns:42px minmax\(0,1fr\) auto/);
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});
