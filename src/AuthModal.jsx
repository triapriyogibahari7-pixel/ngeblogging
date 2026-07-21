import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  requestPasswordReset,
  signInWithMagicLink,
  signInWithPassword,
  signInWithProvider,
  signUpWithPassword,
  supabaseConfigured,
  updatePassword,
} from "./lib/supabase";

const titles = {
  signin: "Masuk ke Ngeblogging",
  signup: "Buat akun Ngeblogging",
  forgot: "Pulihkan akun Anda",
  recovery: "Buat password baru",
};

function friendlyError(error) {
  const value = String(error?.message || "").toLowerCase();
  if (value.includes("provider is not enabled")) {
    return "Provider ini belum diaktifkan di Supabase. Selesaikan pengaturan provider lalu coba lagi.";
  }
  if (value.includes("invalid login credentials")) {
    return "Email atau password tidak cocok. Periksa kembali atau gunakan Lupa password.";
  }
  if (value.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Periksa kotak masuk dan folder spam Anda.";
  }
  if (value.includes("user already registered")) {
    return "Email ini sudah terdaftar. Silakan masuk atau pulihkan password.";
  }
  if (value.includes("password should be")) {
    return "Password belum memenuhi persyaratan keamanan.";
  }
  if (value.includes("rate limit")) {
    return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  }
  return error?.message || "Proses belum berhasil. Silakan coba lagi.";
}

export default function AuthModal({
  onClose,
  onDemo,
  onAuthenticated,
  initialMode = "signin",
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

  useEffect(() => setMode(initialMode), [initialMode]);

  const changeMode = (next) => {
    setMode(next);
    setMessage("");
    setSuccess(false);
    setPassword("");
    setConfirmPassword("");
  };

  const run = async (action) => {
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      await action();
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      if (mode === "signin") {
        await signInWithPassword(email, password);
        onAuthenticated();
        return;
      }

      if (mode === "signup") {
        if (password.length < 8) throw new Error("Password minimal 8 karakter.");
        if (password !== confirmPassword) throw new Error("Konfirmasi password belum sama.");
        const data = await signUpWithPassword(email, password, fullName);
        if (data.session) onAuthenticated();
        else {
          setSuccess(true);
          setMessage("Akun dibuat. Periksa email Anda untuk mengonfirmasi pendaftaran.");
        }
        return;
      }

      if (mode === "forgot") {
        await requestPasswordReset(email);
        setSuccess(true);
        setMessage("Tautan pemulihan sudah dikirim. Periksa kotak masuk dan folder spam Anda.");
        return;
      }

      if (password.length < 8) throw new Error("Password minimal 8 karakter.");
      if (password !== confirmPassword) throw new Error("Konfirmasi password belum sama.");
      await updatePassword(password);
      setSuccess(true);
      setMessage("Password berhasil diperbarui. Anda sekarang sudah masuk.");
      window.setTimeout(onAuthenticated, 700);
    });
  };

  const isPasswordMode = mode === "signin" || mode === "signup" || mode === "recovery";

  return (
    <div
      className="modal auth-modal"
      onMouseDown={(event) => event.target === event.currentTarget && mode !== "recovery" && onClose()}
    >
      <div>
        {mode !== "recovery" && (
          <button className="close" onClick={onClose} aria-label="Tutup"><X /></button>
        )}
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
            <div className="oauth-grid">
              <button disabled={busy || !supabaseConfigured} onClick={() => run(() => signInWithProvider("google"))}>
                <b>G</b> Lanjutkan dengan Google
              </button>
              <button disabled={busy || !supabaseConfigured} onClick={() => run(() => signInWithProvider("linkedin_oidc"))}>
                <BriefcaseBusiness /> Lanjutkan dengan LinkedIn
              </button>
            </div>
            <div className="auth-divider"><span>atau gunakan email</span></div>
          </>
        )}

        <form className="password-form" onSubmit={submit}>
          {mode === "signup" && (
            <label>
              <span>Nama lengkap</span>
              <div><UserRound /><input required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" placeholder="Nama Anda" /></div>
            </label>
          )}
          {mode !== "recovery" && (
            <label>
              <span>Email</span>
              <div><Mail /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="nama@email.com" /></div>
            </label>
          )}
          {isPasswordMode && (
            <label>
              <span>{mode === "recovery" ? "Password baru" : "Password"}</span>
              <div>
                <KeyRound />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={mode === "signin" ? undefined : 8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder={mode === "signin" ? "Masukkan password" : "Minimal 8 karakter"}
                />
                <button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
          )}
          {(mode === "signup" || mode === "recovery") && (
            <label>
              <span>Ulangi password</span>
              <div><KeyRound /><input type={showPassword ? "text" : "password"} required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Ketik ulang password" /></div>
            </label>
          )}
          {mode === "signin" && (
            <button className="forgot-link" type="button" onClick={() => changeMode("forgot")}>Lupa password?</button>
          )}
          <button className="auth-submit" disabled={busy || !supabaseConfigured}>
            {busy ? "Memproses…" : mode === "signin" ? "Masuk dengan email" : mode === "signup" ? "Buat akun" : mode === "forgot" ? "Kirim tautan pemulihan" : "Simpan password baru"}
            {!busy && <ArrowRight />}
          </button>
        </form>

        {mode === "signin" && (
          <button className="magic-link-button" disabled={busy || !supabaseConfigured} onClick={() => {
            if (!email) {
              setMessage("Masukkan email terlebih dahulu.");
              return;
            }
            run(async () => {
              await signInWithMagicLink(email);
              setSuccess(true);
              setMessage("Tautan masuk sudah dikirim. Periksa email Anda.");
            });
          }}>
            Masuk tanpa password melalui email
          </button>
        )}

        {message && <p className={`auth-message ${success ? "success" : ""}`} role="status">{message}</p>}

        {!supabaseConfigured && (
          <div className="demo-notice">
            <b>Mode pratinjau aktif</b>
            <span>Environment variables Supabase belum tersedia pada deployment ini.</span>
            <button onClick={onDemo}>Masuk Studio demo</button>
          </div>
        )}

        {mode === "signin" && <p className="auth-switch">Belum punya akun? <button onClick={() => changeMode("signup")}>Daftar gratis</button></p>}
        {mode === "signup" && <p className="auth-switch">Sudah punya akun? <button onClick={() => changeMode("signin")}>Masuk</button></p>}
        {mode === "forgot" && <button className="auth-back" onClick={() => changeMode("signin")}><ArrowLeft /> Kembali ke halaman masuk</button>}
        <small className="auth-terms">Dengan melanjutkan, Anda menyetujui Syarat Layanan dan Kebijakan Privasi.</small>
      </div>
    </div>
  );
}
