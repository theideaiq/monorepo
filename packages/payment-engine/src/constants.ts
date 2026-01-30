export const PAYMENT_PROVIDERS = {
  WAYL: 'wayl',
  ZAIN_DIRECT: 'zain-direct',
} as const;

export type PaymentProviderName =
  (typeof PAYMENT_PROVIDERS)[keyof typeof PAYMENT_PROVIDERS];

export const ZAIN_DIRECT_THRESHOLD = 500000;
