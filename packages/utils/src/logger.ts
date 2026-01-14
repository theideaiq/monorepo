// biome-ignore lint/complexity/noStaticOnlyClass: Logger grouping
export class Logger {
  static log(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'test') {
      // biome-ignore lint/suspicious/noConsole: Centralized logging
      console.log(message, meta);
    }
  }

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

  static warn(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'test') {
      // biome-ignore lint/suspicious/noConsole: Centralized logging
      console.warn(message, meta);
    }
  }
}
