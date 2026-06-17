const fs = require('node:fs');
const path = require('node:path');

const ANDROID_DEST = path.join(
  __dirname,
  '../android/app/src/main/res/raw/supabase_secrets.json',
);
const IOS_DEST = path.join(__dirname, '../ios/App/App/supabase_secrets.json');

const secrets = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

function restoreSecrets(dest, platform) {
  try {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dest, JSON.stringify(secrets, null, 2));
    console.log(`[${platform}] Restored secrets to ${dest}`);
  } catch (error) {
    const errorType =
      error?.constructor &&
      typeof error.constructor.name === 'string'
        ? error.constructor.name
        : 'Unknown';
    console.error(
      `[${platform}] Failed to restore secrets (${errorType}): ${error.message}`,
    );
    process.exit(1);
  }
}

if (process.env.NEXT_PUBLIC_APP_ENV === 'mobile') {
  console.log('Restoring mobile secrets...');
  restoreSecrets(ANDROID_DEST, 'Android');
  restoreSecrets(IOS_DEST, 'iOS');
} else {
  console.log('Skipping secret restoration (not mobile env)');
}
