const LAND_URL='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';
export function globePoint(lon,lat,rotation=0,tilt=0){
 const a=(lon+rotation)*Math.PI/180,b=lat*Math.PI/180,t=tilt*Math.PI/180;
 const x=Math.cos(b)*Math.sin(a),y=Math.sin(b),z=Math.cos(b)*Math.cos(a);
 return [x,y*Math.cos(t)-z*Math.sin(t),y*Math.sin(t)+z*Math.cos(t)];
}
export function mountAnalyticsGlobe(host){
 const doc=host.ownerDocument,win=doc.defaultView;
 const canvas=doc.createElement('canvas'),controls=doc.createElement('div'),status=doc.createElement('p'),credit=doc.createElement('a');
 const ctx=canvas.getContext('2d');
 if(!ctx){host.textContent='Globe tidak dapat ditampilkan pada browser ini. Gunakan peta OpenStreetMap.';return ()=>{};}
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Globe dasar dunia 3D. Geser untuk memutar, gunakan tombol untuk zoom. Bukan heatmap pengunjung.');
 Object.assign(canvas.style,{display:'block',width:'100%',height:'320px',background:'#071525',borderRadius:'14px',touchAction:'none'});
 Object.assign(controls.style,{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'10px'});
 status.setAttribute('role','status');status.textContent='Memuat garis pantai globe…';
 credit.href='https://www.naturalearthdata.com/';credit.target='_blank';credit.rel='noopener noreferrer';credit.textContent='Peta dasar: Natural Earth · bukan heatmap pengunjung';
 host.replaceChildren(canvas,controls,status,credit);
 let rotation=-115,tilt=0,zoom=1,rings=[],frame=0,last=0,disposed=false,drag=null,inView=true;
 const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');let spinning=!reduced.matches;
 const abort=new win.AbortController();
 function button(label,handler){const node=doc.createElement('button');node.type='button';node.textContent=label;node.style.minHeight='44px';node.addEventListener('click',handler);controls.append(node);return node;}
 const plus=button('+',()=>{zoom=Math.min(2.5,zoom+0.2);draw();});plus.setAttribute('aria-label','Perbesar globe');
 const minus=button('−',()=>{zoom=Math.max(0.6,zoom-0.2);draw();});minus.setAttribute('aria-label','Perkecil globe');
 const pause=button(spinning?'Jeda putaran':'Lanjutkan putaran',()=>{spinning=!spinning;updatePause();});
 function updatePause(){pause.textContent=spinning?'Jeda putaran':'Lanjutkan putaran';pause.setAttribute('aria-pressed',String(spinning));}
 button('Atur ulang',()=>{rotation=-115;tilt=0;zoom=1;draw();});updatePause();
 function draw(){
  if(disposed)return;const width=Math.max(1,canvas.clientWidth||host.clientWidth||320),height=320,dpr=Math.min(2,win.devicePixelRatio||1);
  if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  const cx=width/2,cy=height/2,r=Math.min(width,height)*0.43*zoom;
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
  const light=ctx.createRadialGradient(cx-r*0.35,cy-r*0.4,r*0.05,cx,cy,r);light.addColorStop(0,'#2386b9');light.addColorStop(0.65,'#12496c');light.addColorStop(1,'#061728');ctx.fillStyle=light;ctx.fillRect(0,0,width,height);
  function line(points,color){ctx.beginPath();let open=false;for(const [lon,lat] of points){const [x,y,z]=globePoint(lon,lat,rotation,tilt);if(z<0){open=false;continue;}if(open)ctx.lineTo(cx+r*x,cy-r*y);else ctx.moveTo(cx+r*x,cy-r*y);open=true;}ctx.strokeStyle=color;ctx.lineWidth=0.8;ctx.stroke();}
  for(let lat=-60;lat<=60;lat+=30)line(Array.from({length:181},(_,i)=>[-180+i*2,lat]),'#ffffff28');
  for(let lon=-180;lon<180;lon+=30)line(Array.from({length:91},(_,i)=>[lon,-90+i*2]),'#ffffff28');
  rings.forEach(ring=>line(ring,'#b9f4ce'));ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='#66c7e7';ctx.lineWidth=1.5;ctx.stroke();plus.disabled=zoom>=2.5;minus.disabled=zoom<=0.6;
 }
 function tick(now){frame=0;if(disposed)return;if(!host.isConnected){cleanup();return;}if(now-last>=33){if(spinning&&!drag&&!doc.hidden&&inView)rotation=(rotation+Math.min(100,now-last)*0.008)%360;last=now;if(!doc.hidden&&inView)draw();}frame=win.requestAnimationFrame(tick);}
 function down(event){if(event.button!==0||drag)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);}
 function move(event){if(!drag||drag.id!==event.pointerId)return;rotation+=(event.clientX-drag.x)*0.4;tilt=Math.max(-75,Math.min(75,tilt-(event.clientY-drag.y)*0.3));drag.x=event.clientX;drag.y=event.clientY;draw();}
 function up(event){if(drag?.id===event.pointerId)drag=null;}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);
 function motion(){if(reduced.matches){spinning=false;updatePause();}}reduced.addEventListener?.('change',motion);
 const resize=win.ResizeObserver?new win.ResizeObserver(draw):null;resize?.observe(host);
 const visibility=win.IntersectionObserver?new win.IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting);}):null;visibility?.observe(host);
 function cleanup(){if(disposed)return;disposed=true;abort.abort();win.clearTimeout(timeout);if(frame)win.cancelAnimationFrame(frame);resize?.disconnect();visibility?.disconnect();reduced.removeEventListener?.('change',motion);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);['pointerup','pointercancel','lostpointercapture'].forEach(name=>canvas.removeEventListener(name,up));}
 const timeout=win.setTimeout(()=>abort.abort(),15000);
 win.fetch(LAND_URL,{signal:abort.signal,credentials:'omit',referrerPolicy:'no-referrer'}).then(response=>{if(!response.ok)throw new Error('map');return response.json();}).then(data=>{
  if(disposed)return;if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('map');
  const result=[];let count=0;for(const feature of data.features){const geometry=feature?.geometry;const polygons=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];for(const polygon of polygons||[])for(const ring of polygon||[]){if(!Array.isArray(ring))continue;const valid=ring.filter(point=>Array.isArray(point)&&Number.isFinite(point[0])&&Number.isFinite(point[1])&&Math.abs(point[0])<=180&&Math.abs(point[1])<=90);count+=valid.length;if(count>100000)throw new Error('map');if(valid.length>1)result.push(valid);}}
  if(!result.length)throw new Error('map');rings=result;status.textContent='Geser globe untuk memutar. Gunakan +/− untuk zoom. Data pengunjung tetap ada di grafik dan tabel.';draw();
 }).catch(()=>{if(!disposed)status.textContent='Garis pantai belum dapat dimuat. Globe dasar tetap dapat diputar; gunakan peta OpenStreetMap sebagai alternatif.';}).finally(()=>win.clearTimeout(timeout));
 draw();frame=win.requestAnimationFrame(tick);return cleanup;
}
