import { BUILT_IN_THEMES as ORIGINAL_THEMES, themeCodeFor as originalThemeCodeFor } from './theme-catalog.js';
import { PREMIUM_SIGNATURE_THEMES as B01 } from './premium-signature-themes-v2.mjs';
import { PREMIUM_SIGNATURE_THEMES_006_010 as B02 } from './premium-signature-themes-006-010.mjs';
import { PREMIUM_SIGNATURE_THEMES_011_015 as B03 } from './premium-signature-themes-011-015.mjs';
import { PREMIUM_SIGNATURE_THEMES_016_020 as B04 } from './premium-signature-themes-016-020.mjs';
import { PREMIUM_SIGNATURE_THEMES_021_025 as B05 } from './premium-signature-themes-021-025.mjs';
import { PREMIUM_SIGNATURE_THEMES_026_030 as B06 } from './premium-signature-themes-026-030.mjs';
import { PREMIUM_SIGNATURE_THEMES_031_035 as B07 } from './premium-signature-themes-031-035.mjs';
import { PREMIUM_SIGNATURE_THEMES_036_040 as B08 } from './premium-signature-themes-036-040.mjs';
import { PREMIUM_BRIGHT_GENERATED as B09 } from './premium-bright-themes-upgraded-056.mjs';
import { PREMIUM_BRIGHT_FLAGSHIP_133_138 as B10 } from './premium-bright-flagship-133-138.mjs';
import { PREMIUM_BRIGHT_FLAGSHIP_139_144 as B11 } from './premium-bright-flagship-139-144.mjs';
import { PREMIUM_BRIGHT_FLAGSHIP_145_150 as B12 } from './premium-bright-flagship-145-150.mjs';
import { PREMIUM_ULTRA_151_153 as B13 } from './premium-ultra-themes-151-153.mjs';
import { PREMIUM_ULTRA_154_156 as B14 } from './premium-ultra-themes-154-156.mjs';

// Premium is a design collection, not a billing tier. Existing site quotas are unchanged.
export const PREMIUM_FREE_ACCESS = Object.freeze({ amountIdr:0,currency:'IDR',requiresPayment:false,requiresCheckout:false,requiresPaidEntitlement:false,lifetime:true,redistributionAllowed:false,resaleAllowed:false });
const freePricing = Object.freeze({
  personal:Object.freeze({amountIdr:0,siteLimit:1,lifetime:true,scope:'one-theme',requiresPayment:false}),
  multisite:Object.freeze({amountIdr:0,siteLimit:50,lifetime:true,scope:'one-theme-one-account',requiresPayment:false})
});
const blueprints = Object.freeze(['blog','website','news','community','forum','landing','profile','diary','portfolio','knowledge']);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const candidates = [...B01,...B02,...B03,...B04,...B05,...B06,...B07,...B08,...B09,...B10,...B11,...B12,...B13,...B14];
const candidateIds = new Set(candidates.map(theme => theme.id));
const feed = `<section class="psig-feed" id="posts" aria-label="Tulisan situs"><header><small>POSTS</small><h2>Tulisan terbaru</h2></header><div class="ng-cards">${Array.from({length:12},(_,i)=>`<article><small>CONTOH POST ${i+1}</small><h3>Ruang untuk tulisan Anda</h3><p>Konten contoh pratinjau. Situs publik mengisinya dari post yang telah diterbitkan.</p><a href="#">Baca tulisan</a></article>`).join('')}</div></section>`;
const bridgeCss = `.psig-feed{padding:45px 0;clear:both;width:100%;min-width:0}.psig-feed>header{display:block;border-top:1px solid currentColor;padding-top:25px}.psig-feed h2{font-size:clamp(25px,3.5vw,40px);line-height:1.2;letter-spacing:-.03em;margin:20px 0 30px}.psig-feed .ng-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:25px}.psig-feed .ng-cards article{padding:24px;border:1px solid currentColor;min-width:0}.psig-feed .ng-cards article[hidden]{display:none!important}.psig-feed h3{font-size:24px;line-height:1.25;margin:20px 0 15px}.psig-feed p{font-size:13px}.psig-feed a{font:11px/1.8 Arial,sans-serif}.psig-feed small{font:8px/1.8 Arial,sans-serif}.psig-theme h1,.psig-theme h2,.psig-theme h3,.psig-theme p,.psig-theme a,.psig-theme dd,.psig-theme dt{overflow-wrap:anywhere}.psig-profile-brand{font:10px/1.8 Arial,sans-serif;letter-spacing:.1em;display:block;margin-bottom:20px}@media(max-width:900px){.psig-feed .ng-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:580px){.psig-feed{padding-block:30px}.psig-feed .ng-cards{grid-template-columns:1fr;gap:18px}.psig-feed .ng-cards article{padding:20px}}`;
function appendClass(attributes, token) {
  return /class="[^"]*"/.test(attributes) ? attributes.replace(/class="([^"]*)"/,(_,value)=>`class="${value} ${token}"`) : `${attributes} class="${token}"`;
}
function releaseCode(source) {
  let html = source.code.html;
  if (!/<main\b/i.test(html) || !/<h1\b/i.test(html) || /id="posts"/i.test(html)) throw new Error(`Unsupported signature structure: ${source.id}`);
  if (source.id === 'signature-023-simpul-docs') {
    html = html.replace('<header class="docs-nav">','<header class="docs-nav ng-header">').replace('<a href="#content">','<a class="ng-brand" href="#content">');
    html = html.replace('</header>','<nav aria-label="Navigasi situs"><a href="#posts">Tulisan</a></nav></header>');
    html = html.replace(/<h1>([\s\S]*?)<\/h1><p class="docs-lead">([\s\S]*?)<\/p>/,'<section class="ng-hero docs-site-intro"><h1>$1</h1><p class="docs-lead">$2</p></section>');
  } else if (source.id === 'signature-010-nama-card') {
    html = html.replace('<section class="creator-card">',`<section class="creator-card ng-header"><a class="ng-brand psig-profile-brand" href="#content">${escapeHtml(source.name)}</a>`);
  } else {
    html = html.replace(/<header\b([^>]*)>([\s\S]*?)<\/header>/i,(_,attributes,inside)=>`<header${appendClass(attributes,'ng-header')}>${inside.replace(/<a\b([^>]*)>/i,(_a,attrs)=>`<a${appendClass(attrs,'ng-brand')}>`)}</header>`);
  }
  if (source.id !== 'signature-023-simpul-docs') html = html.replace(/<section\b([^>]*)>/i,(_,attrs)=>`<section${appendClass(attrs,'ng-hero')}>`);
  html = html.replace(/<\/main>/i,`${feed}</main>`);
  return Object.freeze({html:`<div class="ng-theme psig-theme" data-theme="${source.id}">${html}</div>`,css:source.code.css+bridgeCss,javascript:source.code.javascript||''});
}
export const PREMIUM_FREE_THEMES = Object.freeze(candidates.map(source => {
  if (source.imageSources?.length || /(?:https?:)?\/\/|@import\b|url\s*\(/i.test(source.code.css) || /<(?:img|iframe|script|video|audio)\b|https?:\/\//i.test(source.code.html)) throw new Error(`External asset review required: ${source.id}`);
  const body = source.code.css.match(/body\s*\{[^}]*background:\s*(#[0-9a-f]{6})\s*;[^}]*color:\s*(#[0-9a-f]{6})/i);
  const paper=body?.[1]||'#f4f0e8',ink=body?.[2]||'#354439';
  return Object.freeze({...source,category:'Premium • Gratis',topic:source.category,description:`${source.category}. Desain Premium gratis tanpa pembayaran tema. Konten contoh dapat disesuaikan.`,layout:source.composition,blueprints,features:Object.freeze(['Premium • Gratis','Tanpa checkout tema','Konten situs']),colors:Object.freeze({primary:ink,accent:'#b9a377',surface:paper,ink}),font:/font-family:Georgia/.test(source.code.css)?'Georgia':'Arial',radius:0,defaultWidgetIds:Object.freeze([]),premium:true,free:true,priceIdr:0,access:PREMIUM_FREE_ACCESS,pricing:freePricing,licenseRequired:false,previewOnly:false,integrationStatus:'release-candidate',imageReadiness:'no-external-assets',code:releaseCode(source)});
}));
export const BUILT_IN_THEMES = Object.freeze([...ORIGINAL_THEMES,...PREMIUM_FREE_THEMES]);
export const THEME_COUNT = BUILT_IN_THEMES.length;
export const PREMIUM_FREE_COUNT = PREMIUM_FREE_THEMES.length;
export const PREMIUM_HELD_RANGE = Object.freeze({first:41,last:50,reason:'external-image-rights-and-delivery-unverified'});
if (PREMIUM_FREE_COUNT < 146 || candidateIds.size !== candidates.length || new Set(BUILT_IN_THEMES.map(t=>t.id)).size !== THEME_COUNT) throw new Error('Invalid free premium catalog');
export function themeCodeFor(theme) { return candidateIds.has(theme?.id) ? PREMIUM_FREE_THEMES.find(item=>item.id===theme.id).code : originalThemeCodeFor(theme); }
