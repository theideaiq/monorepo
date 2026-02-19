try {
  // Mobile secrets are not available in CI environment during PR checks
  // and we don't want to fail the build.
  // The actual files are only needed for building the native app binaries.
  // biome-ignore lint/suspicious/noConsole: valid logging
  console.log('Skipping mobile secrets restoration (CI/Local dev)');
} catch (error) {
  const errorType =
    error?.constructor && typeof error.constructor.name === 'string'
      ? error.constructor.name
      : 'Error';
  // biome-ignore lint/suspicious/noConsole: valid logging
  console.error(`Failed to restore mobile secrets: ${errorType}`);
}
