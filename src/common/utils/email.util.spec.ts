import { isPlaceholderEmail, isRealEmail, pickRealEmail } from './email.util';

describe('email.util', () => {
  it('treats Clerk synthetic emails as placeholders', () => {
    expect(isPlaceholderEmail('user_2abc@clerk.user')).toBe(true);
    expect(isPlaceholderEmail('merchant@cryptopos.io')).toBe(true);
    expect(isPlaceholderEmail('pending.abc123@cryptopos.local')).toBe(true);
    expect(isRealEmail('user_2abc@clerk.user')).toBe(false);
  });

  it('accepts the customer signup email', () => {
    expect(isRealEmail('nikcafe@yopmail.com')).toBe(true);
    expect(
      pickRealEmail('user_abc@clerk.user', undefined, 'nikcafe@yopmail.com'),
    ).toBe('nikcafe@yopmail.com');
  });
});
