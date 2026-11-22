import assert from "node:assert/strict";
import vm from "node:vm";

export async function assertActiveServiceWorkerContract(source) {
  const handlers = new Map();
  const deleted = [];
  const notices = [];
  let navigations = 0;
  let authNotices = 0;
  let claims = 0;
  let version;
  const self = {
    location: { origin: "https://worker-contract.test" },
    addEventListener(type, handler) {
      assert.equal(handlers.has(type), false, `duplicate ${type} handler`);
      handlers.set(type, handler);
    },
    skipWaiting: async () => {},
    clients: {
      claim: async () => { claims++; },
      matchAll: async () => [
        { url: "https://worker-contract.test/studio", postMessage: value => notices.push(value), navigate: async () => { navigations++; } },
        { url: "https://worker-contract.test/login", postMessage: () => { authNotices++; }, navigate: async () => { navigations++; } },
      ],
    },
  };
  let currentKeys;
  const caches = {
    keys: async () => [...currentKeys, "ngeblogging-obsolete-shell"],
    delete: async key => { deleted.push(key); return true; },
  };
  vm.runInNewContext(source, { self, caches, URL }, { timeout: 1000 });
  for (const type of ["install", "activate", "message", "fetch"]) assert.equal(typeof handlers.get(type), "function");
  handlers.get("message")({ data: { type: "GET_VERSION" }, source: { postMessage: value => { version = value; } } });
  assert.equal(version?.type, "NGE_BLOGGING_PWA_VERSION");
  const release = /^ngeblogging-app-v(\d+)-/.exec(version?.version || "");
  assert.ok(release && Number(release[1]) >= 427, "active worker must not roll back to a historical cache");
  assert.match(version.release, new RegExp(`^v${release[1]}-`));
  assert.equal(version.studioAddSiteReleaseV303, "studio-add-site-free-subdomain-v303-20260805");
  currentKeys = [
    `${version.version}-${version.release}-shell`,
    `${version.version}-${version.release}-assets`,
  ];
  let completion;
  handlers.get("activate")({ waitUntil: promise => { completion = promise; } });
  assert.ok(completion && typeof completion.then === "function");
  await completion;
  assert.deepEqual(deleted, ["ngeblogging-obsolete-shell"], "retain both active caches and delete stale caches");
  assert.equal(claims, 1);
  assert.equal(navigations, 0, "activation must not navigate tabs with unsaved work");
  assert.equal(authNotices, 0, "activation must leave authentication tabs alone");
  assert.equal(notices.length, 1);
  assert.match(notices[0].type, /^NGE_BLOGGING_UPDATE_AVAILABLE_V\d+$/);
  assert.equal(notices[0].version, version.version);
  assert.equal(notices[0].reloadRequired, false);
}
