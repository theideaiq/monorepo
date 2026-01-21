export type Currency = 'IQD';

export type PaymentStatus =
  | 'Created'
  | 'Pending'
  | 'Processing'
  | 'Complete'
  | 'Delivered'
  | 'Cancelled'
  | 'Rejected'
  | 'Returned';

export type SubscriptionPeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export type SubscriberStatus =
  | 'Active'
  | 'Paused'
  | 'Cancelled'
  | 'PendingCancellation';

export type RefundStatus = 'Requested' | 'Refunded' | 'Rejected' | 'Cancelled';

export type ProductType = 'Digital' | 'Physical' | 'Service';

export interface LineItem {
  label: string;
  amount: number;
  type: 'increase' | 'decrease';
  image?: string;
}

export interface CreateLinkRequest {
  referenceId: string;
  total: number;
  currency: Currency;
  customParameter?: string;
  lineItem?: LineItem[];
  webhookUrl?: string;
  webhookSecret?: string;
  redirectionUrl?: string;
}

export interface Link {
  referenceId: string;
  id: string;
  total: string;
  currency: string;
  type: string;
  paymentMethod: string | null;
  status: PaymentStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  webhookUrl: string;
  redirectionUrl: string;
  customParameter?: string | null;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  url: string;
  status: string;
  image: string;
  tags: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  productType?: ProductType;
  downloadable?: string;
  discountType?: string;
  discountExpiry?: string;
  discountValue?: string;
  qt?: number;
  unlimited?: boolean;
  notifyOn?: number;
}

export interface Subscription {
  id: string;
  title: string;
  amount: string;
  currency: string;
  subscriptionPeriod: SubscriptionPeriod;
  gracePeriod: number;
  pausedSubscription: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscriber {
  id: string;
  createdAt: string;
  updatedAt: string;
  amount: number;
  currency: string;
  period: SubscriptionPeriod;
  status: SubscriberStatus;
  nextBillingAt: string;
  pendingAmount: number;
  unpaidSince: string;
  retryCount: number;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelledReason: string | null;
  product: {
    id: string;
    title: string;
    price: number;
    subscriptionPeriod: SubscriptionPeriod;
    gracePeriod: number;
    pausedSubscription: boolean;
  };
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}

export interface CreateRefundRequest {
  referenceId: string;
  reason: string;
  amount: number;
}

export interface Refund {
  id: string;
  reason: string;
  linkId: string;
  referenceId: string;
  amount: number;
  initiatedBy: string;
  status: RefundStatus;
}

export interface PaginatedResponse<T> {
  data: T[];
  message: string;
  totalRequested?: number;
  totalFound?: number;
}

export interface SingleResponse<T> {
  data: T;
  message: string;
}

export interface ErrorResponse {
  message: string;
  errors?: {
    code: string;
    path: string[];
    message: string;
  }[];
}

export interface WaylConfig {
  apiKey: string;
  baseUrl?: string;
  webhookSecret?: string;
}
