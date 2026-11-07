import React from 'react';
import {ExternalLink} from 'lucide-react';
import DomainConnectionMenu from './DomainConnectionMenu.jsx';
import {customerHost} from '../shared/customer-domain-connection.mjs';
export default function DomainCardConnection({site,domain,disabled=false,beginOperation}){
 let href=null;
 try{if(site?.id&&domain?.site_id===site.id)href='https://'+customerHost(domain.hostname);}catch{}
 return <React.Fragment>
  <DomainConnectionMenu site={site} domain={domain} disabled={disabled} beginOperation={beginOperation}/>
  <section data-domain-card-connection="domain-card-direct-visit-v1">
   {href&&<a className="sv124-primary" href={href} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true"/>Lihat situs</a>}
  </section>
 </React.Fragment>;
}
