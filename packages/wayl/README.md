# @repo/wayl

A type-safe TypeScript client for the Wayl Payment Gateway API.

## Features

- **Authentication**: Easy API key management.
- **Payment Links**: Create, list, and manage payment links.
- **Product Management**: Access Wayl product catalog.
- **Subscriptions**: Manage recurring billing and subscribers.
- **Refunds**: Process and track refunds.

## Usage

### Initialization

```typescript
import { WaylClient } from '@repo/wayl';

const client = new WaylClient({
  apiKey: process.env.WAYL_SECRET_KEY,
  baseUrl: process.env.WAYL_API_URL, // Optional
});
```

### Creating a Payment Link

```typescript
const link = await client.links.create({
  amount: 5000,
  currency: 'IQD',
  description: 'Premium Subscription',
  redirectUrl: 'https://myapp.com/success',
});

console.log('Payment URL:', link.url);
```

### Fetching Transactions

```typescript
const transactions = await client.links.list({
  take: 10,
  skip: 0,
  statuses: ['PAID'],
});
```

### Refunds

```typescript
const refund = await client.refunds.create({
  linkId: 'link_123',
  amount: 5000,
  reason: 'Customer request',
});
```
