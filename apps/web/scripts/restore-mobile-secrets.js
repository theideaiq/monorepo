const fs = require('fs');
const path = require('path');

const ANDROID_DEST = path.join(__dirname, '../android/app/google-services.json');
const IOS_DEST = path.join(__dirname, '../ios/App/App/GoogleService-Info.plist');

function restoreSecret(envVar, destPath, platformName) {
  const secretBase64 = process.env[envVar];
  if (secretBase64) {
    try {
      const secretBuffer = Buffer.from(secretBase64, 'base64');
      fs.writeFileSync(destPath, secretBuffer);
      fs.chmodSync(destPath, 0o600);
      console.log(`✅ ${platformName} secrets restored to ${destPath}`);
    } catch (error) {
      const errorMessage = error && typeof error.message === 'string' ? error.message : 'Unknown error';
      console.error(`❌ Failed to restore ${platformName} secrets: ${errorMessage}`);
      process.exit(1);
    }
  } else {
    console.log(`⚠️ No ${platformName} secret found (${envVar} is not set), skipping.`);
  }
}

console.log('🔄 Restoring mobile secrets...');

restoreSecret('ANDROID_GOOGLE_SERVICES_BASE64', ANDROID_DEST, 'Android');
restoreSecret('IOS_GOOGLE_SERVICE_INFO_BASE64', IOS_DEST, 'iOS');

console.log('🏁 Secret restoration process complete.');
