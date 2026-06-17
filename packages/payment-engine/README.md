# Payment Engine

A robust abstraction layer for payment processing, designed to unify multiple payment gateways under a single interface.
This package handles provider selection, checkout session creation, and webhook verification.

## 🌟 Features

- **Provider Agnostic**: Switch between payment providers without changing application code.
- **Smart Routing**: Automatically selects the best provider based on transaction amount.
- **Type-Safe**: Fully typed interfaces for orders, sessions, and webhooks.
- **Factory Pattern**: Centralized logic for instantiating providers.

## 📦 Installation

```bash
pnpm add @repo/payment-engine
```

## 🚀 Usage

### 1. Initialize the Factory

Use the `PaymentFactory` to get the appropriate provider.

```ts
import { PaymentFactory } from '@repo/payment-engine';

const provider = PaymentFactory.getProvider(50000, {
  waylKey: process.env.WAYL_API_KEY,
  zainKey: process.env.ZAIN_API_KEY, // Optional if not using Zain
  waylBaseUrl: process.env.WAYL_BASE_URL,
  waylWebhookSecret: process.env.WAYL_WEBHOOK_SECRET,
});

// Returns a WaylAdapter or ZainDirectAdapter instance
```

### 2. Create a Checkout Session

```ts
const session = await provider.createCheckoutSession({
  referenceId: 'order_123',
  amount: 50000,
  currency: 'IQD',
  description: 'Premium Plan',
  webhookUrl: 'https://api.myapp.com/webhooks/payment',
  redirectionUrl: 'https://myapp.com/success',
  customer: {
    name: 'John Doe',
    phone: '+9647500000000',
    email: 'user@example.com',
  },
});

console.log(session.url); // Redirect user here
```

### 3. Handle Webhooks

```ts
// In your webhook handler (e.g., Next.js API route)
const event = await provider.verifyWebhook(request.body, signature);

if (event.type === 'payment.success') {
  console.log(`Order ${event.referenceId} paid!`);
}
```

## 🧠 Smart Routing Logic

The `PaymentFactory` implements specific business rules for provider selection:

- **Amount > 500,000 IQD**: Routes to **Zain Cash (Direct)**.
- **Amount <= 500,000 IQD**: Routes to **Wayl**.

*Note: You can force a specific provider using `PaymentFactory.getProviderByName('wayl', config)`.*

## 🔌 Adapters

| Provider | Status | Description |
| :--- | :--- | :--- |
| **Wayl** | ✅ Ready | Default provider. Supports redirects and webhooks. |
| **Zain Cash** | 🚧 Pending | Stub implementation. Currently throws `Not Implemented`. |

## 🛠 Extending

To add a new provider (e.g., Stripe), implement the `PaymentProvider` interface:

```ts
import type { PaymentProvider, OrderData, PaymentSession } from '@repo/payment-engine';

export class StripeAdapter implements PaymentProvider {
  name = 'stripe';

  async createCheckoutSession(order: OrderData): Promise<PaymentSession> {
    // ... implementation
  }

  async verifyWebhook(payload: unknown, signature: string) {
    // ... implementation
  }
}
