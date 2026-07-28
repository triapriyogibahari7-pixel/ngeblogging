import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("desktop sidebar centers open rows and collapsed icons", async () => {
  const css = await read("src/comments-studio-v93.css");
  for (const marker of [
    ".sn-side:not(.collapsed)>nav>button",
    "grid-template-columns:24px minmax(0,112px)!important",
    "justify-content:center!important",
    ".sn-side.collapsed>nav>button",
    "place-items:center!important",
    "width:48px!important",
    ".sn-side.collapsed>.sn-account-footer>button",
  ]) assert.ok(css.includes(marker), marker);
  assert.doesNotMatch(css, /\.sn-side\.collapsed[^}]+text-align:left/);
});

test("comments workspace has real moderation states, replies, settings and emoji", async () => {
  const source = await read("src/comments-studio-runtime-v93.jsx");
  for (const marker of [
    "Komentar & diskusi",
    "get_site_comment_dashboard",
    "update_site_comment_settings",
    "moderate_site_comment",
    "reply_to_site_comment",
    "Belum dibaca",
    "Belum dibalas",
    "Setujui",
    "Sembunyikan",
    "Emoji & reaksi",
    "Detail pengunjung",
    "Email privat",
    "sn-comments-nav-button-v93",
  ]) assert.ok(source.includes(marker), marker);
  assert.match(source, /createPortal.*from "react-dom"/);
  assert.match(source, /createRoot.*from "react-dom\/client"/);
});

test("public comments use validated Worker routes and safe rendering", async () => {
  const [handler, widget, worker] = await Promise.all([
    read("server/comments-handler-v93.mjs"),
    read("public/comments-v93.js"),
    read("cloudflare/worker-v67.mjs"),
  ]);
  for (const marker of [
    "/api/comments/public",
    "/api/comments/submit",
    "/api/comments/react",
    "sameHostOrigin",
    "visitorToken",
    "COMMENT_RATE_LIMITED",
    "injectPublicComments",
  ]) assert.ok(handler.includes(marker), marker);
  assert.doesNotMatch(widget, /innerHTML\s*=/);
  assert.doesNotMatch(widget, /insertAdjacentHTML|dangerouslySetInnerHTML/);
  assert.match(worker, /handleCommentsRequest/);
  assert.match(worker, /injectPublicComments/);
  assert.match(worker, /commentsRelease/);
});

test("Supabase comments schema is RLS-backed and emails are private", async () => {
  const migrations = await Promise.all([
    read("supabase/migrations/20260728060000_comments_platform_v93.sql"),
    read("supabase/migrations/20260728061000_comments_platform_v93_function_fixes.sql"),
  ]);
  const sql = migrations.join("\n");
  for (const marker of [
    "create table if not exists public.site_comment_settings",
    "create table if not exists public.site_comments",
    "create table if not exists public.site_comment_reactions",
    "enable row level security",
    "private.can_moderate_site_comments",
    "COMMENT_RATE_LIMITED",
    "owner_read_at",
    "replied_at",
    "is_admin_reply",
  ]) assert.ok(sql.includes(marker), marker);
  const publicFunction = sql.slice(sql.lastIndexOf("create or replace function public.get_public_site_comments"));
  assert.doesNotMatch(publicFunction, /'authorEmail'/);
});

test("PWA rotates to v93 and preloads public comment assets", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /sidebar-comments-v93-20260728/);
  assert.match(sw, /pwa-v93/);
  assert.match(sw, /comments-v93\.css/);
  assert.match(sw, /comments-v93\.js/);
});
