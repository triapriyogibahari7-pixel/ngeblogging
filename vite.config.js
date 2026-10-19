import { defineConfig } from "vite";
import { patchStudio } from "./scripts/separate-profile-settings-v413.mjs";

// Keep retired Studio shell/layout authorities disabled.
// This pure build transform does not mutate source files, run deployment,
// change payment code, or re-activate historical Studio runtimes.
export default defineConfig({
  plugins: [{
    name: "ngeblogging-profile-settings-v413",
    enforce: "pre",
    transform(source, id) {
      const path = id.split("?")[0].replaceAll("\\", "/");
      if (!path.endsWith("/src/StudioNext.jsx")) return null;
      const code = patchStudio(source);
      const required = [
        'className="sn-avatar" onClick={() => chooseView("profile")}',
        '{view === "profile" && <ProfilePage',
        '{view === "settings" && <SiteSettingsPage',
        'const [settingsDirty, setSettingsDirty] = useState(false);',
      ];
      if (required.some((token) => !code.includes(token))) {
        throw new Error("Pemisahan Profil/Pengaturan gagal divalidasi; build dihentikan.");
      }
      if (code.includes('{view === "settings" && <SettingsView')) {
        throw new Error("Halaman gabungan lama masih aktif; build dihentikan.");
      }
      return { code, map: null };
    },
  }],
});
