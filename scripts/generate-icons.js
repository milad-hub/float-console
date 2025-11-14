import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const iconsDir = path.resolve(import.meta.dirname, '..', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 32, 64, 128];

async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.125}" fill="#667eea"/>
      <rect x="${size * 0.125}" y="${size * 0.1875}" width="${size * 0.75}" height="${size * 0.625}" rx="${size * 0.0625}" fill="#ffffff"/>
      <text x="${size * 0.3125}" y="${size * 0.59375}" font-family="Arial, sans-serif" font-size="${size * 0.25}" font-weight="bold" fill="#000000">C</text>
    </svg>
  `;

  await sharp(new TextEncoder().encode(svg))
    .png()
    .toFile(path.join(iconsDir, `icon${size}.png`));
  
  console.log(`✅ Generated icon${size}.png`);
}

async function generateAllIcons() {
  console.log('🎨 Generating icons...');
  for (const size of sizes) {
    await generateIcon(size);
  }
  console.log('✨ All icons generated successfully!');
}

generateAllIcons().catch(console.error);
