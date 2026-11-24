import React from 'react';
import {ExternalLink} from 'lucide-react';
import {customerHost} from '../shared/customer-domain-connection.mjs';
export default function DomainCardConnection({site,domain}){
 let href=null;
 try{if(site?.id&&domain?.site_id===site.id)href='https://'+customerHost(domain.hostname);}catch{}
 return <section data-domain-card-connection="domain-card-direct-visit-v1">
  {href&&<a className="sv124-primary" href={href} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true"/>Lihat situs</a>}
 </section>;
}
