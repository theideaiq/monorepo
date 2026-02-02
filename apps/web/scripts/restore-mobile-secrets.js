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

function restoreSecret(envVar, destPath, platformName) {
  const secretBase64 = process.env[envVar];
  if (secretBase64) {
    try {
      const secretBuffer = Buffer.from(secretBase64, 'base64');
      const destDir = path.dirname(destPath);
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(destPath, secretBuffer);
      fs.chmodSync(destPath, 0o600);
      console.log(`✅ ${platformName} secrets restored to ${destPath}`);
    } catch (error) {
      let errorMessage;
      if (error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else {
        const errorType =
          error &&
          error.constructor &&
          typeof error.constructor.name === 'string'
            ? error.constructor.name
            : 'UnknownErrorType';
        let errorDetails;
        try {
          errorDetails = JSON.stringify(error);
        } catch {
          errorDetails = String(error);
        }
        errorMessage = `${errorType}: ${errorDetails || 'Unknown error'}`;
      }
      console.error(
        `❌ Failed to restore ${platformName} secrets: ${errorMessage}`,
      );
      process.exit(1);
    }
  } else {
    console.log(
      `⚠️ No ${platformName} secret found (${envVar} is not set), skipping.`,
    );
  }
}

console.log('🔄 Restoring mobile secrets...');

restoreSecret('ANDROID_GOOGLE_SERVICES_BASE64', ANDROID_DEST, 'Android');
restoreSecret('IOS_GOOGLE_SERVICE_INFO_BASE64', IOS_DEST, 'iOS');

console.log('🏁 Secret restoration process complete.');
