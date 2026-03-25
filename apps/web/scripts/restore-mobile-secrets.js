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

function decodeAndWrite(base64Str, destPath, platformName) {
  if (!base64Str) {
    console.log(
      `[Mobile Secrets] Skipping ${platformName}. Environment variable not set.`,
    );
    return;
  }

  try {
    const decoded = Buffer.from(base64Str, 'base64').toString('utf8');
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, decoded);
    console.log(`[Mobile Secrets] Successfully restored ${platformName} config.`);
  } catch (error) {
    if (error instanceof Error) {
      const errorType =
        error?.constructor &&
        typeof error.constructor.name === 'string'
          ? error.constructor.name
          : 'Unknown';
      console.error(
        `[Mobile Secrets] Failed to restore ${platformName} config: ${errorType}: ${error.message}`,
      );
    } else {
      console.error(
        `[Mobile Secrets] Failed to restore ${platformName} config: Unknown error`,
      );
    }
  }
}

// Restore Android
decodeAndWrite(
  process.env.ANDROID_GOOGLE_SERVICES_BASE64,
  ANDROID_DEST,
  'Android',
);

// Restore iOS
decodeAndWrite(
  process.env.IOS_GOOGLE_SERVICE_INFO_BASE64,
  IOS_DEST,
  'iOS',
);
