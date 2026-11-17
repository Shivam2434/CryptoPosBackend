export function isPlaceholderEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return true;
  const lower = email.trim().toLowerCase();
  if (!lower.includes('@')) return true;
  return (
    lower.endsWith('@clerk.user') ||
    lower.endsWith('@cryptopos.local') ||
    lower === 'merchant@cryptopos.io' ||
    /^user_[a-z0-9]+@/i.test(lower) ||
    /^merchant_/i.test(lower)
  );
}

export function isRealEmail(email?: string | null): boolean {
  if (!email || isPlaceholderEmail(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function pickRealEmail(
  ...candidates: Array<string | null | undefined>
): string | undefined {
  return candidates.find((email) => isRealEmail(email))?.trim();
}
