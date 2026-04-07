/**
 * Centralized logging utility to ensure consistent log formatting and handling.
 * Suppresses logs in test environments.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Logger grouping
export class Logger {
  /**
   * Logs a message with optional metadata.
   *
   * @param message - The primary log message.
   * @param meta - Additional context to log.
   */
  static log(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'test') {
      // biome-ignore lint/suspicious/noConsole: Centralized logging
      console.log(message, meta);
    }
  }

  /**
   * Logs an error with optional error object and metadata.
   *
   * @param message - The error message.
   * @param error - The error object or unknown error.
   * @param meta - Additional context to log.
   */
  static error(
    message: string,
    error?: unknown,
    meta?: Record<string, unknown>,
  ) {
    if (process.env.NODE_ENV !== 'test') {
      // biome-ignore lint/suspicious/noConsole: Centralized logging
      console.error(message, error, meta);
    }
  }

  /**
   * Logs a warning with optional metadata.
   *
   * @param message - The warning message.
   * @param meta - Additional context to log.
   */
  static warn(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'test') {
      // biome-ignore lint/suspicious/noConsole: Centralized logging
      console.warn(message, meta);
    }
  }
}
