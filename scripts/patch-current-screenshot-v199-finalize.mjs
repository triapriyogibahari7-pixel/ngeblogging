import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/lib/supabase.js", import.meta.url);
const RELEASE = "studio-current-screenshot-v199-finalizer-20260802";
let source = await readFile(file, "utf8");

const oldGatewayHost = `  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname.endsWith(".workers.dev");`;
const expandedGatewayHost = `  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname.endsWith(".netlify.app")
    || hostname.endsWith(".pages.dev")
    || hostname.endsWith(".workers.dev");`;

if (source.includes(oldGatewayHost)) source = source.replace(oldGatewayHost, expandedGatewayHost);

const start = source.indexOf("function gatewayHost() {");
const end = start >= 0 ? source.indexOf("\n}\n", start) : -1;
if (start < 0 || end < 0) throw new Error("V199_FINALIZER_GATEWAY_HOST_MISSING");
const gatewayHostBody = source.slice(start, end + 3);
for (const marker of ['.ngeblogging.com', '.netlify.app', '.pages.dev', '.workers.dev']) {
  if (!gatewayHostBody.includes(marker)) throw new Error(`V199_FINALIZER_GATEWAY_HOST_MARKER_MISSING:${marker}`);
}

if (!source.includes("sameOriginGatewayOnlyV199")) throw new Error("V199_FINALIZER_GATEWAY_ONLY_RUNTIME_MISSING");
if (!source.includes("supabaseGatewayFallbackV199")) throw new Error("V199_FINALIZER_DIAGNOSTIC_MARKER_MISSING");

await writeFile(file, source);
console.log(`Applied ${RELEASE}`);
