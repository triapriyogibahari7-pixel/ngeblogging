export class PlatformError extends Error {
  constructor(code, status=400) { super(code); this.code=code; this.status=status; }
}
const providers=new Set(['website','instagram','facebook','x','tiktok','youtube','linkedin','github','threads','mastodon']);
export function httpsUrl(value) {
  if (typeof value!=='string' || value.length>2048) throw new PlatformError('INVALID_URL');
  if (!value.trim()) return '';
  let url;
  try { url=new URL(value.trim()); } catch { throw new PlatformError('INVALID_URL'); }
  if (url.protocol!=='https:' || url.username || url.password) throw new PlatformError('HTTPS_URL_REQUIRED');
  return url.href;
}
function text(value, max) {
  if (typeof value!=='string' || value.length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))
    throw new PlatformError('INVALID_PROFILE_FIELD');
  return value.trim();
}
export function profileInput(input) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new PlatformError('INVALID_PROFILE');
  const fields=['displayName','bio','occupation','organization','publicLocation','website','locale','timezone','isPublic','socialLinks'];
  if (Object.keys(input).some(k=>!fields.includes(k))) throw new PlatformError('UNKNOWN_PROFILE_FIELD');
  const locale=input.locale??'id-ID';
  if (!['id-ID','en-US'].includes(locale)) throw new PlatformError('INVALID_LOCALE');
  const timezone=input.timezone??'Asia/Jakarta';
  try { new Intl.DateTimeFormat('en-US',{timeZone:timezone}); } catch { throw new PlatformError('INVALID_TIMEZONE'); }
  const links=input.socialLinks??{};
  if (!links || typeof links!=='object' || Array.isArray(links)) throw new PlatformError('INVALID_SOCIAL_LINKS');
  const socialLinks={};
  for (const [provider,url] of Object.entries(links)) {
    if (!providers.has(provider)) throw new PlatformError('INVALID_SOCIAL_PROVIDER');
    const safe=httpsUrl(url);
    if (safe) socialLinks[provider]=safe;
  }
  if (input.isPublic!==undefined && typeof input.isPublic!=='boolean') throw new PlatformError('INVALID_VISIBILITY');
  return {
    displayName:text(input.displayName??'',120),bio:text(input.bio??'',2000),
    occupation:text(input.occupation??'',120),organization:text(input.organization??'',160),
    publicLocation:text(input.publicLocation??'',160),website:httpsUrl(input.website??''),
    locale,timezone,isPublic:input.isPublic===true,socialLinks,
  };
}
export function publisherId(input) {
  if (typeof input!=='string' || !/^ca-pub-\d{16}$/.test(input)) throw new PlatformError('INVALID_ADSENSE_ID');
  return input;
}
export function adsTxt(input) { return `google.com, ${publisherId(input).slice(3)}, DIRECT, f08c47fec0942fa0\n`; }
