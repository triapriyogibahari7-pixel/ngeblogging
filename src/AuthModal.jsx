import React, { useState } from "react";
import { ArrowRight, BriefcaseBusiness, Mail, Sparkles, X } from "lucide-react";
import { signInWithMagicLink, signInWithProvider, supabaseConfigured } from "./lib/supabase";

export default function AuthModal({ onClose, onDemo }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (action) => {
    setBusy(true); setMessage("");
    try { await action(); } catch (error) { setMessage(error.message || "Login belum berhasil. Coba lagi."); }
    finally { setBusy(false); }
  };
  return <div className="modal auth-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div>
    <button className="close" onClick={onClose} aria-label="Tutup"><X /></button>
    <div className="modal-icon"><Sparkles /></div>
    <h2>Masuk ke Ngeblogging</h2>
    <p>Satu akun untuk menulis, menerbitkan, mengelola situs, dan bekerja bersama Nara.</p>
    <div className="oauth-grid">
      <button disabled={busy || !supabaseConfigured} onClick={() => run(() => signInWithProvider("google"))}><b>G</b> Lanjutkan dengan Google</button>
      <button disabled={busy || !supabaseConfigured} onClick={() => run(() => signInWithProvider("linkedin_oidc"))}><BriefcaseBusiness /> Lanjutkan dengan LinkedIn</button>
    </div>
    <div className="auth-divider"><span>atau gunakan email</span></div>
    <form className="magic-form" onSubmit={(e) => { e.preventDefault(); run(async () => { await signInWithMagicLink(email); setMessage("Tautan masuk sudah dikirim. Periksa email Anda."); }); }}>
      <label><Mail /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" /></label>
      <button disabled={busy || !supabaseConfigured}>Kirim tautan <ArrowRight /></button>
    </form>
    {message && <p className="auth-message">{message}</p>}
    {!supabaseConfigured && <div className="demo-notice"><b>Mode pratinjau aktif</b><span>Hubungkan Supabase untuk mengaktifkan login Google, LinkedIn, dan email.</span><button onClick={onDemo}>Masuk Studio demo</button></div>}
    <small className="auth-terms">Dengan melanjutkan, Anda menyetujui Syarat Layanan dan Kebijakan Privasi.</small>
  </div></div>;
}
