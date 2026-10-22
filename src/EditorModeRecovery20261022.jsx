import React, {useEffect, useState} from 'react';
import {EDITOR_MODE_EVENT, currentEditorPreference, setEditorPreference, syncEditorPreference} from './lib/editor-mode-recovery-20261022.mjs';
import {currentStudioDeviceMode, MODE_EVENT} from './studio-device-mode-v140.js';
import './editor-mode-recovery-20261022.css';
const labels = {auto: 'Otomatis', mobile: 'Mobile Ringkas', desktop: 'Desktop Lengkap'};
export default function EditorModeRecovery20261022() {
  const [value, setValue] = useState(currentEditorPreference);
  const [resolved, setResolved] = useState('mobile');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const app = document.querySelector('.ce-app');
    const sync = () => {
      const preference = currentEditorPreference();
      if (app) app.dataset.editorModeRecovery = preference;
      setValue(preference);
      setResolved(currentStudioDeviceMode() === 'large' ? 'desktop' : 'mobile');
    };
    const changed = () => { sync(); window.dispatchEvent(new Event('resize')); };
    window.addEventListener(EDITOR_MODE_EVENT, changed);
    window.addEventListener(MODE_EVENT, sync);
    window.addEventListener('storage', syncEditorPreference);
    changed();
    return () => {
      window.removeEventListener(EDITOR_MODE_EVENT, changed);
      window.removeEventListener(MODE_EVENT, sync);
      window.removeEventListener('storage', syncEditorPreference);
      if (app) delete app.dataset.editorModeRecovery;
      window.dispatchEvent(new Event('resize'));
    };
  }, []);
  function change(next) {
    const result = setEditorPreference(next);
    setValue(result.value);
    setMessage(result.persisted ? '' : 'Pilihan dipakai untuk sesi ini, tetapi belum tersimpan di browser.');
  }
  return <details className="ce463-mode"><summary>Tampilan editor: {labels[value]}{value === 'auto' ? ' — ' + labels[resolved] : ''}</summary><label>Mode <select aria-label="Mode editor" value={value} onChange={event => change(event.target.value)}>{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><small>Pilihan disimpan pada browser ini, bukan ke akun atau isi tulisan. Otomatis mengikuti perangkat; pilihan manual mengubah klasifikasi layout. Kesesuaian CSS masih dalam pengujian.</small>{message && <p role="status">{message}</p>}</details>;
}
