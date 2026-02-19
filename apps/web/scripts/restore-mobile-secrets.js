const fs = require('node:fs');
const path = require('node:path');

const ANDROID_DEST = path.join(
  __dirname,
  '../android/app/google-services.json',
);
const IOS_DEST = path.join(__dirname, '../ios/App/App/GoogleService-Info.plist');

function restoreSecrets() {
  console.log('🔄 Restoring mobile secrets...');

  try {
    // 1. Android
    if (process.env.ANDROID_GOOGLE_SERVICES_BASE64) {
      const androidBuffer = Buffer.from(
        process.env.ANDROID_GOOGLE_SERVICES_BASE64,
        'base64',
      );
      fs.writeFileSync(ANDROID_DEST, androidBuffer);
      console.log('✅ Android secret restored.');
    } else {
      console.log(
        '⚠️ No Android secret found (ANDROID_GOOGLE_SERVICES_BASE64 is not set), skipping.',
      );
    }

    // 2. iOS
    if (process.env.IOS_GOOGLE_SERVICE_INFO_BASE64) {
      const iosBuffer = Buffer.from(
        process.env.IOS_GOOGLE_SERVICE_INFO_BASE64,
        'base64',
      );
      fs.writeFileSync(IOS_DEST, iosBuffer);
      console.log('✅ iOS secret restored.');
    } else {
      console.log(
        '⚠️ No iOS secret found (IOS_GOOGLE_SERVICE_INFO_BASE64 is not set), skipping.',
      );
    }

    console.log('🏁 Secret restoration process complete.');
  } catch (error) {
    console.error('❌ Error restoring secrets:', error);
    if (error) {
      const errorType =
        error?.constructor && typeof error.constructor.name === 'string'
          ? error.constructor.name
          : typeof error;
      console.error(`Error Type: ${errorType}`);
      // @ts-ignore
      if (error.message) console.error(`Message: ${error.message}`);
      // @ts-ignore
      if (error.stack) console.error(`Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

restoreSecrets();
