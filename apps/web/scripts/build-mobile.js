// biome-ignore lint/style/useNodejsImportProtocol: This script runs in a pre-ESM environment if needed, but we'll try to stick to standard.
const fs = require('node:fs');
// biome-ignore lint/style/useNodejsImportProtocol: standard
const path = require('node:path');

const ANDROID_DIR = path.join(process.cwd(), 'android');
const IOS_DIR = path.join(process.cwd(), 'ios');

if (!fs.existsSync(ANDROID_DIR) || !fs.existsSync(IOS_DIR)) {
  console.log(
    '⚠️ Mobile directories not found. Skipping mobile build steps.',
  );
  process.exit(0);
}

// In a real scenario, this script might run `npx cap sync` or similar.
console.log('📱 Mobile build script placeholder.');
