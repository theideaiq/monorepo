import type {
  CreateLinkRequest,
  CreateRefundRequest,
  Link,
  PaginatedResponse,
  Product,
  Refund,
  SingleResponse,
  Subscriber,
  Subscription,
  WaylConfig,
} from './types';

export class WaylClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: WaylConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.thewayl.com';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-WAYL-AUTHENTICATION': this.apiKey,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        errorBody.message || `Wayl API Error: ${response.statusText}`,
      );
    }

    return response.json();
  }

  public readonly links = {
    create: async (data: CreateLinkRequest) => {
      return this.request<SingleResponse<Link>>('/api/v1/links', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    list: async (params?: {
      take?: number;
      skip?: number;
      statuses?: string[];
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.take) searchParams.set('take', params.take.toString());
      if (params?.skip) searchParams.set('skip', params.skip.toString());
      if (params?.statuses) {
        // Wayl API expects multiple params: ?statuses=A&statuses=B
        for (const status of params.statuses) {
          searchParams.append('statuses', status);
        }
      }
      return this.request<PaginatedResponse<Link>>(
        `/api/v1/links?${searchParams.toString()}`,
      );
    },
    get: async (referenceId: string) => {
      return this.request<SingleResponse<Link>>(`/api/v1/links/${referenceId}`);
    },
    invalidate: async (referenceId: string) => {
      return this.request<SingleResponse<Link>>(
        `/api/v1/links/${referenceId}/invalidate`,
        { method: 'POST' },
      );
    },
    batch: async (referenceIds: string[]) => {
      return this.request<PaginatedResponse<Link>>('/api/v1/links/batch', {
        method: 'POST',
        body: JSON.stringify({ referenceIds }),
      });
    },
  };

  public readonly products = {
    list: async (params?: { take?: number; skip?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.take) searchParams.set('take', params.take.toString());
      if (params?.skip) searchParams.set('skip', params.skip.toString());
      return this.request<PaginatedResponse<Product>>(
        `/api/v1/products?${searchParams.toString()}`,
      );
    },
    get: async (productId: string) => {
      return this.request<SingleResponse<Product>>(
        `/api/v1/products/${productId}`,
      );
    },
  };

  public readonly subscriptions = {
    list: async (params?: { take?: number; skip?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.take) searchParams.set('take', params.take.toString());
      if (params?.skip) searchParams.set('skip', params.skip.toString());
      return this.request<PaginatedResponse<Subscription>>(
        `/api/v1/subscriptions?${searchParams.toString()}`,
      );
    },
    get: async (productId: string) => {
      return this.request<SingleResponse<Subscription>>(
        `/api/v1/subscriptions/${productId}`,
      );
    },
  };

  public readonly subscribers = {
    list: async (params?: {
      take?: number;
      skip?: number;
      status?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.take) searchParams.set('take', params.take.toString());
      if (params?.skip) searchParams.set('skip', params.skip.toString());
      if (params?.status) searchParams.set('status', params.status);
      return this.request<PaginatedResponse<Subscriber>>(
        `/api/v1/subscribers?${searchParams.toString()}`,
      );
    },
  };

  public readonly refunds = {
    create: async (data: CreateRefundRequest) => {
      return this.request<SingleResponse<Refund>>('/api/v1/refunds', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    list: async (params?: {
      take?: number;
      skip?: number;
      referenceId?: string;
      statuses?: string[];
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.take) searchParams.set('take', params.take.toString());
      if (params?.skip) searchParams.set('skip', params.skip.toString());
      if (params?.referenceId)
        searchParams.set('referenceId', params.referenceId);
      if (params?.statuses) {
        for (const status of params.statuses) {
          searchParams.append('statuses', status);
        }
      }
      return this.request<PaginatedResponse<Refund>>(
        `/api/v1/refunds?${searchParams.toString()}`,
      );
    },
    get: async (refundId: string) => {
      return this.request<SingleResponse<Refund>>(
        `/api/v1/refunds/${refundId}`,
      );
    },
    cancel: async (refundId: string) => {
      return this.request<SingleResponse<Refund>>(
        `/api/v1/refunds/${refundId}/cancel`,
        { method: 'DELETE' },
      );
    },
  };

  public readonly auth = {
    verify: async () => {
      return this.request<{ message: string }>('/api/v1/verify-auth-key');
    },
  };
}
