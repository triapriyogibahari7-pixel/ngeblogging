import React,{useEffect,useState} from 'react';
import {ownerIdentity} from '../../services/privateEmailService';
import {publicDisplayName,isVerificationActive} from '../../services/private-email-validation-v419.mjs';
import '../../styles/account-email-v419.css';
import '../../styles/account-names-v422.css';
const labels={ownership:'Kepemilikan akun terverifikasi',identity:'Identitas terverifikasi',public_figure:'Tokoh publik terverifikasi'};
export function VerifiedAccountName({name,verification,compact=true}){const active=isVerificationActive(verification),label=labels[verification?.verification_kind]||'Akun terverifikasi';return <span className={compact?'oi419-name oi422-inline':'oi419-name'} data-account-name="single"><strong>{publicDisplayName(name)}</strong>{active&&<img src="/brand/verified-premium-v419.svg" width="32" height="32" alt={label} title={label}/>}</span>;}
export default function OwnerIdentityHeader({compact=false,fallbackName}){
 const [identity,setIdentity]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;const load=()=>ownerIdentity().then(v=>{if(live){setIdentity(v);setError('');}}).catch(e=>{if(live){setIdentity(null);setError(e.message);}});load();const timer=setInterval(load,60000);window.addEventListener('focus',load);window.addEventListener('ngeblogging:profile-updated',load);return()=>{live=false;clearInterval(timer);window.removeEventListener('focus',load);window.removeEventListener('ngeblogging:profile-updated',load);};},[]);
 const v=identity?.verification,active=isVerificationActive(v),name=identity?.profile?.display_name||fallbackName;
 const row=<VerifiedAccountName name={name} verification={v} compact={compact}/>;
 if(compact)return row;
 return <div className="oi419-identity">{row}{active&&<small>{labels[v.verification_kind]}{v.expires_at?' · hingga '+new Date(v.expires_at).toLocaleDateString('id-ID'):''}</small>}{error&&<p role="alert">Identitas belum dapat dimuat: {error}</p>}</div>;
}
