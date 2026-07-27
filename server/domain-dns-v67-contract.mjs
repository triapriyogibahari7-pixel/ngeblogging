const DEFAULT_TARGET = "connect.ngeblogging.com";

export function cleanHostname(value) {
  return String(value || "").trim().toLowerCase().replace(/\.$/, "");
}

export function normalizeDomainHostname(input) {
  let value = String(input || "").trim().toLowerCase();
  if (!value) throw Object.assign(new Error("Masukkan nama domain."), { status: 400, code: "HOSTNAME_REQUIRED" });
  if (!value.includes("://")) value = `https://${value}`;
  let parsed;
  try { parsed = new URL(value); } catch {
    throw Object.assign(new Error("Format domain tidak valid."), { status: 400, code: "INVALID_HOSTNAME" });
  }
  const hostname = cleanHostname(parsed.hostname);
  if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.port || parsed.username || parsed.password) {
    throw Object.assign(new Error("Masukkan domain saja tanpa path, parameter, port, atau kredensial."), { status: 400, code: "INVALID_HOSTNAME" });
  }
  if (
    hostname.length < 4
    || hostname.length > 253
    || !hostname.includes(".")
    || hostname.includes("..")
    || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(hostname)
  ) {
    throw Object.assign(new Error("Nama domain tidak valid."), { status: 400, code: "INVALID_HOSTNAME" });
  }
  if (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com")) {
    throw Object.assign(new Error("Gunakan pengaturan subdomain gratis untuk alamat *.ngeblogging.com."), { status: 400, code: "USE_FREE_SUBDOMAIN" });
  }
  return hostname;
}

export function buildDomainDnsContract(hostnameInput, verificationToken, targetInput = DEFAULT_TARGET) {
  const hostname = cleanHostname(hostnameInput);
  const target = cleanHostname(targetInput || DEFAULT_TARGET);
  const token = String(verificationToken || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!hostname || !target || token.length < 16) {
    throw Object.assign(new Error("Kontrak DNS domain belum lengkap."), { status: 500, code: "DNS_CONTRACT_INVALID" });
  }
  const verificationTarget = `verify-${token.slice(0, 40)}.ngeblogging.com`;
  const records = [
    {
      purpose: "routing",
      type: "CNAME",
      name: hostname,
      host: "@",
      value: target,
      label: "Koneksi situs",
    },
    {
      purpose: "ownership",
      type: "CNAME",
      name: `_ngeblogging.${hostname}`,
      host: "_ngeblogging",
      value: verificationTarget,
      label: "Verifikasi kepemilikan unik",
    },
  ];
  return {
    version: "ngeblogging-dns-v67",
    method: "two-cname",
    target,
    verificationTarget,
    records,
    required_name_servers: records.map((record) => `${record.type}|${record.name}|${record.value}`),
  };
}

export function normalizeDnsValue(value) {
  return cleanHostname(String(value || "").replace(/^"|"$/g, ""));
}

export function cnameAnswerMatches(answers, expected) {
  const target = normalizeDnsValue(expected);
  return Array.isArray(answers) && answers.some((answer) => (
    Number(answer?.type) === 5 && normalizeDnsValue(answer?.data) === target
  ));
}

export function addressAnswers(answers) {
  return new Set((Array.isArray(answers) ? answers : [])
    .filter((answer) => [1, 28].includes(Number(answer?.type)))
    .map((answer) => String(answer?.data || "").trim().toLowerCase())
    .filter(Boolean));
}

export function addressSetsOverlap(left, right) {
  const a = left instanceof Set ? left : new Set(left || []);
  const b = right instanceof Set ? right : new Set(right || []);
  return [...a].some((value) => b.has(value));
}
