// Custom installation UI is disabled. Keep the runtime entry export compatible.
// Browser-native installation, manifest and service-worker behavior are unchanged.
export function startSmartphoneInstaller(win=window,doc=document){
 doc.querySelectorAll('[data-mobile-app-install="true"], #ngeblogging-mobile-install-help').forEach(element=>element.remove());
 return null;
}
