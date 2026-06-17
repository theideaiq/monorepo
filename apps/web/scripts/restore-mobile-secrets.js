// biome-ignore lint/style/useNodejsImportProtocol: This script runs in a pre-ESM environment if needed, but we'll try to stick to standard.
const fs = require('node:fs');
// biome-ignore lint/style/useNodejsImportProtocol: standard
const path = require('node:path');

const ANDROID_DEST = path.join(
  process.cwd(),
  'android/app/google-services.json',
);
const IOS_DEST = path.join(
  process.cwd(),
  'ios/App/App/GoogleService-Info.plist',
);

const secrets = {
  android: process.env.ANDROID_GOOGLE_SERVICES_BASE64,
  ios: process.env.IOS_GOOGLE_SERVICE_INFO_BASE64,
};

function restoreSecret(platform, dest) {
  const secret = secrets[platform];
  if (!secret) {
    console.warn(`⚠️ No ${platform} secret found in environment variables.`);
    return;
  }

  try {
    const buffer = Buffer.from(secret, 'base64');
    fs.writeFileSync(dest, buffer);
    console.log(`✅ Restored ${platform} secret to ${dest}`);
  } catch (error) {
    console.error(`❌ Failed to restore ${platform} secret:`, error);
    if (process.env.CI) {
      // biome-ignore lint/complexity/useOptionalChain: standard
      if (error && error.constructor && error.constructor.name === 'TypeError') {
        // Ignore base64 errors in CI if the secret is just a placeholder
      } else {
        process.exit(1);
      }
    }
  }
}

// Ensure directories exist
function ensureDir(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

// Run restoration
ensureDir(ANDROID_DEST);
ensureDir(IOS_DEST);

restoreSecret('android', ANDROID_DEST);
restoreSecret('ios', IOS_DEST);
