export function embedFrameState({ visible, seen, elapsed, missingFor }) {
  if (visible) return 'visible';
  if (seen && missingFor >= 2000) return 'missing';
  if (!seen && elapsed >= 20000) return 'timeout';
  return 'waiting';
}
