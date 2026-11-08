import baseWorker from './worker-v70.mjs';
import { naraFlexibleConnectorsResponse } from '../server/nara-flexible-connectors.mjs';
export default {
  ...baseWorker,
  async fetch(request, env, context) {
    const flexible = await naraFlexibleConnectorsResponse(request, env);
    if (flexible) return flexible;
    const path = new URL(request.url).pathname;
    if (path === '/api/nara/owner-connectors' || path.startsWith('/api/nara/owner-connectors/')) {
      return new Response(JSON.stringify({code:'CONNECTOR_ENDPOINT_RETIRED'}), {status:410,headers:{'content-type':'application/json','cache-control':'no-store'}});
    }
    return baseWorker.fetch(request, env, context);
  },
};
