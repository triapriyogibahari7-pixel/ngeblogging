import {fetchDomainReferenceFx} from '../server/domain-reference-fx.mjs';
if(process.argv.length!==2){console.error(JSON.stringify({code:'NO_ARGUMENTS_ALLOWED',referenceOnly:true,usableForCustomerQuote:false}));process.exitCode=2;}
else{const result=await fetchDomainReferenceFx();console.log(JSON.stringify(result,null,2));if(result.status!=='reference_available')process.exitCode=1;}
