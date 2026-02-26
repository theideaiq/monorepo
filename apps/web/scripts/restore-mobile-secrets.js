const fs = require('node:fs');
const path = require('node:path');

const ANDROID_DEST = path.join(
  __dirname,
  '../../apps/droid/android/app/google-services.json'
);
const IOS_DEST = path.join(
  __dirname,
  '../../apps/droid/ios/App/App/GoogleService-Info.plist'
);

function restoreSecrets() {
  try {
    const androidSecret = process.env.GOOGLE_SERVICES_JSON_BASE64;
    const iosSecret = process.env.GOOGLE_SERVICE_INFO_PLIST_BASE64;

    if (androidSecret) {
      const decoded = Buffer.from(androidSecret, 'base64').toString('utf8');
      fs.writeFileSync(ANDROID_DEST, decoded);
      console.log('Restored google-services.json');
    }

    if (iosSecret) {
      const decoded = Buffer.from(iosSecret, 'base64').toString('utf8');
      fs.writeFileSync(IOS_DEST, decoded);
      console.log('Restored GoogleService-Info.plist');
    }
  } catch (error) {
    if (process.env.CI) {
      // In CI, we want to warn but not fail if secrets are missing
      // unless we are specifically building for release
      console.warn('Warning: Failed to restore mobile secrets:', error.message);
    } else {
      const errorType =
        error?.constructor &&
        typeof error.constructor.name === 'string'
          ? error.constructor.name
          : 'UnknownError';
      // biome-ignore lint/suspicious/noConsole: Critical build script
      console.error(`[${errorType}] Failed to restore secrets:`, error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  restoreSecrets();
}

module.exports = { restoreSecrets };
