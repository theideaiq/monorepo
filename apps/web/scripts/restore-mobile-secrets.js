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

// Function to decode Base64
function decodeBase64(data) {
  return Buffer.from(data, 'base64').toString('utf-8');
}

// Function to write file
function writeSecretFile(dest, content) {
  try {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️ Directory does not exist: ${dir}. Skipping...`);
      return;
    }
    fs.writeFileSync(dest, content);
    console.log(`✅ Restored: ${dest}`);
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      const errorType =
        error?.constructor &&
        typeof error.constructor.name === 'string'
          ? error.constructor.name
          : 'UnknownErrorType';
      errorMessage = `Non-error object thrown: ${errorType}`;
    }
    console.error(`❌ Failed to write ${dest}:`, errorMessage);
    process.exit(1);
  }
}

// Restore Android Secret
if (process.env.ANDROID_GOOGLE_SERVICES_BASE64) {
  writeSecretFile(
    ANDROID_DEST,
    decodeBase64(process.env.ANDROID_GOOGLE_SERVICES_BASE64),
  );
} else {
  console.warn('⚠️ ANDROID_GOOGLE_SERVICES_BASE64 not set. Skipping...');
}

// Restore iOS Secret
if (process.env.IOS_GOOGLE_SERVICE_INFO_BASE64) {
  writeSecretFile(
    IOS_DEST,
    decodeBase64(process.env.IOS_GOOGLE_SERVICE_INFO_BASE64),
  );
} else {
  console.warn('⚠️ IOS_GOOGLE_SERVICE_INFO_BASE64 not set. Skipping...');
}
