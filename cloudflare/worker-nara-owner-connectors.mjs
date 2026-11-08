import baseWorker from './worker-v70.mjs';
import { naraOwnerConnectorsResponse } from '../server/nara-owner-connectors.mjs';
export default {
  ...baseWorker,
  async fetch(request, env, context) {
    const response = await naraOwnerConnectorsResponse(request, env);
    return response || baseWorker.fetch(request, env, context);
  },
};
