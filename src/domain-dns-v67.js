const RELEASE = "domain-dns-v67-20260727";
let frame = 0;

function parseRecord(value) {
  const [type, name, ...target] = String(value || "").split("|");
  const record = { type: type?.trim(), name: name?.trim(), value: target.join("|").trim() };
  return record.type === "CNAME" && record.name && record.value ? record : null;
}

function recordHost(record) {
  return record.name.startsWith("_ngeblogging.") ? "_ngeblogging" : "@";
}

function domainRoot() {
  return document.querySelector(".dfz-root");
}

function contractRecords(root = domainRoot()) {
  if (!root) return [];
  return [...root.querySelectorAll(".dfz-nameservers code")]
    .map((node) => parseRecord(node.dataset.domainDnsV67Raw || node.textContent))
    .filter(Boolean);
}

function copy(value, message = "Record DNS disalin.") {
  navigator.clipboard?.writeText(value).then(() => {
    const node = document.createElement("div");
    node.className = "dfz-toast";
    node.textContent = message;
    document.body.append(node);
    setTimeout(() => node.remove(), 2600);
  }).catch(() => {});
}

function enhanceRecords(root) {
  const section = root.querySelector(".dfz-nameservers");
  if (!section) return false;
  const rows = [...section.querySelectorAll(":scope > div")];
  let enhanced = false;
  for (const row of rows) {
    const code = row.querySelector("code");
    if (!code) continue;
    const raw = code.dataset.domainDnsV67Raw || code.textContent;
    const record = parseRecord(raw);
    if (!record) continue;
    code.dataset.domainDnsV67Raw = raw;
    code.textContent = record.value;
    const label = row.querySelector(":scope > span");
    if (label) {
      label.innerHTML = `<b>${record.type}</b><small>Host: ${recordHost(record)} · ${record.name}</small>`;
    }
    const button = row.querySelector('[data-action="copy-ns"]');
    if (button) {
      button.dataset.value = record.value;
      button.setAttribute("aria-label", `Salin target ${record.type} untuk ${record.name}`);
    }
    row.dataset.domainDnsPurpose = record.name.startsWith("_ngeblogging.") ? "ownership" : "routing";
    enhanced = true;
  }
  if (!enhanced) return false;
  const small = section.querySelector("header small");
  const title = section.querySelector("header h3");
  const all = section.querySelector('header [data-action="copy-all-ns"]');
  if (small) small.textContent = "2 RECORD DNS WAJIB";
  if (title) title.textContent = "Tambahkan dua CNAME di pengelola DNS domain";
  if (all) all.lastChild && (all.lastChild.textContent = "Salin 2 record");
  if (!section.querySelector("[data-domain-dns-v67-note]")) {
    const note = document.createElement("p");
    note.dataset.domainDnsV67Note = "true";
    note.className = "dfz-domain-dns-note";
    note.textContent = "Gunakan mode DNS only / proxy nonaktif untuk kedua record selama verifikasi dan penerbitan HTTPS.";
    section.append(note);
  }
  section.dataset.domainDnsV67 = RELEASE;
  return true;
}

function rewriteText(root) {
  const replacements = [
    ["Hubungkan domain milik Anda, verifikasi nameserver, lalu kelola www dan subdomain lain dari satu tempat.", "Hubungkan domain milik Anda dengan dua record DNS Ngeblogging, verifikasi otomatis, lalu aktifkan HTTPS tanpa memindahkan pengelolaan DNS."],
    ["Masukkan domain yang Anda miliki. Ngeblogging akan menyiapkan nameserver, HTTPS, dan koneksi situs.", "Masukkan domain yang Anda miliki. Ngeblogging menyiapkan target koneksi tetap, kode verifikasi unik, HTTPS, dan routing situs."],
    ["Selesaikan verifikasi nameserver.", "Tambahkan dua record DNS, lalu tunggu verifikasi otomatis."],
    ["Verifikasi nameserver", "Verifikasi DNS"],
    ["Ganti nameserver di registrar domain", "Tambahkan dua record di pengelola DNS domain"],
  ];
  for (const element of root.querySelectorAll("p, span, i, h3")) {
    const text = element.textContent?.trim();
    const replacement = replacements.find(([source]) => text === source)?.[1];
    if (replacement) element.textContent = replacement;
  }
}

function enhance() {
  const root = domainRoot();
  if (!root) return;
  const branded = enhanceRecords(root);
  if (branded) {
    rewriteText(root);
    root.dataset.domainDnsV67 = RELEASE;
    document.documentElement.dataset.domainDnsV67 = RELEASE;
  }
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(enhance);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="copy-all-ns"]');
  const root = domainRoot();
  if (!button || !root?.contains(button)) return;
  const records = contractRecords(root);
  if (!records.length) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const value = records.map((record) => `${record.type}\t${recordHost(record)}\t${record.value}`).join("\n");
  copy(value, "Dua record DNS disalin.");
}, true);

window.addEventListener("pageshow", schedule);
window.addEventListener("ngeblogging:domain-api-diagnostic", schedule);
new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "characterData")) schedule();
}).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

schedule();
