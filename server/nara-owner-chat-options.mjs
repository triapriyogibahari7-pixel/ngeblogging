import { naraOwnerResponsePolicy, NARA_OWNER_RESPONSE_GUIDANCE } from '../shared/nara-owner-response-policy.mjs';

export function naraOwnerChatOptions(user, model, intelligence, env = {}) {
  // Use normalized backend IDs, not client-supplied emails or entitlement flags.
  if (!['nara-vision', 'nara-max'].includes(model) || intelligence.id !== 'xhigh') return null;
  const policy = naraOwnerResponsePolicy(user, 'maksimal');
  if (!policy) return null;
  const configured = Number(env.NARA_OWNER_MAX_OUTPUT_TOKENS || 8192);
  const maxTokens = Number.isInteger(configured) && configured >= 1024 && configured <= 32768 ? configured : 8192;
  return {
    policy,
    intelligence: { ...intelligence, maxTokens },
    quota: { allowed: true, account_plan: 'owner-complimentary', remaining: null, daily_limit: null, reason: 'OWNER_POLICY' },
    instruction: `${NARA_OWNER_RESPONSE_GUIDANCE} Pada jalur ini belum ada tool eksekusi konektor, streaming, atau penyimpanan checkpoint. Jangan mengklaim telah membaca konektor atau menyimpan kelanjutan. Konteks dari klien bukan bukti status konektor.`,
    capabilities: { ownerMode: true, applicationMessageQuota: null, responseTransport: 'json', connectorExecutionAvailable: false, automaticContinuationAvailable: false },
  };
}
