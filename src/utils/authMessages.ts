import { TFunction } from 'i18next';

const AUTH_ERROR_MESSAGES: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /please enter a valid email/i, key: 'auth.invalid_email' },
  { pattern: /password must be at least|password must be greater than/i, key: 'auth.password_length' },
  { pattern: /invalid credentials/i, key: 'auth.invalid_credentials' },
  { pattern: /account email not verified/i, key: 'auth.email_not_verified' },
  { pattern: /network error|server unavailable/i, key: 'auth.server_unavailable' },
];

export function localizeAuthError(message: unknown, t: TFunction, fallbackKey: string) {
  if (typeof message !== 'string' || !message.trim()) return t(fallbackKey);

  const mapped = AUTH_ERROR_MESSAGES.find(({ pattern }) => pattern.test(message));
  return mapped ? t(mapped.key) : message;
}
