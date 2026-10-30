const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2]||'src/lib/public-data.js','utf8');
const sites=[
 {id:'A',slug:'burneo-prime',status:'active',is_public:true,custom_domain:'example.com'},
 {id:'B',slug:'situs-lain',status:'active',is_public:true,custom_domain:null},
 {id:'D',slug:'situs-draf',status:'draft',is_public:false,custom_domain:'draft.example.com'},
 {id:'P',slug:'situs-privat',status:'active',is_public:false,custom_domain:null},
];
function resolver(input,options={}){
 const calls=[];
 const rows={sites,site_domains:[{site_id:'A',hostname:'example.com',status:'active'},{site_id:'D',hostname:'draft.example.com',status:'active'}],site_theme_settings:[{site_id:'A',active_theme_id:'original-theme'}]};
 const db={from(table){const q={table,filters:[],columns:'',select(v){this.columns=v;return this;},eq(k,v){this.filters.push(r=>r[k]===v);return this;},in(k,v){this.filters.push(r=>v.includes(r[k]));return this;},not(k,_op,v){this.filters.push(r=>r[k]!==v);return this;},order(){return this;},limit(){return this;},result(single){calls.push({table,columns:this.columns});if(table==='sites'&&this.columns==='id'){if(options.tenantError)return Promise.resolve({data:null,error:Error('tenant unavailable')});if(options.tenantTimeout)return new Promise(()=>{});}if(table==='site_theme_settings'&&options.themeError)return Promise.resolve({data:null,error:Error('theme unavailable')});const found=(rows[table]||[]).filter(r=>this.filters.every(f=>f(r)));return Promise.resolve({data:single?(found[0]||null):found,error:null});},maybeSingle(){return this.result(true);},then(a,b){return this.result(false).then(a,b);}};return q;}};
 const c={supabase:db,supabaseConfigured:true,setTimeout,clearTimeout,console:{warn(){}}};vm.createContext(c);
 vm.runInContext(input.replace(/^import .*;\n/,'').replaceAll('export ','').replace('12_000','15')+'\nglobalThis.resolve=resolvePublishedSite;',c);
 return {run:c.resolve,calls};
}
const cases=[
 ['missing free host cannot fall back to another site',{hostname:'missing.ngeblogging.com',slug:'situs-lain'},null],
 ['draft free host cannot fall back to another site',{hostname:'situs-draf.ngeblogging.com',slug:'situs-lain'},null],
 ['private free host cannot fall back to another site',{hostname:'situs-privat.ngeblogging.com',slug:'situs-lain'},null],
 ['tenant error fails closed',{hostname:'burneo-prime.ngeblogging.com',slug:'situs-lain'},null,{tenantError:true}],
 ['tenant timeout fails closed',{hostname:'burneo-prime.ngeblogging.com',slug:'situs-lain'},null,{tenantTimeout:true}],
 ['active free host wins over content path',{hostname:'burneo-prime.ngeblogging.com',slug:'situs-lain'},'A'],
 ['active free home resolves',{hostname:'burneo-prime.ngeblogging.com'},'A'],
 ['www free host preserves tenant',{hostname:'www.burneo-prime.ngeblogging.com',slug:'post'},'A'],
 ['hostname normalization preserved',{hostname:' HTTPS://BURNEO-PRIME.NGEBLOGGING.COM:443/ ',slug:'post'},'A'],
 ['bare platform keeps slug lookup',{hostname:'ngeblogging.com',slug:'situs-lain'},'B'],
 ['legacy empty hostname keeps explicit slug lookup',{slug:'situs-lain'},'B'],
 ['active custom domain keeps mapping',{hostname:'example.com',slug:'situs-lain'},'A'],
 ['unknown custom domain cannot fall back to slug',{hostname:'unknown.example.com',slug:'situs-lain'},null],
 ['custom domain of draft site remains unavailable',{hostname:'draft.example.com',slug:'situs-lain'},null],
 ['theme failure does not change selected tenant',{hostname:'burneo-prime.ngeblogging.com',slug:'situs-lain'},'A',{themeError:true}],
];
(async()=>{
 const results=[];
 for(const [name,target,expected,options]of cases){const r=resolver(source,options);const site=await r.run(target);assert.equal(site?.id||null,expected,name);if(expected===null&&target.hostname.endsWith('.ngeblogging.com'))assert.equal(r.calls.some(q=>q.table==='sites'&&q.columns.includes('id,name,slug')),false,name+' must stop before path fallback');results.push({name,status:'PASS'});}
 const report={scope:'Actual public-data module evaluated with mocked Supabase queries; timeout shortened to 15ms. Not live HTTP, DNS, RLS or React rendering.',passed:results.length,tests:results};
 if(process.argv[3]){const before=fs.readFileSync(process.argv[3],'utf8');report.regressionEvidence=[];for(const i of [0,1,2,3,4]){const [name,target,expected,options]=cases[i];const old=await resolver(before,options).run(target);assert.equal(old?.id,'B',name+' baseline reproduction');report.regressionEvidence.push({name,before:old.id,after:expected});}}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
