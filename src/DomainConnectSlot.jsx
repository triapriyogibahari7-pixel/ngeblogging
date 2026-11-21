import React,{useEffect,useId,useRef,useState} from 'react';
export default function DomainConnectSlot({children}){
 const [open,setOpen]=useState(false);
 const formId=useId(),formRef=useRef(null);
 useEffect(()=>{if(open)formRef.current?.querySelector('input:not(:disabled)')?.focus();},[open]);
 return <section className="sv124-card nd-domain-connect-action" aria-label="Hubungkan domain ke situs">
  <button type="button" className="sv124-primary nd-connect-open" aria-expanded={open} aria-controls={formId} onClick={()=>{setOpen(true);formRef.current?.querySelector('input:not(:disabled)')?.focus();}}>Hubungkan domain</button>
  <div id={formId} ref={formRef} hidden={!open}>{open?children:null}</div>
 </section>;
}
