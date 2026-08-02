import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import ThemeStudio from "./ThemeStudio.jsx";

const RELEASE = "theme-studio-boundary-v219-20260802";

export default class ThemeStudioBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Theme Studio render failed", error, info);
  }

  retry = () => {
    this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <section className="tn-v219-recovery" data-theme-boundary-release={RELEASE} role="alert">
          <span className="tn-v219-recovery-icon"><AlertTriangle /></span>
          <div>
            <small>TEMA NGEBLOGGING</small>
            <h2>Tema belum dapat dirender.</h2>
            <p>Data tema, kode, widget, dan konfigurasi tetap dipertahankan. Coba render ulang permukaan Tema tanpa keluar dari akun.</p>
          </div>
          <button type="button" onClick={this.retry}><RefreshCw /> Coba lagi</button>
        </section>
      );
    }

    return <ThemeStudio key={this.state.retryKey} {...this.props} />;
  }
}

export { RELEASE as THEME_STUDIO_BOUNDARY_RELEASE_V219 };
