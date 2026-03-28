/**
 * Extracts a safe string error message from a thrown unknown value.
 * Useful for catch (e) blocks where e defaults to unknown.
 *
 * @param error - The thrown value.
 * @returns The extracted error message string.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
