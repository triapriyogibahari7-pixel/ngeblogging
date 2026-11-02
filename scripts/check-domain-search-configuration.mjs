import {inspectDomainSearchConfiguration} from '../server/domain-search-configuration-preflight.mjs';
// Reads this process environment, not the deployed Worker's bindings.
try{
 const report=inspectDomainSearchConfiguration(process.env,{deploymentEnvironment:process.env.DOMAIN_PREFLIGHT_DEPLOYMENT_ENVIRONMENT});
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 process.exitCode=report.configurationReady?0:1;
}catch{
 process.stdout.write(JSON.stringify({configurationOnly:true,configurationReady:false,blockers:['PREFLIGHT_INPUT_UNAVAILABLE'],networkVerified:false,purchaseAllowed:false})+'\n');
 process.exitCode=1;
}
