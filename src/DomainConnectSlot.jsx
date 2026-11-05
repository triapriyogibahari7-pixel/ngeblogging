import React,{useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
export default function DomainConnectSlot({rootRef,children}){
 const [host,setHost]=useState(null);
 useEffect(()=>{
  const root=rootRef.current;if(!root)return;const owned=new Set();
  const attach=()=>{const list=root.querySelector('.sv124-domain-list');if(!list){setHost(previous=>previous===null?previous:null);return;}let slot=list.querySelector(':scope > [data-domain-connect-slot]');if(!slot){slot=document.createElement('div');slot.setAttribute('data-domain-connect-slot','v1');const header=list.querySelector(':scope > header');list.insertBefore(slot,header?header.nextSibling:list.firstChild);owned.add(slot);}setHost(previous=>previous===slot?previous:slot);};
  const observer=new MutationObserver(attach);observer.observe(root,{childList:true,subtree:true});attach();
  return()=>{observer.disconnect();for(const slot of owned)slot.remove();};
 },[rootRef]);
 return host?createPortal(children,host):null;
}
