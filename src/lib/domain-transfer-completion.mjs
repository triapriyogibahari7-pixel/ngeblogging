// Readback owns its error UI. A read failure must not turn a valid receipt into a replay.
export async function moveWithReadback(request,{move,read,isCurrent}) {
  const result=await move(request);
  const matching=result?.status==='moved'&&result.domainId===request.p_domain_id&&result.sourceSiteId===request.p_source_site_id&&result.targetSiteId===request.p_target_site_id&&Number.isInteger(result.redirectsMoved)&&result.redirectsMoved>=0;
  if(matching&&isCurrent()===true){
    try{Promise.resolve(read()).catch(()=>{});}catch{}
  }
  return result;
}
