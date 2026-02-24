const fs = require('node:fs');
const path = require('node:path');

const ANDROID_DEST = path.join(
  __dirname,
  '../android/app/google-services.json',
);
const IOS_DEST = path.join(
  __dirname,
  '../ios/App/App/GoogleService-Info.plist',
);

function restoreSecrets() {
  console.log('🔄 Restoring mobile secrets...');

  // 1. Android: google-services.json
  if (process.env.ANDROID_GOOGLE_SERVICES_BASE64) {
    try {
      const buffer = Buffer.from(
        process.env.ANDROID_GOOGLE_SERVICES_BASE64,
        'base64',
      );
      fs.writeFileSync(ANDROID_DEST, buffer);
      console.log('✅ Restored android/app/google-services.json');
    } catch (error) {
      console.error(
        '❌ Failed to restore Android secrets:',
        error instanceof Error ? error.message : String(error),
      );
    }
  } else {
    console.warn('⚠️ ANDROID_GOOGLE_SERVICES_BASE64 not set. Skipping.');
  }

  // 2. iOS: GoogleService-Info.plist
  if (process.env.IOS_GOOGLE_SERVICE_INFO_BASE64) {
    try {
      const buffer = Buffer.from(
        process.env.IOS_GOOGLE_SERVICE_INFO_BASE64,
        'base64',
      );
      fs.writeFileSync(IOS_DEST, buffer);
      console.log('✅ Restored ios/App/App/GoogleService-Info.plist');
    } catch (error) {
      // Use optional chaining as requested by linter
      const errorType =
        error?.constructor && typeof error.constructor.name === 'string'
          ? error.constructor.name
          : 'UnknownError';
      console.error(`❌ Failed to restore iOS secrets (${errorType})`);
    }
  } else {
    console.warn('⚠️ IOS_GOOGLE_SERVICE_INFO_BASE64 not set. Skipping.');
  }
}

restoreSecrets();
