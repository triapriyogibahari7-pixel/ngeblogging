const SERVICE='ngeblogging-public-auditor';
function stripAuditorServices(services=[]){
 if(!Array.isArray(services))throw Error('AUDIT_BINDING_CONFIG_INVALID');
 for(const value of services){
  if(!value||typeof value!=='object')throw Error('AUDIT_BINDING_CONFIG_INVALID');
  if(value.binding==='PUBLIC_AUDITOR'&&value.service!==SERVICE)throw Error('AUDIT_BINDING_CONFLICT');
 }
 return services.filter(value=>value.binding!=='PUBLIC_AUDITOR'&&value.service!==SERVICE);
}
export function previewAuditorConfig(config){
 if(config?.name!=='ngeblogging')throw Error('AUDIT_APPLICATION_TARGET_MISMATCH');
 const next={...config};
 if(Object.hasOwn(config,'services'))next.services=stripAuditorServices(config.services);
 if(config.previews){
  next.previews={...config.previews};
  if(Object.hasOwn(config.previews,'services'))next.previews.services=stripAuditorServices(config.previews.services);
 }
 return next;
}
// Compatibility entry for existing build callers. No token access, network,
// subprocess, filesystem mutation or Worker creation is performed.
export async function provisionPublicAuditorPreview(){
 return {retired:true,auditorCreated:false,liveBindingsChanged:false,workerDeleted:false};
}
