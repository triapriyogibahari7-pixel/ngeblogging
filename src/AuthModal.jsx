import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  requestPasswordReset,
  resendSignUpConfirmation,
  signInWithMagicLink,
  signInWithPassword,
  signInWithProvider,
  signUpWithPassword,
  supabase,
  supabaseConfigured,
  updatePassword,
} from "./lib/supabase";
import "./auth-provider-gateway-v250.js";

const AUTH_SESSION_HANDOFF_RELEASE = "auth-session-handoff-v255-20260804";

const titles = {
  signin: "Masuk ke Ngeblogging",
  signup: "Buat akun Ngeblogging",
  forgot: "Pulihkan akun Anda",
  recovery: "Buat password baru",
};

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.24c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.3-5.28-1.29-5.28-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.26c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

function friendlyError(error) {
  const value = String(error?.message || "").toLowerCase();
  if (value.includes("provider is not enabled")) return "Provider ini belum diaktifkan. Gunakan metode login lain yang tersedia.";
  if (value.includes("invalid login credentials")) return "Email atau password tidak cocok. Periksa kembali atau gunakan Lupa password.";
  if (value.includes("email not confirmed")) return "Email belum dikonfirmasi. Kirim ulang verifikasi lalu periksa kotak masuk, Promosi, dan Spam.";
  if (value.includes("user already registered")) return "Email ini sudah terdaftar. Silakan masuk atau pulihkan password.";
  if (value.includes("password should be")) return "Password belum memenuhi persyaratan keamanan.";
  if (value.includes("rate limit") || value.includes("security purposes")) return "Permintaan terlalu sering. Tunggu sebentar sebelum mengirim ulang.";
  if (value.includes("redirect_uri_mismatch") || value.includes("redirect uri")) return "Alamat kembali login belum cocok dengan konfigurasi produksi.";
  if (value.includes("access_denied")) return "Login dibatalkan sebelum izin diberikan.";
  if (value.includes("expired") || value.includes("invalid token")) return "Tautan sudah kedaluwarsa atau tidak valid. Minta tautan baru.";
  if (value.includes("failed to fetch") || value.includes("network") || value.includes("jaringan") || value.includes("timeout")) {
    return "Koneksi autentikasi sedang terganggu. Sesi yang sudah ada tidak akan dihapus; coba lagi ketika jaringan stabil.";
  }
  return error?.message || "Proses belum berhasil. Silakan coba lagi.";
}

const oauthProviders = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub", icon: GitHubMark },
  { id: "linkedin_oidc", label: "LinkedIn", icon: BriefcaseBusiness },
];

export default function AuthModal({
  onClose,
  onDemo,
  onAuthenticated,
  initialMode = "signin",
  initialMessage = "",
}) {
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);

  useEffect(() => setMode(initialMode), [initialMode]);
  useEffect(() => {
    if (!initialMessage) return;
    const pending = String(initialMessage).toLowerCase().includes("email not confirmed");
    setVerificationPending(pending);
    setSuccess(false);
    setMessage(friendlyError({ message: initialMessage }));
  }, [initialMessage]);

  const changeMode = (next) => {
    setMode(next);
    setMessage("");
    setSuccess(false);
    setVerificationPending(false);
    setPassword("");
    setConfirmPassword("");
  };

  const settleAuthenticatedSession = async (sessionHint = null) => {
    let nextSession = sessionHint || null;
    if (!nextSession && supabase) {
      for (let attempt = 0; attempt < 4 && !nextSession; attempt += 1) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        nextSession = data?.session || null;
        if (!nextSession && attempt < 3) await new Promise((resolve) => window.setTimeout(resolve, 40));
      }
    }
    if (!nextSession?.user?.id || !nextSession?.access_token) {
      throw new Error("Sesi login belum terbentuk. Silakan coba masuk kembali tanpa menutup halaman ini.");
    }

    document.documentElement.dataset.authSessionHandoffV255 = AUTH_SESSION_HANDOFF_RELEASE;
    window.dispatchEvent(new CustomEvent("ngeblogging:auth-session-ready", {
      detail: {
        release: AUTH_SESSION_HANDOFF_RELEASE,
        source: "AuthModal",
        userId: nextSession.user.id,
      },
    }));

    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    await onAuthenticated?.(nextSession);
    return nextSession;
  };

  const run = async (action, actionName = "form") => {
    setBusy(true);
    setBusyAction(actionName);
    setMessage("");
    setSuccess(false);
    try {
      await action();
    } catch (error) {
      if (String(error?.message || "").toLowerCase().includes("email not confirmed")) setVerificationPending(true);
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
      setBusyAction("");
    }
  };

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      if (mode === "signin") {
        const data = await signInWithPassword(email, password);
        await settleAuthenticatedSession(data?.session || null);
        return;
      }

      if (mode === "signup") {
        if (fullName.trim().length < 2) throw new Error("Nama lengkap minimal 2 karakter.");
        if (password.length < 8) throw new Error("Password minimal 8 karakter.");
        if (password !== confirmPassword) throw new Error("Konfirmasi password belum sama.");
        const data = await signUpWithPassword(email, password, fullName);
        if (data.session) {
          await settleAuthenticatedSession(data.session);
          return;
        }
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setVerificationPending(false);
          setSuccess(false);
          setMessage("Email ini sudah terdaftar. Masuk dengan password yang benar atau gunakan Lupa password.");
          return;
        }
        setVerificationPending(true);
        setSuccess(true);
        setMessage("Pendaftaran diterima. Konfirmasi email diperlukan sebelum login. Gunakan tombol kirim ulang bila pesan belum tiba.");
        return;
      }

      if (mode === "forgot") {
        await requestPasswordReset(email);
        setSuccess(true);
        setMessage("Tautan pemulihan diminta. Periksa kotak masuk, Promosi, dan Spam.");
        return;
      }

      if (password.length < 8) throw new Error("Password minimal 8 karakter.");
      if (password !== confirmPassword) throw new Error("Konfirmasi password belum sama.");
      await updatePassword(password);
      await settleAuthenticatedSession();
    });
  };

  const resendVerification = () => {
    if (!email.trim()) {
      setSuccess(false);
      setMessage("Masukkan email pendaftaran terlebih dahulu.");
      return;
    }
    run(async () => {
      await resendSignUpConfirmation(email);
      setVerificationPending(true);
      setSuccess(true);
      setMessage("Email verifikasi diminta ulang. Tunggu beberapa menit lalu periksa kotak masuk, Promosi, dan Spam.");
    }, "resend-verification");
  };

  const isPasswordMode = mode === "signin" || mode === "signup" || mode === "recovery";

  return (
    <div className="modal auth-modal" data-auth-session-handoff-v255={AUTH_SESSION_HANDOFF_RELEASE} onMouseDown={(event) => event.target === event.currentTarget && mode !== "recovery" && onClose()}>
      <div>
        {mode !== "recovery" && <button className="close" onClick={onClose} aria-label="Tutup"><X /></button>}
        <div className="modal-icon">{mode === "recovery" ? <KeyRound /> : <Sparkles />}</div>
        <h2>{titles[mode]}</h2>
        <p className="auth-intro">
          {mode === "signin" && "Satu akun untuk menulis, menerbitkan, dan bekerja bersama Nara."}
          {mode === "signup" && "Mulai membangun situs dan simpan seluruh pekerjaan Anda dengan aman."}
          {mode === "forgot" && "Kami akan mengirim tautan aman untuk membuat password baru."}
          {mode === "recovery" && "Gunakan password kuat yang belum pernah Anda pakai di layanan lain."}
        </p>

        {(mode === "signin" || mode === "signup") && (
          <>
            <div className="oauth-grid" aria-label="Pilihan login sosial">
              {oauthProviders.map(({ id, label, icon: Icon }) => (
                <button type="button" className={`oauth-provider oauth-${id}`} disabled={busy || !supabaseConfigured} aria-busy={busyAction === id} onClick={() => run(() => signInWithProvider(id), id)} key={id}>
                  {busyAction === id ? <LoaderCircle className="spin" /> : Icon ? <Icon /> : <b>G</b>}
                  <span>{busyAction === id ? `Menghubungkan ${label}…` : `Lanjutkan dengan ${label}`}</span>
                </button>
              ))}
            </div>
            <p className="auth-security"><ShieldCheck /> Login aman melalui Supabase. Ngeblogging tidak pernah melihat password akun sosial Anda.</p>
            <div className="auth-divider"><span>atau gunakan email</span></div>
          </>
        )}

        <form className="password-form" onSubmit={submit}>
          {mode === "signup" && <label><span>Nama lengkap</span><div><UserRound /><input required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" placeholder="Nama Anda" /></div></label>}
          {mode !== "recovery" && <label><span>Email</span><div><Mail /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" spellCheck="false" placeholder="nama@email.com" /></div></label>}
          {isPasswordMode && (
            <label>
              <span>{mode === "recovery" ? "Password baru" : "Password"}</span>
              <div>
                <KeyRound />
                <input type={showPassword ? "text" : "password"} required minLength={mode === "signin" ? undefined : 8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder={mode === "signin" ? "Masukkan password" : "Minimal 8 karakter"} />
                <button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff /> : <Eye />}</button>
              </div>
            </label>
          )}
          {(mode === "signup" || mode === "recovery") && <label><span>Ulangi password</span><div><KeyRound /><input type={showPassword ? "text" : "password"} required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Ketik ulang password" /></div></label>}
          {mode === "signin" && <button className="forgot-link" type="button" onClick={() => changeMode("forgot")}>Lupa password?</button>}
          <button className="auth-submit" disabled={busy || !supabaseConfigured}>
            {busyAction === "form" ? "Memproses…" : mode === "signin" ? "Masuk dengan email" : mode === "signup" ? "Buat akun" : mode === "forgot" ? "Kirim tautan pemulihan" : "Simpan password baru"}
            {busyAction !== "form" && <ArrowRight />}
          </button>
        </form>

        {mode === "signin" && <button className="magic-link-button" disabled={busy || !supabaseConfigured} onClick={() => {
          if (!email) { setMessage("Masukkan email terlebih dahulu."); return; }
          run(async () => { await signInWithMagicLink(email); setSuccess(true); setMessage("Tautan masuk diminta. Periksa email Anda."); }, "magic-link");
        }}>Masuk tanpa password melalui email</button>}

        {verificationPending && <button className="magic-link-button" type="button" disabled={busy || !supabaseConfigured} onClick={resendVerification}>{busyAction === "resend-verification" ? "Mengirim ulang…" : "Kirim ulang email verifikasi"}</button>}

        {message && <p className={`auth-message ${success ? "success" : ""}`} role="status" aria-live="polite">{message}</p>}

        {!supabaseConfigured && <div className="demo-notice"><b>Mode pratinjau aktif</b><span>Environment variables Supabase belum tersedia pada deployment ini.</span><button onClick={onDemo}>Masuk Studio demo</button></div>}

        {mode === "signin" && <p className="auth-switch">Belum punya akun? <button onClick={() => changeMode("signup")}>Daftar gratis</button></p>}
        {mode === "signup" && <p className="auth-switch">Sudah punya akun? <button onClick={() => changeMode("signin")}>Masuk</button></p>}
        {mode === "forgot" && <button className="auth-back" onClick={() => changeMode("signin")}><ArrowLeft /> Kembali ke halaman masuk</button>}
        <small className="auth-terms">Dengan melanjutkan, Anda menyetujui Syarat Layanan dan Kebijakan Privasi.</small>
      </div>
    </div>
  );
}

export { AUTH_SESSION_HANDOFF_RELEASE };