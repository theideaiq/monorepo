# Payment Engine

A centralized abstraction for handling payment providers in the IDEA IQ ecosystem. This package provides a unified interface for creating checkout sessions and verifying webhooks, allowing the application to switch between providers (e.g., Wayl, Zain Direct) without changing consumer code.

## Key Features

- **Provider Abstraction**: Common interface (`PaymentProvider`) for all gateways.
- **Smart Routing**: `PaymentFactory` automatically selects the best provider based on transaction amount.
- **Type Safety**: Full TypeScript support for order data and webhook payloads.

## Usage

### Basic Usage

Use the `PaymentFactory` to get a provider instance.

```typescript
import { PaymentFactory } from '@repo/payment-engine';

const amount = 25000; // 25,000 IQD
const config = {
  waylKey: process.env.WAYL_API_KEY,
  zainKey: process.env.ZAIN_API_KEY,
  waylBaseUrl: process.env.WAYL_BASE_URL,
  waylWebhookSecret: process.env.WAYL_WEBHOOK_SECRET,
};

// Automatically selects provider based on amount
const provider = PaymentFactory.getProvider(amount, config);

// Create a session
const session = await provider.createCheckoutSession({
  referenceId: 'order-123',
  amount,
  currency: 'IQD',
  webhookUrl: 'https://api.example.com/webhooks/payment',
});
```

### Specific Provider

You can also request a specific provider by name:

```typescript
const zainProvider = PaymentFactory.getProviderByName('zain-direct', config);
```

## Provider Routing Logic

The `PaymentFactory.getProvider(amount)` method uses the following logic:

- **Amount > 500,000 IQD**: Uses **Zain Direct** (intended for higher value transactions).
- **Otherwise**: Defaults to **Wayl**.

## Supported Providers

| Provider | Key | Status |
| :--- | :--- | :--- |
| **Wayl** | `wayl` | ✅ Production Ready |
| **Zain Direct** | `zain-direct` | ⚠️ **Unimplemented** |

## Known Issues

- **Zain Direct Implementation**: The `ZainDirectAdapter` is currently a stub. Attempting to use it (either explicitly or via the >500k IQD routing rule) will throw a `Not Implemented` error.
