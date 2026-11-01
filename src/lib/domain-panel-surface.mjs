export const DOMAIN_STUDIO_PREVIEW='https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
export function domainPanelSurface(origin){if(origin===DOMAIN_STUDIO_PREVIEW)return 'preview';if(origin==='https://ngeblogging.com')return 'production';return 'existing';}
