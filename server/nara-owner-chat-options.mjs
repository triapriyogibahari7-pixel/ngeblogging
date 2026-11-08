import { naraOwnerResponsePolicy } from '../shared/nara-owner-response-policy.mjs';

export function naraOwnerChatOptions(user, model, intelligence, env = {}) {
  if (!['nara-vision', 'nara-max'].includes(model) || intelligence?.id !== 'xhigh') return null;
  const policy = naraOwnerResponsePolicy(user, 'maksimal');
  if (!policy) return null;
  const configured = Number(env.NARA_OWNER_MAX_OUTPUT_TOKENS || 8192);
  const maxTokens = Number.isInteger(configured) && configured >= 1024 && configured <= 32768 ? configured : 8192;
  return {
    policy,
    intelligence: { ...intelligence, maxTokens },
    quota: { allowed: true, account_plan: 'owner-complimentary', remaining: null, daily_limit: null, reason: 'OWNER_POLICY' },
  };
}
