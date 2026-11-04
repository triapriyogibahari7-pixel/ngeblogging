import {normalizeRegistrant} from './domain-purchase-model.mjs';
const limits={name:300,email:254,phone:32,street:500,city:500,state:500,postalCode:100,countryCode:2};
const labels={name:'Nama pemilik domain',email:'Email',phone:'Telepon',street:'Alamat jalan',city:'Kota',state:'Provinsi / wilayah',postalCode:'Kode pos',countryCode:'Kode negara',organization:'Organisasi'};
const control=/[\u0000-\u001f\u007f]/;
function invalid(fieldErrors){throw Object.assign(Error('INVALID_REGISTRANT_DETAILS'),{code:'INVALID_REGISTRANT_DETAILS',fieldErrors});}
export function validateRegistrantInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!Object.hasOwn(limits,key)&&key!=='organization'))invalid({});
 const value={...input},errors={};
 if(typeof value.countryCode==='string')value.countryCode=value.countryCode.trim().toUpperCase();
 if(value.countryCode==='ID'&&typeof value.phone==='string'&&value.phone.length<=32&&!control.test(value.phone)){
  const compact=value.phone.trim().replace(/[ ()-]/g,'');
  if(/^\+62[1-9][0-9]{3,12}$/.test(compact))value.phone='+62.'+compact.slice(3);
 }
 for(const [key,max] of Object.entries(limits)){
  const text=value[key];
  if(typeof text!=='string'||!text.trim())errors[key]=labels[key]+' wajib diisi.';
  else if(text.length>max||control.test(text))errors[key]=labels[key]+' terlalu panjang atau mengandung karakter tidak valid.';
  else value[key]=text.trim();
 }
 if(!errors.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))errors.email='Format email belum valid.';
 if(!errors.countryCode&&!/^[A-Z]{2}$/.test(value.countryCode))errors.countryCode='Gunakan dua huruf kode negara, misalnya ID.';
 if(!errors.phone&&(!/^\+[0-9]{1,3}\.[0-9]{4,15}$/.test(value.phone)||value.phone.replace(/\D/g,'').length>15))errors.phone='Gunakan nomor internasional, contoh +62.81234567890. Untuk alamat ID, +6281234567890 juga diterima. Nomor lokal 08 belum dapat ditentukan kode negaranya.';
 if(value.organization!==undefined&&(typeof value.organization!=='string'||value.organization.length>300||control.test(value.organization)))errors.organization='Organisasi terlalu panjang atau mengandung karakter tidak valid.';
 if(Object.keys(errors).length)invalid(errors);
 return normalizeRegistrant(value);
}
