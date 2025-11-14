const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true });
  console.log('✅ Cleaned dist directory');
} else {
  console.log('ℹ️  dist directory does not exist');
}
