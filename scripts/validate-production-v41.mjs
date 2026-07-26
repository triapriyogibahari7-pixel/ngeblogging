import { readFile } from "node:fs/promises";

const validatorUrl = new URL("./validate-production.mjs", import.meta.url);
let source = await readFile(validatorUrl, "utf8");

const replacements = [
  [
    'for (const [label, config] of [["default", wrangler], ["production", cloudflareProduction]]) {',
    'for (const [label, config] of [["default", wrangler], ["production", cloudflareProduction], ["production upload", productionWrangler]]) {',
  ],
  [
    'if (productionWrangler.routes || productionWrangler.env) throw new Error("Konfigurasi upload produksi tidak boleh menulis ulang route atau environment yang sudah aktif.");',
    'if (productionWrangler.env) throw new Error("Konfigurasi upload produksi tidak boleh mendefinisikan environment bertingkat.");',
  ],
  [
    'if (wrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || cloudflareProduction.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || productionWrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14") throw new Error("Release Worker belum v14.");',
    'if (wrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || cloudflareProduction.vars?.APP_RELEASE !== "2026.07.24-studio-v14") throw new Error("Release Worker kanonis belum v14.");\nif (productionWrangler.vars?.APP_RELEASE !== "2026.07.26-responsive-v41") throw new Error("Release upload produksi belum v41.");\nif (productionWrangler.vars?.UI_AUTHORITY_RELEASE !== "2026.07.26-responsive-operations-v41-domain-v41") throw new Error("UI authority produksi belum responsive operations v41 + domain v41.");',
  ],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error(`Kontrak validator berubah; patch v41 tidak menemukan: ${before.slice(0, 90)}`);
  source = source.replace(before, after);
}

const importMarker = 'import { existsSync } from "node:fs";';
if (!source.includes(importMarker)) throw new Error("Validator produksi kehilangan import marker.");
source = source.replace(importMarker, `${importMarker}\nconst VALIDATOR_URL = ${JSON.stringify(validatorUrl.href)};`);
source = source.replaceAll("import.meta.url", "VALIDATOR_URL");

await import(`data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`);
