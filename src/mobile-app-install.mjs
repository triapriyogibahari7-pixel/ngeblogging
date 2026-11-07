export function smartphoneInstallContext({navigator:nav={},screen={},matchMedia=()=>({matches:false})}={}){
 const ua=String(nav.userAgent||''),mobile=nav.userAgentData?.mobile===true||/Android.*Mobile|iPhone|iPod|Windows Phone/i.test(ua);
 const sizes=[Number(screen.width),Number(screen.height)];
 const tablet=/iPad|Tablet|Silk|Kindle/i.test(ua)||(/Android/i.test(ua)&&!/Mobile/i.test(ua)&&nav.userAgentData?.mobile!==true);
 let touch=false;try{touch=Number(nav.maxTouchPoints)>0&&(matchMedia('(pointer: coarse)').matches||matchMedia('(any-pointer: coarse)').matches);}catch{}
 return mobile&&!tablet&&touch&&sizes.every(x=>Number.isFinite(x)&&x>0)&&Math.min(...sizes)<=600;
}
export function createInstallAction({installed=false,onGuide=()=>{},onChange=()=>{}}={}){
 let prompt=null,busy=false;
 const notify=()=>onChange({installed,busy});
 return {
  offer(event){if(!installed&&typeof event?.prompt==='function'){event.preventDefault?.();prompt=event;}notify();},
  markInstalled(){installed=true;prompt=null;notify();},
  async click(){
   if(installed){onGuide('Aplikasi sudah terpasang. Buka melalui ikon Ngeblogging di layar utama.');return;}
   if(busy){onGuide('Dialog pemasangan sedang terbuka. Selesaikan atau tutup dialog tersebut terlebih dahulu.');return;}
   const current=prompt;prompt=null;
   if(!current){onGuide('Gunakan menu browser, lalu pilih Pasang aplikasi atau Tambahkan ke layar utama jika tersedia. Jika aplikasi sudah terpasang, buka melalui ikonnya.');return;}
   busy=true;notify();
   try{await current.prompt();await current.userChoice;}
   catch{onGuide('Dialog pemasangan belum tersedia. Gunakan menu browser untuk memasang aplikasi atau menambahkannya ke layar utama.');}
   finally{busy=false;notify();}
  }
 };
}
export function startSmartphoneInstaller(win=window,doc=document){
 const key='__ngebloggingSmartphoneInstaller20261107';
 if(win[key])return win[key];
 if(!smartphoneInstallContext({navigator:win.navigator,screen:win.screen,matchMedia:q=>win.matchMedia(q)}))return null;
 const host=String(win.location.hostname).toLowerCase();
 if(!['ngeblogging.com','www.ngeblogging.com','localhost','127.0.0.1'].includes(host))return null;
 let button=null,frame=0,last={installed:false,busy:false};
 const standalone=()=>{try{return win.matchMedia('(display-mode: standalone)').matches||win.navigator.standalone===true;}catch{return false;}};
 function guide(message){
  let dialog=doc.getElementById('ngeblogging-mobile-install-help');
  if(!dialog){
   dialog=doc.createElement('dialog');dialog.id='ngeblogging-mobile-install-help';dialog.setAttribute('aria-label','Pemasangan aplikasi Ngeblogging');
   Object.assign(dialog.style,{maxWidth:'360px',width:'calc(100% - 32px)',boxSizing:'border-box',border:'1px solid #cbd5e1',borderRadius:'16px',padding:'20px',lineHeight:'1.6'});
   const title=doc.createElement('h2');title.textContent='Dapatkan aplikasi';title.style.fontSize='18px';
   const text=doc.createElement('p');text.dataset.installHelpText='true';
   const close=doc.createElement('button');close.type='button';close.textContent='Tutup';close.style.minHeight='44px';close.addEventListener('click',()=>{if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');});
   dialog.append(title,text,close);doc.body.append(dialog);
  }
  dialog.querySelector('[data-install-help-text]').textContent=message;
  if(!dialog.open){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
 }
 function ensure(){
  if(!doc.body)return;
  const actions=doc.querySelector('.sn-top-actions');
  const homepage=win.location.pathname==='/';
  if(!actions&&!homepage){button?.remove();return;}
  if(!button){
   button=doc.createElement('button');button.type='button';button.dataset.mobileAppInstall='true';
   button.setAttribute('aria-label','Dapatkan aplikasi Ngeblogging');button.setAttribute('title','Dapatkan aplikasi Ngeblogging');
   button.style.setProperty('display','inline-flex','important');button.style.setProperty('visibility','visible','important');button.style.setProperty('pointer-events','auto','important');
   Object.assign(button.style,{alignItems:'center',justifyContent:'center',gap:'6px',minHeight:'44px',maxWidth:'calc(100vw - 32px)',boxSizing:'border-box',padding:'10px 16px',borderRadius:'12px',border:'1px solid #1d4ed8',background:'#1d4ed8',color:'#fff',font:'600 14px/1.4 system-ui, sans-serif',cursor:'pointer'});
   button.addEventListener('click',()=>{void action.click();});
  }
  const label=last.installed?'Aplikasi terpasang':'Dapatkan aplikasi';
  if(button.textContent!==label)button.textContent=label;
  button.setAttribute('aria-busy',String(last.busy));
  const placement=actions?'header':'homepage';
  if(button.dataset.installPlacement!==placement){
   button.dataset.installPlacement=placement;
   button.className=actions?'sn-install-app':'ngeblogging-home-install-app';
   for(const property of ['position','left','bottom','z-index'])button.style.removeProperty(property);
   if(!actions){
    button.style.setProperty('position','fixed');button.style.setProperty('left','max(16px, env(safe-area-inset-left, 0px))');
    button.style.setProperty('bottom','calc(88px + env(safe-area-inset-bottom, 0px))');button.style.setProperty('z-index','1000');
   }
  }
  if(actions){if(button.parentElement!==actions)actions.insertBefore(button,actions.querySelector('.sn-avatar')||null);}
  else if(button.parentElement!==doc.body)doc.body.append(button);
 }
 function schedule(){if(frame)return;frame=win.requestAnimationFrame(()=>{frame=0;ensure();});}
 const action=createInstallAction({installed:standalone(),onGuide:guide,onChange:value=>{last=value;schedule();}});
 last={installed:standalone(),busy:false};
 win.addEventListener('beforeinstallprompt',event=>action.offer(event));
 win.addEventListener('appinstalled',()=>{action.markInstalled();doc.documentElement.dataset.installed='true';});
 win.addEventListener('ngeblogging:request-install-app',()=>{void action.click();});
 win.addEventListener('pageshow',()=>{if(standalone())action.markInstalled();schedule();});
 win.addEventListener('popstate',schedule);win.addEventListener('hashchange',schedule);
 const Observer=win.MutationObserver||MutationObserver;
 const observer=new Observer(schedule);observer.observe(doc.body||doc.documentElement,{childList:true,subtree:true});
 win[key]={action,ensure,observer};ensure();return win[key];
}
