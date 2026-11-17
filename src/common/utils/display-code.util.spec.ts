import {
  generatePaymentDisplayCode,
  generateMerchantDisplayCode,
  isUuidLike,
} from './display-code.util';

describe('display-code.util', () => {
  it('generates a readable INV- code without ambiguous characters', () => {
    const code = generatePaymentDisplayCode();
    expect(code).toMatch(/^INV-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(code.slice(4)).not.toMatch(/[01IO]/);
  });

  it('detects UUID strings and ignores invoice codes', () => {
    expect(isUuidLike('a1b2c3d4-e5f6-4111-8111-abcdef123456')).toBe(true);
    expect(isUuidLike('INV-7K2M9C')).toBe(false);
    expect(generateMerchantDisplayCode()).toMatch(/^POS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});
