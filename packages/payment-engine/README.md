# @repo/payment-engine

A unified payment processing abstraction layer that intelligently routes transactions between available providers.

## 🎯 Purpose

This package provides a standardized interface for processing payments, decoupling the application logic from specific payment providers. It implements a **Hybrid Routing Strategy** to optimize for transaction costs and provider capabilities.

## 🧠 Smart Routing Logic

The `PaymentFactory` automatically selects the best provider based on the transaction amount:

| Condition | Provider | Reason |
| :--- | :--- | :--- |
| **Amount > 500,000 IQD** | **Zain Direct** | Optimized for high-value transactions. |
| **Amount <= 500,000 IQD** | **Wayl** | Default provider for standard transactions. |

### Why?
This logic is hardcoded to ensure compliance with provider limits and to optimize fee structures for different transaction tiers.

## 🔌 Adapters

- **WaylAdapter**: Connects to the [Wayl](../wayl) payment service.
- **ZainDirectAdapter**: Direct integration with Zain Cash (for high-value transactions).

## 💻 Usage

Use the `PaymentFactory` to instantiate the correct provider. You do not need to manually select the adapter.

```typescript
import { PaymentFactory } from '@repo/payment-engine';

const amount = 750000; // 750k IQD
const config = {
  waylKey: process.env.WAYL_SECRET_KEY,
  zainKey: process.env.ZAIN_SECRET_KEY,
  // ... other config
};

// Automatically returns ZainDirectAdapter because amount > 500k
const provider = PaymentFactory.getProvider(amount, config);

const session = await provider.createCheckoutSession({
  referenceId: 'order_123',
  amount,
  currency: 'IQD',
  // ...
});
```
