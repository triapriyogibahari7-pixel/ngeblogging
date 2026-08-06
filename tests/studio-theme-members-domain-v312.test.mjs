import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v312 Theme Studio exposes the 26-area map, two models and source 10,000-line editor", async () => {
  const [studio, css] = await Promise.all([
    read("src/ThemeStudio.jsx"),
    read("src/theme-studio-v312.css"),
  ]);
  assert.match(studio, /theme-map-code-editor-v312-20260806/);
  assert.match(studio, /LAYOUT_AREAS\.map/);
  assert.match(studio, /Model editorial/);
  assert.match(studio, /Model majalah/);
  assert.match(studio, /Array\.from\(\{ length: 10000 \}/);
  assert.match(studio, /data-theme-code-v312="line-numbers-10000"/);
  assert.match(studio, /data-theme-code-workspace-v312="preview-above-on-small-split-on-large"/);
  assert.match(studio, /HTML, CSS, dan JavaScript berjalan dalam iframe sandbox/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /\.sidebar-left-4/);
  assert.match(css, /\.sidebar-right-4/);
  assert.match(css, /\.content-main/);
  assert.match(css, /tn-layout-popover-v312/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant/);
});

test("v312 all 100 themes render detailed layout runtime and custom widget CSS", async () => {
  const { BUILT_IN_WIDGETS, LAYOUT_AREAS } = await import("../src/widget-system.js");
  const { BUILT_IN_THEMES, buildThemeSrcDoc } = await import("../src/theme-system.js");
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(LAYOUT_AREAS.length, 26);
  assert.equal(BUILT_IN_WIDGETS.length, 26);
  const custom = BUILT_IN_WIDGETS.find((widget) => widget.id === "custom-html");
  assert.equal(custom?.name, "HTML / CSS / JavaScript");
  const widgets = LAYOUT_AREAS.map((area, index) => ({
    id: BUILT_IN_WIDGETS[index].id,
    enabled: true,
    area: area.id,
    order: index,
    title: BUILT_IN_WIDGETS[index].name,
    settings: index === 25 ? { html: "<b>v312</b>", css: "b{color:red}", javascript: "document.body.dataset.v312='ok'" } : {},
  }));
  for (const theme of BUILT_IN_THEMES) {
    const source = buildThemeSrcDoc(theme.code, undefined, widgets);
    assert.match(source, /data-theme-layout-authority="theme-layout-v170-20260730"/);
    assert.match(source, /sidebar-left-4/);
    assert.match(source, /sidebar-right-4/);
    assert.match(source, /b\{color:red\}/);
  }
});

test("v312 members has invite/delete plus a five-role menu with atomic Owner transfer", async () => {
  const [members, css, migration] = await Promise.all([
    read("src/studio-members-v304.js"),
    read("src/studio-members-v304.css"),
    read("supabase/migrations/20260806030000_members_owner_transfer_v312.sql"),
  ]);
  for (const marker of ["Owner", "Admin", "Editor", "Author", "Viewer"]) assert.match(members, new RegExp(`\\[\\"[^\\"]+\\", \\"${marker}\\"\\]`));
  assert.match(members, /transfer_site_owner_v312/);
  assert.match(members, /remove_site_member_v176/);
  assert.match(members, /cancel_site_invitation_v176/);
  assert.match(members, /member-more-v312/);
  assert.match(css, /member-more-menu-v312/);
  assert.match(migration, /current_owner <> auth\.uid\(\)/);
  assert.match(migration, /set role='admin'::public\.member_role/);
  assert.match(migration, /set role='owner'::public\.member_role/);
  assert.match(migration, /set owner_id=target_user/);
  assert.match(migration, /grant execute on function public\.transfer_site_owner_v312/);
});

test("v312 custom domains auto-reconcile DNS HTTPS and Worker routing without faking active status", async () => {
  const [domain, css] = await Promise.all([
    read("src/DomainPanelV124.jsx"),
    read("src/studio-domain-v312.css"),
  ]);
  assert.match(domain, /autoReconcileRef/);
  assert.match(domain, /\/api\/domains\/refresh/);
  assert.match(domain, /routing Worker sedang disinkronkan otomatis/);
  assert.match(domain, /domain\.status !== "pending_deletion" && !activeDomain\(domain\)/);
  assert.match(domain, /provider_status === "active"/);
  assert.match(css, /sv124-domain-auto-v312/);
  assert.doesNotMatch(domain, /status\s*=\s*"active"/);
});
