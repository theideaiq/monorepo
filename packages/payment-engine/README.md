# @repo/payment-engine

A unified interface for managing payment providers (Wayl, ZainCash) within the IDEA IQ monorepo. This package abstracts provider-specific logic behind a common `PaymentProvider` interface.

## 🧠 Smart Routing

The `PaymentFactory` implements a smart routing mechanism to optimize transaction costs and reliability based on the transaction amount.

- **Standard Transactions (<= 500,000 IQD)**:
  - **Provider**: `WaylAdapter`
  - **Description**: Uses the Wayl gateway for standard payment processing.

- **High-Value Transactions (> 500,000 IQD)**:
  - **Provider**: `ZainDirectAdapter`
  - **Description**: Routes directly to ZainCash to reduce fees for larger amounts.

## ⚠️ Known Issues

### Broken Implementation: Zain Direct
The `ZainDirectAdapter` (used for transactions > 500,000 IQD) is currently a **stub implementation**.

- **Status**: Not Implemented
- **Behavior**: Throws an error (`ZainDirectAdapter: Not Implemented`) when methods are called.
- **Impact**: Any transaction exceeding 500,000 IQD will fail at runtime.

**Workaround**: Do not process transactions larger than 500,000 IQD until the Zain Direct integration is complete.

## 📦 Usage

```typescript
import { PaymentFactory } from '@repo/payment-engine';

// Configure with API keys
const config = {
  waylKey: process.env.WAYL_KEY!,
  zainKey: process.env.ZAIN_KEY!,
};

// 1. Get a provider based on amount
// Returns WaylAdapter
const provider = PaymentFactory.getProvider(50000, config);

// Returns ZainDirectAdapter (⚠️ Currently throws error on use)
const highValueProvider = PaymentFactory.getProvider(600000, config);

// 2. Create a checkout session
try {
  const session = await provider.createCheckoutSession({
    referenceId: 'order_123',
    amount: 50000,
    currency: 'IQD',
  });
  console.log('Redirect user to:', session.url);
} catch (error) {
  console.error('Payment initialization failed:', error);
}
```
