# @repo/payment-engine

The central payment processing abstraction layer for the IDEA IQ ecosystem. This package manages payment provider selection, transaction routing, and unified payment interfaces.

## Features

- **Provider Abstraction**: Unified interface for multiple payment gateways.
- **Dynamic Routing**: Intelligently routes transactions based on amount and configuration.
- **Factory Pattern**: Easy instantiation of payment providers.

## Adapters

- **Wayl**: Default provider for standard transactions.
- **Zain Direct**: High-value transaction provider (> 500,000 IQD).

## Usage

### Basic Usage

```typescript
import { PaymentFactory } from '@repo/payment-engine';

const config = {
  waylKey: process.env.WAYL_SECRET_KEY,
  zainKey: process.env.ZAIN_SECRET_KEY,
  waylBaseUrl: process.env.WAYL_API_URL,
  waylWebhookSecret: process.env.WAYL_WEBHOOK_SECRET,
};

// Automatically selects the best provider based on amount
const provider = PaymentFactory.getProvider(10000, config);

// Use the provider to create a payment link
const link = await provider.createLink({
  amount: 10000,
  currency: 'IQD',
  description: 'Order #123',
  redirectUrl: 'https://example.com/callback',
});
```

### Direct Provider Selection

```typescript
// Force a specific provider
const zainProvider = PaymentFactory.getProviderByName('zain-direct', config);
```
