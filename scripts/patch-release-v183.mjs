import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const RELEASE = "studio-interaction-precision-v183-20260731";
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, source) => writeFile(new URL(path, root), source);

function addAfter(source, anchor, addition, label) {
  if (source.includes(addition.trim())) return source;
  if (!source.includes(anchor)) throw new Error(`V183_RELEASE_ANCHOR_MISSING:${label}`);
  return source.replace(anchor, `${anchor}${addition}`);
}

async function patchWorker() {
  const path = "cloudflare/worker-v69.mjs";
  let source = await read(path);

  source = addAfter(
    source,
    'export const PRODUCTION_ROUTE_RELEASE = PRODUCTION_CUSTOM_DOMAIN_RELEASE;\n',
    `export const STUDIO_INTERACTION_RELEASE = "${RELEASE}";\n`,
    "worker-release-const",
  );

  if (!source.includes('  "/release-v183.json",')) {
    source = source.replace(
      '  "/release-v172.json",\n]);',
      '  "/release-v172.json",\n  "/release-v183.json",\n]);',
    );
  }

  if (!source.includes("studioInteractionRelease: STUDIO_INTERACTION_RELEASE")) {
    source = source.replace(
      "    productionRecoveryRelease: PRODUCTION_RECOVERY_RELEASE,",
      "    productionRecoveryRelease: PRODUCTION_RECOVERY_RELEASE,\n    studioInteractionRelease: STUDIO_INTERACTION_RELEASE,",
    );
    source = source.replace(
      "    mobileEditorMinimumWidth: 320,",
      "    mobileEditorMinimumWidth: 320,\n    drawerClickable: true,\n    drawerBackdropOutsideOnly: true,\n    mobileLogoCentered: true,\n    editorMobileNoCharacterWrap: true,\n    naraSmallMediumNonmodal: true,\n    naraCloseAlwaysVisible: true,\n    profileSettingsSeparated: true,",
    );
  }

  if (!source.includes('"x-ngeblogging-studio-interaction": STUDIO_INTERACTION_RELEASE')) {
    source = source.replace(
      '      "x-ngeblogging-mobile-public": "mobile-public-v171-20260730",',
      '      "x-ngeblogging-mobile-public": "mobile-public-v171-20260730",\n      "x-ngeblogging-studio-interaction": STUDIO_INTERACTION_RELEASE,',
    );
  }

  if (!source.includes('html.includes("ngeblogging-studio-interaction-v183")')) {
    source = source.replace(
      '    && html.includes("ngeblogging-auth-callback-singleflight-v162")',
      '    && html.includes("ngeblogging-auth-callback-singleflight-v162")\n    && html.includes("ngeblogging-studio-interaction-v183")',
    );
  }

  if (!source.includes('name="ngeblogging-studio-interaction-v183"')) {
    source = source.replace(
      '    `<meta name="ngeblogging-production-custom-domain-v172" content="${PRODUCTION_CUSTOM_DOMAIN_RELEASE}"/>`,',
      '    `<meta name="ngeblogging-production-custom-domain-v172" content="${PRODUCTION_CUSTOM_DOMAIN_RELEASE}"/>`,\n    `<meta name="ngeblogging-studio-interaction-v183" content="${STUDIO_INTERACTION_RELEASE}"/>`,',
    );
  }

  if (!source.includes('headers.set("x-ngeblogging-studio-interaction", STUDIO_INTERACTION_RELEASE);')) {
    source = source.replace(
      '  headers.set("x-ngeblogging-mobile-public", "mobile-public-v171-20260730");',
      '  headers.set("x-ngeblogging-mobile-public", "mobile-public-v171-20260730");\n  headers.set("x-ngeblogging-studio-interaction", STUDIO_INTERACTION_RELEASE);',
    );
  }

  for (const marker of [
    RELEASE,
    '"/release-v183.json"',
    "studioInteractionRelease: STUDIO_INTERACTION_RELEASE",
    '"x-ngeblogging-studio-interaction": STUDIO_INTERACTION_RELEASE',
    'name="ngeblogging-studio-interaction-v183"',
    'headers.set("x-ngeblogging-studio-interaction", STUDIO_INTERACTION_RELEASE)',
  ]) {
    if (!source.includes(marker)) throw new Error(`V183_WORKER_RELEASE_INCOMPLETE:${marker}`);
  }
  await write(path, source);
}

async function patchNetlify() {
  const path = "scripts/write-netlify-redirects.mjs";
  let source = await read(path);

  source = addAfter(
    source,
    'const PRODUCTION_DOMAIN_ATTACH_RELEASE = "2026.07.30-production-domain-attach-v165";\n',
    `const STUDIO_INTERACTION_RELEASE = "${RELEASE}";\n`,
    "netlify-release-const",
  );

  if (!source.includes("X-Ngeblogging-Studio-Interaction")) {
    source = source.replace(
      "  X-Ngeblogging-Domain-Attach: ${PRODUCTION_DOMAIN_ATTACH_RELEASE}",
      "  X-Ngeblogging-Domain-Attach: ${PRODUCTION_DOMAIN_ATTACH_RELEASE}\n  X-Ngeblogging-Studio-Interaction: ${STUDIO_INTERACTION_RELEASE}",
    );
  }

  if (!source.includes("/release-v183.json")) {
    source = source.replace(
      "/release-v165.json\n  Cache-Control: no-store, max-age=0\n`,",
      "/release-v165.json\n  Cache-Control: no-store, max-age=0\n/release-v183.json\n  Cache-Control: no-store, max-age=0\n`,",
    );
  }

  if (!source.includes("studioInteractionRelease: STUDIO_INTERACTION_RELEASE")) {
    source = source.replace(
      "    productionDomainAttachRelease: PRODUCTION_DOMAIN_ATTACH_RELEASE,",
      "    productionDomainAttachRelease: PRODUCTION_DOMAIN_ATTACH_RELEASE,\n    studioInteractionRelease: STUDIO_INTERACTION_RELEASE,",
    );
    source = source.replace(
      "    productionCredentialLoadTest: false,",
      "    productionCredentialLoadTest: false,\n    drawerClickable: true,\n    drawerBackdropOutsideOnly: true,\n    mobileLogoCentered: true,\n    editorMobileNoCharacterWrap: true,\n    naraSmallMediumNonmodal: true,\n    naraCloseAlwaysVisible: true,\n    profileSettingsSeparated: true,",
    );
  }

  source = source.replace(
    'for (const filename of ["release-v154.json", "release-v158.json", "release-v159.json", "release-v160.json"])',
    'for (const filename of ["release-v154.json", "release-v158.json", "release-v159.json", "release-v160.json", "release-v183.json"])',
  );

  if (!source.includes('name="ngeblogging-studio-interaction-v183"')) {
    source = source.replace(
      "    || !html.includes('name=\"ngeblogging-auth-callback-singleflight-v162\"')",
      "    || !html.includes('name=\"ngeblogging-auth-callback-singleflight-v162\"')\n    || !html.includes('name=\"ngeblogging-studio-interaction-v183\"')",
    );
    source = source.replace(
      '      `<meta name="ngeblogging-production-domain-attach-v165" content="${PRODUCTION_DOMAIN_ATTACH_RELEASE}">`,',
      '      `<meta name="ngeblogging-production-domain-attach-v165" content="${PRODUCTION_DOMAIN_ATTACH_RELEASE}">`,\n      `<meta name="ngeblogging-studio-interaction-v183" content="${STUDIO_INTERACTION_RELEASE}">`,',
    );
  }

  for (const marker of [
    RELEASE,
    "X-Ngeblogging-Studio-Interaction",
    "/release-v183.json",
    "studioInteractionRelease: STUDIO_INTERACTION_RELEASE",
    '"release-v183.json"',
    'name="ngeblogging-studio-interaction-v183"',
  ]) {
    if (!source.includes(marker)) throw new Error(`V183_NETLIFY_RELEASE_INCOMPLETE:${marker}`);
  }
  await write(path, source);
}

await patchWorker();
await patchNetlify();
console.log(`Patched deployment markers for ${RELEASE}`);

export { RELEASE };
