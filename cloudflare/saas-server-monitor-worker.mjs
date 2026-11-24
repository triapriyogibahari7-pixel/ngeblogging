import {runMonitorTick} from '../server/domain-server-monitor.mjs';
export default {
 fetch(){return new Response('Not found',{status:404});},
 scheduled(_event,env,ctx){ctx.waitUntil(runMonitorTick(env).then(summary=>console.log(JSON.stringify({event:'saas-monitor-tick',...summary}))).catch(()=>{console.error('saas-monitor-tick-failed');}));}
};
