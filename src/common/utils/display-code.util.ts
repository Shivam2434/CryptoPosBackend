import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCodeBody(length = 6): string {
  const bytes = randomBytes(length);
  let body = '';
  for (let i = 0; i < length; i++) {
    body += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return body;
}

export function generatePaymentDisplayCode(length = 6): string {
  return `INV-${randomCodeBody(length)}`;
}

export function generateMerchantDisplayCode(length = 6): string {
  return `POS-${randomCodeBody(length)}`;
}

export function isUuidLike(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}
