const definitions = Object.freeze([
  {id:'pro_monthly',label:'Nara Pro Bulanan',entitlement:'nara_pro',durationDays:31},
  {id:'pro_yearly',label:'Nara Pro Tahunan',entitlement:'nara_pro',durationDays:366},
  {id:'max_monthly',label:'Nara Max Bulanan',entitlement:'nara_max',durationDays:31},
  {id:'max_yearly',label:'Nara Max Tahunan',entitlement:'nara_max',durationDays:366},
].map(Object.freeze));

export function configuredMidtransPlans(raw) {
  let prices;
  try { prices=JSON.parse(raw || '{}'); } catch { return []; }
  if (!prices || typeof prices!=='object' || Array.isArray(prices)) return [];
  return definitions.filter(p=>Object.hasOwn(prices,p.id) && Number.isSafeInteger(prices[p.id]) && prices[p.id]>0 && prices[p.id]<=100000000)
    .map(p=>({...p,amount:prices[p.id],currency:'IDR'}));
}
