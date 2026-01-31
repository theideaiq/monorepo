# @repo/payment-engine

A unified payment processing abstraction layer for The IDEA IQ. This package handles provider selection, session creation, and webhook verification.

## Supported Providers

| Provider | Key | Status | Description |
| :--- | :--- | :--- | :--- |
| **Wayl** | `wayl` | ✅ Active | Default provider for standard transactions. |
| **ZainCash** | `zain-direct` | 🚧 Stub | Planned for high-value transactions (> 500,000 IQD). **Currently throws "Not Implemented".** |

## Smart Routing (Hybrid Logic)

The `PaymentFactory` automatically selects the best provider based on the transaction amount:

- **Amount <= 500,000 IQD**: Routes to **Wayl**.
- **Amount > 500,000 IQD**: Routes to **ZainCash**.

> ⚠️ **Warning**: Since the ZainCash adapter is currently a stub, attempting to process transactions over 500,000 IQD will result in a runtime error (`ZainDirectAdapter: Not Implemented`).

## Usage

```typescript
import { PaymentFactory } from '@repo/payment-engine';

const config = {
  waylKey: process.env.WAYL_SECRET_KEY,
  zainKey: process.env.ZAIN_SECRET_KEY, // Currently unused
};

// 1. Get the appropriate provider
const provider = PaymentFactory.getProvider(25000, config);

// 2. Create a checkout session
const session = await provider.createCheckoutSession({
  referenceId: 'order_123',
  amount: 25000,
  currency: 'IQD',
  // ...
});
```

## Configuration

The factory requires a `FactoryConfig` object:

```typescript
interface FactoryConfig {
  waylKey: string;
  zainKey: string;
  waylBaseUrl?: string; // Optional override for Wayl API URL
  waylWebhookSecret?: string; // Optional secret for webhook verification
}
```
