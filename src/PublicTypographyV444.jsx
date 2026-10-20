import React,{useEffect,useMemo,useState} from 'react';
import {sanitizeTypographyHtml,typographyFonts} from './lib/public-typography-v444.mjs';
import {loadEditorFont} from './lib/editor-fonts-v444.mjs';
export default function PublicTypographyV444({html}){const safe=useMemo(()=>sanitizeTypographyHtml(html),[html]);const [failed,setFailed]=useState(false);useEffect(()=>{let active=true;setFailed(false);Promise.all(typographyFonts(safe).map(loadEditorFont)).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[safe]);return <><div className="ps-body" dangerouslySetInnerHTML={{__html:safe}}/>{failed&&<small role="status">Sebagian font belum termuat; teks tetap ditampilkan dengan font pengganti.</small>}</>;}
