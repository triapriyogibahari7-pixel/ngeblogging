const OWNER_EMAIL = 'triapriyogibahari7@gmail.com';
const OWNER_CONNECTORS = Object.freeze(['cloudflare', 'github']);

// Server callers MUST supply the user returned by verified authentication,
// never a request body, localStorage, or an unverified decoded JWT.
// This policy does not grant platform admin privileges.
export function isNaraOwner(verifiedUser) {
  return Boolean(
    verifiedUser?.id &&
    verifiedUser.email_confirmed_at &&
    typeof verifiedUser.email === 'string' &&
    verifiedUser.email.trim().toLowerCase() === OWNER_EMAIL
  );
}

export function naraOwnerAccess(verifiedUser) {
  const owner = isNaraOwner(verifiedUser);
  return {
    complimentary: owner,
    hideUpgrade: owner,
    ...(owner ? { expiresAt: null } : {}),
    connectors: owner ? [...OWNER_CONNECTORS] : [],
  };
}

export function assertNaraOwnerConnector(verifiedUser, provider) {
  if (!isNaraOwner(verifiedUser) || !OWNER_CONNECTORS.includes(provider)) {
    throw Object.assign(new Error('Connector tidak tersedia untuk akun ini.'), { status: 403 });
  }
}
