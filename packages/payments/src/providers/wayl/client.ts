import { env } from '@auibsal/env';

const WAYL_API_KEY = env.WAYL_API_KEY;
const WAYL_ENV = env.WAYL_ENV === 'live' ? 'live' : 'test';

const WAYL_BASE_URL = WAYL_ENV === 'live' 
  ? 'https://api.thewayl.com' 
  : 'https://api.thewayl-staging.com';

export async function waylRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: true; data: T; message: string } | { success: false; error: string }> {
  if (!WAYL_API_KEY) {
    return { success: false, error: 'WAYL_API_KEY is missing from environment.' };
  }

  const url = `${WAYL_BASE_URL}${path}`;
  const headers = new Headers(options.headers);
  
  // Enforce custom security header specification
  headers.set('X-WAYL-AUTHENTICATION', WAYL_API_KEY);
  headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(url, { ...options, headers });
    const payload = await response.json();

    if (!response.ok) {
      return { success: false, error: payload.message || `API request failed with status ${response.status}` };
    }

    return {
      success: true,
      data: payload.data as T,
      message: payload.message || 'Operation executed successfully.',
    };
  } catch (error) {
    console.error(`[WAYL API SYSTEM FAILURE] Path: ${path}`, error);
    return { success: false, error: 'Network failure communicating with payment engine.' };
  }
}
