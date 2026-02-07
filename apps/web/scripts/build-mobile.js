const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

// Directories to hide during mobile build
const directoriesToHide = [
  { original: '../src/app/api', temp: '../src/app/_api' },
  { original: '../src/app/auth', temp: '../src/app/_auth' },
  // Hide opengraph-image.tsx by moving it to a temp name (not just dir)
  // Actually, for files it's harder if they are in root.
  // But opengraph-image.tsx is in src/app.
];

// Files to hide/rename
const filesToHide = [
  {
    original: '../src/app/opengraph-image.tsx',
    temp: '../src/app/_opengraph-image.tsx',
  },
];

// Function to move file or dir
function moveItem(srcRel, destRel) {
  const src = path.join(__dirname, srcRel);
  const dest = path.join(__dirname, destRel);

  if (fs.existsSync(src)) {
    console.log(`Moving ${src} to ${dest}`);
    fs.renameSync(src, dest);
    return true;
  } else {
    // console.warn(`Source ${src} does not exist.`);
    return false;
  }
}

// Function to restore
function restoreItem(srcRel, destRel) {
  const src = path.join(__dirname, srcRel);
  const dest = path.join(__dirname, destRel);

  if (fs.existsSync(src)) {
    console.log(`Restoring ${src} to ${dest}`);
    fs.renameSync(src, dest);
  }
}

// Track moved items
const movedItems = [];

function cleanup() {
  [...movedItems].reverse().forEach(({ original, temp }) => {
    restoreItem(temp, original);
  });
  movedItems.length = 0;
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit();
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit();
});
process.on('uncaughtException', (err) => {
  console.error(err);
  cleanup();
  process.exit(1);
});

try {
  // Move directories
  for (const dir of directoriesToHide) {
    if (moveItem(dir.original, dir.temp)) {
      movedItems.push(dir);
    }
  }
  // Move files
  for (const file of filesToHide) {
    if (moveItem(file.original, file.temp)) {
      movedItems.push(file);
    }
  }

  // Run build
  console.log('Starting build...');
  execSync('cross-env NEXT_PUBLIC_APP_ENV=mobile next build', {
    stdio: 'inherit',
    env: { ...process.env, NEXT_PUBLIC_APP_ENV: 'mobile' },
  });
  console.log('Build completed successfully.');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} finally {
  cleanup();
}
