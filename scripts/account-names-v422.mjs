import {transformSiteMenus} from './site-menus-v420.mjs';
function once(s,a,b){if(s.split(a).length!==2)throw Error('Pola nama akun berubah; build dihentikan.');return s.replace(a,b);}
export function transformAccountNames(source,id){const prior=transformSiteMenus(source,id);let code=prior?.code||source;const path=id.split('?')[0].replaceAll('\\','/');
 if(path.endsWith('/src/pages/SiteSettingsPage.jsx')){code=once(code,'<h1>Pengaturan {site.name}</h1>','<h1>Pengaturan situs</h1>');if(code.split('<OwnerIdentityHeader/>').length!==2)throw Error('Pengaturan harus memiliki tepat satu identitas akun');return {code,map:null};}
 if(path.endsWith('/src/StudioNext.jsx')){code="import OwnerIdentityHeader from './components/account/OwnerIdentityHeader';\n"+code;return {code:once(code,'<h1>{displayName}, ruang kerja Anda siap.</h1>','<h1><OwnerIdentityHeader compact fallbackName={displayName}/>, ruang kerja Anda siap.</h1>'),map:null};}
 if(path.endsWith('/src/components/account/VerificationIdentityCard.jsx')){
  code="import {VerifiedAccountName} from './OwnerIdentityHeader';\n"+code;
  const start='<div className="nv418-name">',end='</div><p>{active?';
  if(code.split(start).length!==2)throw Error('Baris nama kartu verifikasi tidak tunggal');const a=code.indexOf(start),b=code.indexOf(end,a);if(b<0)throw Error('Batas baris nama tidak ditemukan');
  code=code.slice(0,a)+'<VerifiedAccountName name={profile?.display_name} verification={v}/><p>{active?'+code.slice(b+end.length);
  return {code,map:null};
 }
 if(path.endsWith('/src/pages/ProfilePage.jsx'))return {code:once(code,"onProfileSaved?.(next);setMessage('Identitas global tersimpan.');","onProfileSaved?.(next);window.dispatchEvent(new CustomEvent('ngeblogging:profile-updated',{detail:{displayName:next.display_name}}));setMessage('Identitas global tersimpan.');"),map:null};
 return prior;
}
