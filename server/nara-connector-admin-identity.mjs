// Only call with the user returned by Supabase's authenticated /auth/v1/user endpoint.
// This is an additional identity restriction, not a replacement for active database authorization.
const ADMIN_ID = '91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3';
const ADMIN_EMAIL = 'triapriyogibahari7@gmail.com';
export function requireConnectorAdminIdentity(user) {
  const confirmed = typeof user?.email_confirmed_at === 'string' && user.email_confirmed_at.length > 0 && Number.isFinite(Date.parse(user.email_confirmed_at));
  if (user?.id !== ADMIN_ID || typeof user.email !== 'string' || user.email.trim().toLowerCase() !== ADMIN_EMAIL || !confirmed || user.is_anonymous === true) {
    throw new Error('CONNECTOR_ADMIN_REQUIRED');
  }
  return user;
}
