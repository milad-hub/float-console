import fs from 'fs';
import path from 'path';

const distPath = path.resolve(import.meta.dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true });
  console.log('✅ Cleaned dist directory');
} else {
  console.log('ℹ️  dist directory does not exist');
}
