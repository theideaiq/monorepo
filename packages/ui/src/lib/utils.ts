import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn
 *
 * @description Standardized execution for cn.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
