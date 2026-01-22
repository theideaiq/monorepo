import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../services/products';

/**
 * React Query hook to fetch the list of products.
 *
 * Usage:
 * - Automatically handles caching, background refetching, and loading states.
 * - Stale time is determined by the global QueryProvider configuration (default 60s).
 *
 * @returns The query result object (data, isLoading, error).
 */
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });
}
