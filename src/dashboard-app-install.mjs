export function desktopInstallEligible(win){
 const nav=win.navigator;
 const host=String(win.location.hostname).toLowerCase();
 if(!['ngeblogging.com','www.ngeblogging.com'].includes(host))return false;
 const matches=query=>win.matchMedia(query).matches;
 if(matches('(display-mode: standalone)')||matches('(display-mode: fullscreen)')||matches('(display-mode: minimal-ui)')||nav.standalone===true)return false;
 if(nav.userAgentData?.mobile===true||/Android|iPhone|iPad|iPod|Mobile|Tablet|Linux arm/i.test(`${nav.userAgent||''} ${nav.platform||''} ${nav.userAgentData?.platform||''}`))return false;
 if(Number(nav.maxTouchPoints||0)>0||matches('(any-pointer: coarse)'))return false;
 return matches('(pointer: fine)')&&matches('(hover: hover)')&&Number(win.innerWidth)>1180&&Math.min(Number(win.screen.width),Number(win.screen.height))>600;
}
export function startDashboardInstaller(win=window,doc=document){
 let button=null,prompt=null,busy=false,installed=false,disposed=false,frame=0;
 const eligible=()=>!disposed&&!installed&&desktopInstallEligible(win);
 const guide=()=>win.alert('Jika tersedia, gunakan menu browser untuk memasang Ngeblogging. Tombol ini tidak mengunduh APK.');
 async function click(){
  if(!eligible()||!doc.querySelector('.sn-top-actions')||busy)return;
  const current=prompt;prompt=null;
  if(!current){guide();return;}
  busy=true;button?.setAttribute('aria-busy','true');
  try{await current.prompt();await current.userChoice;}
  catch{if(eligible())guide();}
  finally{busy=false;schedule();}
 }
 function ensure(){
  frame=0;if(disposed)return;
  const actions=doc.querySelector('.sn-top-actions');
  if(!eligible()||!actions){button?.remove();return;}
  if(!button){
   button=doc.createElement('button');button.type='button';button.className='sn-dashboard-install-app';button.dataset.dashboardAppInstall='true';
   button.textContent='Dapatkan aplikasi';button.setAttribute('aria-label','Dapatkan aplikasi Ngeblogging');
   button.style.setProperty('display','inline-flex','important');
   Object.assign(button.style,{alignItems:'center',minHeight:'44px',padding:'8px 12px',borderRadius:'10px',border:'1px solid #1d4ed8',background:'#1d4ed8',color:'#fff',font:'600 14px/1.4 system-ui, sans-serif',cursor:'pointer'});
   button.addEventListener('click',click);
  }
  button.setAttribute('aria-busy',String(busy));
  if(button.parentElement!==actions)actions.insertBefore(button,actions.querySelector('.sn-avatar')||null);
 }
 function schedule(){if(disposed||frame)return;frame=win.requestAnimationFrame(ensure);}
 function offer(event){if(!eligible()||!doc.querySelector('.sn-top-actions')||typeof event.prompt!=='function')return;event.preventDefault();prompt=event;schedule();}
 function didInstall(){installed=true;prompt=null;button?.remove();}
 const events=[['beforeinstallprompt',offer],['appinstalled',didInstall],['resize',schedule],['pageshow',schedule],['ngeblogging:studio-device-mode-change',schedule]];
 events.forEach(([name,handler])=>win.addEventListener(name,handler));
 const media=['(display-mode: standalone)','(display-mode: fullscreen)','(display-mode: minimal-ui)','(pointer: fine)','(hover: hover)','(any-pointer: coarse)'].map(query=>win.matchMedia(query));
 media.forEach(item=>item.addEventListener?.('change',schedule));
 const observer=new win.MutationObserver(schedule);
 observer.observe(doc.getElementById('root')||doc.documentElement,{childList:true,subtree:true});
 ensure();
 return ()=>{disposed=true;prompt=null;if(frame)win.cancelAnimationFrame(frame);observer.disconnect();events.forEach(([name,handler])=>win.removeEventListener(name,handler));media.forEach(item=>item.removeEventListener?.('change',schedule));button?.removeEventListener('click',click);button?.remove();};
}
