import { pathToFileURL } from "node:url";
export function validateRelease(body, expected) {
  if (!/^[a-f0-9]{40}$/i.test(expected || "") || body?.deployment_commit !== expected) throw Error("LIVE_COMMIT_MISMATCH");
}
export function validateBilling(body) {
  if (body?.brand !== "Ngeblogging" || body?.provider !== "midtrans" || !Array.isArray(body.plans)) throw Error("MIDTRANS_ROUTE_NOT_LIVE");
  for (const [id, amount] of [["pro_monthly",300000],["pro_yearly",3000000]]) {
    const plan = body.plans.find(p=>p.id===id);
    if (!plan || plan.currency!=="IDR" || plan.amount!==amount) throw Error("LIVE_PRICE_MISMATCH");
  }
}
export function validateProductionReadiness(body) {
  if (body?.environment !== "production") throw Error("MIDTRANS_NOT_PRODUCTION");
  if (body?.ready !== true) throw Error("MIDTRANS_NOT_READY");
}
async function get(url) {
  const response = await fetch(url,{headers:{"cache-control":"no-cache",accept:"application/json"},signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw Error(`HTTP_${response.status}`);
  return response.json();
}
export async function verifyDeployment(expected) {
  const origins=["https://ngeblogging.triapriyogibahari7.workers.dev","https://ngeblogging.com"];
  for (const origin of origins) {
    let last;
    for (let attempt=1;attempt<=12;attempt++) {
      try {
        const query=`commit=${encodeURIComponent(expected)}&attempt=${attempt}`;
        validateRelease(await get(`${origin}/release-v344.json?${query}`),expected);
        const config=await get(`${origin}/api/billing/midtrans/config?${query}`);
        validateBilling(config);
        validateProductionReadiness(config);
        console.log(JSON.stringify({origin,commit:expected,codeVerified:true,merchantConfigured:config.ready===true,environment:config.environment}));
        last=null;break;
      } catch(error) {last=error;if(attempt<12)await new Promise(r=>setTimeout(r,5000));}
    }
    if(last)throw Error(`${origin}: ${last.message}`);
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  verifyDeployment(process.env.GITHUB_SHA).catch(error=>{console.error(error.message);process.exitCode=1;});
}
