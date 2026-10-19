import { supabase } from '../lib/supabase';
export { supabase };
export function result({data,error}){if(error)throw error;return data;}
export async function profileData(id){return result(await supabase.from('profiles').select('id,display_name,avatar_url,bio,website,plan,plan_expires_at').eq('id',id).single());}
export async function saveProfile(id,p){const clean={display_name:String(p.display_name||'').trim().slice(0,100),bio:String(p.bio||'').slice(0,500),website:p.website||null,avatar_url:p.avatar_url||null};for(const k of ['website','avatar_url'])if(clean[k]){const u=new URL(clean[k]);if(u.protocol!=='https:'||u.username||u.password)throw Error('URL profil harus HTTPS tanpa kredensial');}return result(await supabase.from('profiles').update(clean).eq('id',id).select('id,display_name,avatar_url,bio,website,plan,plan_expires_at').single());}
export async function socials(id){return result(await supabase.from('nb_profile_socials').select('platform,url').eq('user_id',id));}
export async function saveSocials(values){const links=Object.entries(values).filter(([,v])=>v.trim()).map(([platform,v])=>{const u=new URL(/^https?:\/\//i.test(v)?v:'https://'+v);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('URL sosial tidak valid');return {platform,url:u.href};});return result(await supabase.rpc('nb_save_socials',{links}));}
export async function settings(id){return result(await supabase.from('nb_site_settings').select('config,revision').eq('site_id',id).maybeSingle())||{config:{},revision:0};}
export async function saveSettings(id,config,revision){return result(await supabase.rpc('nb_save_site_settings',{target_site:id,payload:config,expected_revision:revision}));}
