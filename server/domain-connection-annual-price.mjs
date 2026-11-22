import {DOMAIN_CONNECTION_ANNUAL_PRICE} from '../shared/domain-connection-annual-price.mjs';
const OFFER='/api/domains/connection-price',CHECKOUT='/api/domains/connection-checkout';
const json=(status,body)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export function domainConnectionAnnualPriceResponse(request) {
 const path=new URL(request.url).pathname;
 if(path!==OFFER&&path!==CHECKOUT)return null;
 if(path===OFFER&&request.method==='GET')return json(200,{
  price:DOMAIN_CONNECTION_ANNUAL_PRICE,checkoutReady:false,paymentRequired:true,
  service:'custom-domain-connection',domainPurchaseIncluded:false,
 });
 if(path===CHECKOUT&&request.method==='POST')return json(503,{
  code:'DOMAIN_CONNECTION_CHECKOUT_NOT_READY',price:DOMAIN_CONNECTION_ANNUAL_PRICE,
  checkoutReady:false,charged:false,domainRegistered:false,publicSiteVerified:false,
  error:'Harga US$5.49/tahun mencakup domain utama dan www. Checkout belum tersedia; tidak ada pembayaran yang diproses atau domain yang dipasang.',
 });
 return json(405,{code:'METHOD_NOT_ALLOWED'});
}
