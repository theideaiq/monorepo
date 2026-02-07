const fs = require('node:fs');
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
