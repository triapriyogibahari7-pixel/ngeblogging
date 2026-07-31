import React, { useEffect, useRef, useState } from "react";
import { Camera, Check, Download, Globe2, LoaderCircle, Save, UserRound } from "lucide-react";
import { supabase } from "./lib/supabase.js";
import { updateUserProfile } from "./lib/studio-data.js";
import "./studio-screenshot-fixes-v177.css";

const PROFILE_MEDIA_BUCKET = "site-public-media";
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

function displayNameFor(profile, user) {
  return profile?.display_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split("@")[0]
    || "Akun Ngeblogging";
}

function initialsFor(value) {
  return String(value || "NB").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NB";
}

export function ProfileViewV177({ site, profile, setProfile, user, setToast }) {
  const [draft, setDraft] = useState({
    displayName: displayNameFor(profile, user),
    bio: profile?.bio || "",
    website: profile?.website || "",
    avatarUrl: profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "",
    locale: profile?.locale || "id-ID",
    timezone: profile?.timezone || "Asia/Jakarta",
  });
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    setDraft({
      displayName: displayNameFor(profile, user),
      bio: profile?.bio || "",
      website: profile?.website || "",
      avatarUrl: profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "",
      locale: profile?.locale || "id-ID",
      timezone: profile?.timezone || "Asia/Jakarta",
    });
  }, [profile?.id, profile?.updated_at, user?.id]);

  const save = async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const updated = await updateUserProfile(user.id, draft);
      setProfile(updated);
      setToast("Profil berhasil disimpan");
      window.dispatchEvent(new CustomEvent("ngeblogging:profile-updated", {
        detail: { displayName: updated?.display_name || draft.displayName, avatarUrl: updated?.avatar_url || draft.avatarUrl },
      }));
    } catch (error) {
      setToast(error.message || "Profil belum dapat disimpan");
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || avatarBusy) return;
    setAvatarBusy(true);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Pilih berkas gambar JPG, PNG, WebP, AVIF, HEIC, atau HEIF.");
      if (file.size > MAX_AVATAR_BYTES) throw new Error("Avatar maksimal 8 MB.");
      if (!supabase || !site?.id || !user?.id) throw new Error("Situs aktif atau sesi pengguna belum tersedia.");
      const extension = String(file.name || "avatar.jpg").split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const objectPath = `${site.id}/${user.id}/avatars/${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from(PROFILE_MEDIA_BUCKET).upload(objectPath, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (upload.error) throw upload.error;
      const avatarUrl = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(objectPath).data.publicUrl;
      const updated = await updateUserProfile(user.id, { ...draft, avatarUrl });
      setDraft((current) => ({ ...current, avatarUrl }));
      setProfile(updated);
      setToast("Avatar berhasil diperbarui");
      window.dispatchEvent(new CustomEvent("ngeblogging:profile-updated", { detail: { displayName: draft.displayName, avatarUrl } }));
    } catch (error) {
      setToast(error.message || "Avatar belum dapat diperbarui");
    } finally {
      setAvatarBusy(false);
    }
  };

  const requestInstall = () => window.dispatchEvent(new CustomEvent("ngeblogging:install-app-request"));

  return <div className="sn-view-pad sp177-page" data-profile-page-release="v177">
    <header className="sn-page-title sp177-title">
      <div><small>AKUN NGEBLOGGING</small><h1>Profil</h1><p>Identitas pribadi dipisahkan dari pengaturan situs agar mudah dipahami dan tidak tercampur.</p></div>
    </header>
    <div className="sp177-profile-grid">
      <section className="sp177-profile-card">
        <div className="sp177-avatar-preview">
          {draft.avatarUrl ? <img src={draft.avatarUrl} alt="Avatar profil"/> : <span>{initialsFor(draft.displayName)}</span>}
        </div>
        <div><h2>{draft.displayName || "Akun Ngeblogging"}</h2><p>{user?.email || "Email akun tidak ditampilkan"}</p></div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" hidden onChange={uploadAvatar}/>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={avatarBusy}><Camera/>{avatarBusy ? "Mengunggah…" : "Ganti avatar"}</button>
        <button type="button" onClick={requestInstall}><Download/>Dapatkan aplikasi</button>
      </section>
      <section className="sp177-form-card">
        <h2><UserRound/> Identitas</h2>
        <label>Nama tampilan<input value={draft.displayName} maxLength={160} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}/></label>
        <label>Biografi<textarea value={draft.bio} maxLength={1000} rows={5} onChange={(event) => setDraft({ ...draft, bio: event.target.value })}/></label>
        <label>Website pribadi<input value={draft.website} maxLength={500} inputMode="url" placeholder="https://" onChange={(event) => setDraft({ ...draft, website: event.target.value })}/></label>
        <div className="sp177-form-row">
          <label>Bahasa<select value={draft.locale} onChange={(event) => setDraft({ ...draft, locale: event.target.value })}><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option><option value="ms-MY">Bahasa Melayu</option></select></label>
          <label>Zona waktu<select value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></label>
        </div>
        <button className="sn-primary sp177-save" type="button" onClick={save} disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Check/>}{busy ? "Menyimpan…" : "Simpan profil"}</button>
      </section>
    </div>
  </div>;
}

export function SiteSettingsViewV177({ site, setSite, setToast }) {
  const [draft, setDraft] = useState({
    name: site?.name || "",
    description: site?.description || "",
    locale: site?.locale || "id-ID",
    timezone: site?.timezone || site?.settings?.timezone || "Asia/Jakarta",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft({
      name: site?.name || "",
      description: site?.description || "",
      locale: site?.locale || "id-ID",
      timezone: site?.timezone || site?.settings?.timezone || "Asia/Jakarta",
    });
  }, [site?.id, site?.updated_at]);

  const save = async () => {
    if (!site?.id || !supabase || busy) return;
    setBusy(true);
    try {
      const nextSettings = { ...(site.settings || {}), timezone: draft.timezone };
      const result = await supabase.from("sites").update({
        name: draft.name.trim().slice(0, 100),
        description: draft.description.trim().slice(0, 1000),
        locale: draft.locale,
        settings: nextSettings,
      }).eq("id", site.id).select("*").single();
      if (result.error) throw result.error;
      setSite(result.data);
      setToast("Pengaturan situs berhasil disimpan");
    } catch (error) {
      setToast(error.message || "Pengaturan situs belum dapat disimpan");
    } finally {
      setBusy(false);
    }
  };

  return <div className="sn-view-pad sp177-page" data-settings-page-release="v177">
    <header className="sn-page-title sp177-title"><div><small>SITUS AKTIF</small><h1>Pengaturan</h1><p>Pengaturan situs, bahasa, dan zona waktu. Identitas pengguna dikelola pada halaman Profil.</p></div></header>
    <section className="sp177-form-card sp177-settings-card">
      <h2><Globe2/> Situs</h2>
      <label>Nama situs<input value={draft.name} maxLength={100} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label>
      <label>Deskripsi<textarea value={draft.description} maxLength={1000} rows={6} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label>
      <div className="sp177-form-row">
        <label>Bahasa<select value={draft.locale} onChange={(event) => setDraft({ ...draft, locale: event.target.value })}><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option><option value="ms-MY">Bahasa Melayu</option></select></label>
        <label>Zona waktu<select value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></label>
      </div>
      <button className="sn-primary sp177-save" type="button" onClick={save} disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Save/>}{busy ? "Menyimpan…" : "Simpan pengaturan"}</button>
    </section>
  </div>;
}
