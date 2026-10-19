import React, { useMemo } from 'react';
import StudioOnboardingGate from './StudioOnboardingGate.jsx';
import StudioSecure from './StudioSecure.jsx';
import OwnerDashboard from './OwnerDashboard.jsx';
import { ACTIVE_SITE_STORAGE_KEY } from './lib/studio-data.js';
const RELEASE='studio-fast-entry-v311-20260806';
const SNAPSHOT_KEYS=[292,209,208,205,198,195,192,191,190,186,185,183].map(v=>`ngeblogging-active-site-snapshot-v${v}`);
function usableSite(value){return Boolean(value?.id&&(value?.slug||value?.name));}
function siteBelongsToUser(value,userId){if(!usableSite(value))return false;if(!userId)return true;return Boolean(value.__userId&&value.__userId===userId);}
function snapshotForUser(userId){for(const key of SNAPSHOT_KEYS){try{const value=JSON.parse(localStorage.getItem(key)||'null');if(siteBelongsToUser(value,userId))return value;}catch{}}return null;}
function hasKnownSite(userId){try{if(siteBelongsToUser(window.__ngebloggingActiveSite,userId))return true;const snapshot=snapshotForUser(userId);if(!snapshot)return false;const preferredId=document.documentElement.dataset.activeSiteId||localStorage.getItem(ACTIVE_SITE_STORAGE_KEY)||'';return !preferredId||String(snapshot.id)===String(preferredId);}catch{return siteBelongsToUser(window.__ngebloggingActiveSite,userId);}}
export default function StudioFastGate(props){const resume=useMemo(()=>Boolean(props.user?.id&&hasKnownSite(props.user.id)),[props.user?.id]);document.documentElement.dataset.studioEntryRelease=RELEASE;document.documentElement.dataset.studioEntryMode=resume?'resume-known-site-v292':'verify-first-site-v292';return <>{resume?<StudioSecure {...props}/>:<StudioOnboardingGate {...props}/>}<OwnerDashboard user={props.user}/></>;}
