import React from 'react';
import LiveRegistrarSearch from './LiveRegistrarSearch.jsx';
export default function DomainQuoteLookup({userId,siteId,siteName,initialDomain='',onSelect}){
 return React.createElement(LiveRegistrarSearch,{user:{id:userId},siteId,siteName,onSelect,initialDomain,fullDomain:true,showOrders:false});
}
