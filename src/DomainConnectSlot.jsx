import React,{useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
export default function DomainConnectSlot({rootRef,children}){
 const [host,setHost]=useState(null),[open,setOpen]=useState(false);
 const formId=useId(),formRef=useRef(null);
 useEffect(()=>{
  const root=rootRef.current;if(!root)return;const owned=new Set();
  const attach=()=>{const list=root.querySelector('.sv124-domain-list');if(!list){setHost(previous=>previous===null?previous:null);return;}let slot=list.querySelector(':scope > [data-domain-connect-slot]');if(!slot){slot=document.createElement('div');slot.setAttribute('data-domain-connect-slot','v1');const header=list.querySelector(':scope > header');list.insertBefore(slot,header?header.nextSibling:list.firstChild);owned.add(slot);}setHost(previous=>previous===slot?previous:slot);};
  const observer=new MutationObserver(attach);observer.observe(root,{childList:true,subtree:true});attach();
  return()=>{observer.disconnect();for(const slot of owned)slot.remove();};
 },[rootRef]);
 useEffect(()=>{if(open)formRef.current?.querySelector('input:not(:disabled)')?.focus();},[open,host]);
 const content=<div className="nd-domain-connect-action">
  <button type="button" className="sv124-primary nd-connect-open" aria-expanded={open} aria-controls={formId} onClick={()=>{setOpen(true);formRef.current?.querySelector('input:not(:disabled)')?.focus();}}>Hubungkan domain</button>
  <div id={formId} ref={formRef} hidden={!open}>{open?children:null}</div>
 </div>;
 return host?createPortal(content,host):content;
}
