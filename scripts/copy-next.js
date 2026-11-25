const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'apps', 'web', '.next');
const dest = path.resolve(__dirname, '..', '.next');

if (fs.existsSync(src) && !fs.existsSync(dest)) {
  try {
    fs.symlinkSync(src, dest, 'junction');
    console.log('[build-script] Successfully symlinked apps/web/.next -> .next');
  } catch (err) {
    try {
      fs.cpSync(src, dest, { recursive: true });
      console.log('[build-script] Successfully copied apps/web/.next -> .next');
    } catch (copyErr) {
      console.error('[build-script] Failed to mirror .next:', copyErr);
    }
  }
} else if (fs.existsSync(dest)) {
  console.log('[build-script] .next already exists at root.');
}
