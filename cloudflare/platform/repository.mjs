import { PlatformError, profileInput, publisherId } from './validation.mjs';

// Internal module only. Caller MUST obtain actor from a verified server-side
// session. Never expose actor or database bindings as client-controlled inputs.
// No public routes or authentication cutover are installed by this foundation.
async function activeActor(db,actor) {
  if (!actor || typeof actor.userId!=='string') throw new PlatformError('AUTH_REQUIRED',401);
  const row=await db.prepare("SELECT id FROM users WHERE id=? AND status='active' AND email_verified_at IS NOT NULL").bind(actor.userId).first();
  if (!row) throw new PlatformError('AUTH_REQUIRED',401);
  return actor.userId;
}
async function sitePermission(db,actor,siteId,roles) {
  const userId=await activeActor(db,actor);
  const site=await db.prepare(`SELECT s.id,s.account_id,a.owner_user_id,m.role
    FROM sites s JOIN accounts a ON a.id=s.account_id
    LEFT JOIN site_memberships m ON m.site_id=s.id AND m.user_id=?
    WHERE s.id=?`).bind(userId,siteId).first();
  // Uniform absence/error avoids leaking another tenant's site existence.
  if (!site || (site.owner_user_id!==userId && !roles.includes(site.role)))
    throw new PlatformError('NOT_FOUND',404);
  return site;
}
export async function saveProfile(db,actor,input) {
  const userId=await activeActor(db,actor),p=profileInput(input);
  const statements=[db.prepare(`INSERT INTO profiles
    (user_id,display_name,bio,occupation,organization,public_location,website,locale,timezone,is_public)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,bio=excluded.bio,
      occupation=excluded.occupation,organization=excluded.organization,public_location=excluded.public_location,
      website=excluded.website,locale=excluded.locale,timezone=excluded.timezone,is_public=excluded.is_public,
      updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`).bind(
      userId,p.displayName,p.bio,p.occupation,p.organization,p.publicLocation,p.website,p.locale,p.timezone,p.isPublic?1:0),
    db.prepare('DELETE FROM profile_links WHERE user_id=?').bind(userId)];
  for (const [provider,url] of Object.entries(p.socialLinks))
    statements.push(db.prepare('INSERT INTO profile_links(user_id,provider,url) VALUES (?,?,?)').bind(userId,provider,url));
  await db.batch(statements);
  return p;
}
export async function getProfile(db,actor) {
  const userId=await activeActor(db,actor);
  const profile=await db.prepare('SELECT * FROM profiles WHERE user_id=?').bind(userId).first();
  const links=await db.prepare('SELECT provider,url FROM profile_links WHERE user_id=?').bind(userId).all();
  return {profile,socialLinks:Object.fromEntries(links.results.map(r=>[r.provider,r.url]))};
}
export async function listContents(db,actor,siteId,{limit=25,offset=0}={}) {
  const site=await sitePermission(db,actor,siteId,['admin','editor','reader']);
  if (!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>10000)
    throw new PlatformError('INVALID_PAGINATION');
  return (await db.prepare(`SELECT id,kind,slug,title,status,created_at,updated_at FROM contents
    WHERE site_id=? AND account_id=? ORDER BY created_at DESC,id LIMIT ? OFFSET ?`)
    .bind(site.id,site.account_id,limit,offset).all()).results;
}
export async function saveAdsense(db,actor,siteId,input) {
  const site=await sitePermission(db,actor,siteId,['admin']);
  const id=publisherId(input?.publisherId);
  // Verification metadata only: neither Google approval nor Auto Ads is enabled.
  await db.prepare(`INSERT INTO adsense_settings(site_id,publisher_id) VALUES (?,?)
    ON CONFLICT(site_id) DO UPDATE SET publisher_id=excluded.publisher_id,auto_ads=0,review_status='not_submitted'`)
    .bind(site.id,id).run();
  return {publisherId:id,autoAds:false,reviewStatus:'not_submitted'};
}
