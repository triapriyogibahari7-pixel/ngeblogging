import {createIsolatedTransferRuntime} from '../server/domain-transfer-isolated-runtime.mjs';

// Separate entry point. Not referenced by the existing production Wrangler configs.
export default {
  async fetch(request,env={}){
    try{
      return await createIsolatedTransferRuntime({
        enabled:env.STAGE5_TRANSFER_ENABLED==='true',
        environment:env.STAGE5_ENVIRONMENT,
        allowedOrigin:env.STAGE5_ALLOWED_ORIGIN,
        databaseUrl:env.STAGE5_TEST_SUPABASE_URL,
        publishableKey:env.STAGE5_TEST_PUBLISHABLE_KEY,
        approvedDatabaseOrigin:env.STAGE5_APPROVED_DATABASE_ORIGIN,
      })(request);
    }catch{
      return new Response(JSON.stringify({code:'STAGE5_CONFIGURATION_INVALID'}),{status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
    }
  }
};
