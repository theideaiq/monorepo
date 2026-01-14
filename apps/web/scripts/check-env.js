const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  // biome-ignore lint/suspicious/noConsole: Build script needs console
  console.error(
    `❌ Missing required environment variables: ${missingEnvVars.join(', ')}`,
  );
  process.exit(1);
}

// biome-ignore lint/suspicious/noConsole: Build script needs console
console.log('✅ Environment variables check passed');
