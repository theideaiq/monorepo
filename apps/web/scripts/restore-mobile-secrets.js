const fs = require('node:fs');
const path = require('node:path');

const ANDROID_DEST = path.join(
  __dirname,
  '../android/app/src/main/assets/secrets.json',
);
const IOS_DEST = path.join(__dirname, '../ios/App/App/secrets.json');

// Only run if specific env var is present (e.g. in CI or local build)
// Or just check if secrets exist in env
const secrets = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

if (!secrets.supabaseUrl || !secrets.supabaseAnonKey) {
  console.log('Skipping mobile secrets restore: missing env vars');
  process.exit(0);
}

const content = JSON.stringify(secrets, null, 2);

try {
  // Ensure directories exist
  fs.mkdirSync(path.dirname(ANDROID_DEST), { recursive: true });
  fs.mkdirSync(path.dirname(IOS_DEST), { recursive: true });

  fs.writeFileSync(ANDROID_DEST, content);
  console.log(`Restored ${ANDROID_DEST}`);

  fs.writeFileSync(IOS_DEST, content);
  console.log(`Restored ${IOS_DEST}`);
} catch (error) {
  console.error('Failed to restore mobile secrets:', error?.message);
}
