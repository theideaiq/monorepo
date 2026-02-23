// biome-ignore lint/style/useNodejsImportProtocol: legacy script environment
const fs = require('fs');
// biome-ignore lint/style/useNodejsImportProtocol: legacy script environment
const path = require('path');

const ANDROID_DEST = path.join(
  __dirname,
  '../apps/web/android/app/google-services.json',
);
const IOS_DEST = path.join(
  __dirname,
  '../apps/web/ios/App/App/GoogleService-Info.plist',
);

function restoreSecrets() {
  try {
    if (process.env.GOOGLE_SERVICES_JSON) {
      fs.writeFileSync(
        ANDROID_DEST,
        Buffer.from(process.env.GOOGLE_SERVICES_JSON, 'base64'),
      );
      console.log('✅ Restored Android secrets');
    }

    if (process.env.GOOGLE_SERVICE_INFO_PLIST) {
      fs.writeFileSync(
        IOS_DEST,
        Buffer.from(process.env.GOOGLE_SERVICE_INFO_PLIST, 'base64'),
      );
      console.log('✅ Restored iOS secrets');
    }
  } catch (error) {
    console.error('❌ Failed to restore secrets:', error);
    if (error?.code !== 'ENOENT') {
      const errorType =
        error?.constructor &&
        typeof error.constructor.name === 'string'
          ? error.constructor.name
          : 'Unknown';
      console.error(`Error type: ${errorType}`);
    }
  }
}

restoreSecrets();
