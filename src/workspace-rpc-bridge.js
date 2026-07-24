import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 63);
}

function toast(message) {
  const existing = document.querySelector(".sn-toast");
  if (existing?.lastChild) {
    existing.lastChild.textContent = message;
    return;
  }
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;
  const node = document.createElement("div");
  node.className = "sn-toast wrb-toast";
  node.textContent = message;
  shell.prepend(node);
  window.setTimeout(() => node.remove(), 4200);
}

async function createWorkspace(button, section) {
  const inputs = [...section.querySelectorAll("input")];
  const name = String(inputs[0]?.value || "").trim();
  const slug = slugify(inputs[1]?.value || name);
  const description = String(section.querySelector("textarea")?.value || "").trim().slice(0, 500);
  const blueprint = String(section.querySelector("select")?.value || "blog");

  if (name.length < 2) throw new Error("Nama situs minimal 2 karakter.");
  if (slug.length < 3) throw new Error("Subdomain minimal 3 karakter.");

  button.disabled = true;
  const previous = button.innerHTML;
  button.textContent = "Membuat situs dan subdomain…";
  try {
    const { data, error } = await supabase.rpc("create_site_workspace", {
      site_name: name,
      site_slug: slug,
      site_description: description,
      site_blueprint: blueprint,
    });
    if (error) throw error;
    const site = Array.isArray(data) ? data[0] : data;
    if (!site?.id) throw new Error("Workspace sudah dibuat tetapi identitas situs belum diterima.");
    localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, site.id);
    toast(`Situs ${site.name} dan ${site.slug}.ngeblogging.com berhasil dibuat`);
    window.setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    button.disabled = false;
    button.innerHTML = previous;
    throw error;
  }
}

document.addEventListener("click", async (event) => {
  if (!supabaseConfigured || !supabase) return;
  const button = event.target.closest(".sn-create-site > button.sn-primary");
  if (!button || button.disabled || button.dataset.rpcBusy === "true") return;

  // Stop React's legacy direct-insert handler synchronously. Waiting for an
  // async session read first would allow both handlers to create a site.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  button.dataset.rpcBusy = "true";

  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user?.id) throw new Error("Sesi login tidak ditemukan. Masuk kembali lalu coba lagi.");
    await createWorkspace(button, button.closest(".sn-create-site"));
  } catch (error) {
    toast(error.message || "Situs dan subdomain belum dapat dibuat.");
    button.dataset.rpcBusy = "false";
  }
}, true);
