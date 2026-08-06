import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/lib/supabase.js", import.meta.url);
const RELEASE = "custom-domain-public-client-v317-20260806";
let source = await readFile(file, "utf8");

if (!source.includes(RELEASE)) {
  const before = `function productionClientHostV245() {
  if (typeof window === "undefined") return false;
  const hostname = String(window.location?.hostname || "").toLowerCase();
  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com");
}`;
  const after = `// ${RELEASE}\n// The Supabase publishable key is intentionally public and RLS remains the data boundary.\n// A Cloudflare Git build may not expose VITE_* variables, so a verified external\n// custom domain must still be able to resolve its published site instead of\n// falling back to the Ngeblogging marketing application. Local/dev preview hosts\n// remain excluded unless they provide explicit VITE_* configuration.\nfunction productionClientHostV245() {\n  if (typeof window === "undefined") return false;\n  const hostname = String(window.location?.hostname || "").toLowerCase();\n  if (hostname === "ngeblogging.com" || hostname === "www.ngeblogging.com" || hostname.endsWith(".ngeblogging.com")) return true;\n  if (String(window.location?.protocol || "").toLowerCase() !== "https:") return false;\n  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return false;\n  if (hostname.endsWith(".workers.dev") || hostname.endsWith(".pages.dev") || hostname.endsWith(".netlify.app")) return false;\n  return hostname.includes(".");\n}`;
  if (!source.includes(before)) throw new Error("V317_PUBLIC_CLIENT_HOST_ANCHOR_MISSING");
  source = source.replace(before, after);
  await writeFile(file, source);
}

for (const marker of [
  RELEASE,
  'window.location?.protocol || ""',
  'hostname.endsWith(".workers.dev")',
  'return hostname.includes(".")',
  "persistSession: true",
  "autoRefreshToken: true",
]) if (!source.includes(marker)) throw new Error(`V317_PUBLIC_CLIENT_MISSING:${marker}`);

console.log(`Validated ${RELEASE}: external HTTPS custom domains keep the public Supabase client even when VITE_* build variables are absent.`);
