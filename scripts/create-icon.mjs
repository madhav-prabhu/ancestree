#!/usr/bin/env node
/**
 * Creates a placeholder icon for Ancestree.
 * This generates a 1024x1024 PNG with "A" in Ancestree green.
 * User can replace assets/icon-source.png with a proper design later.
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const size = 1024;
const backgroundColor = '#f0fdf4'; // Tailwind green-50
const textColor = '#166534';       // Tailwind green-800

// Create SVG with the letter "A"
const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${backgroundColor}"/>
  <text
    x="50%"
    y="50%"
    dominant-baseline="central"
    text-anchor="middle"
    font-family="Arial, sans-serif"
    font-size="600"
    font-weight="bold"
    fill="${textColor}"
  >A</text>
</svg>
`;

const outputPath = join(projectRoot, 'assets', 'icon-source.png');

sharp(Buffer.from(svg))
  .resize(size, size)
  .png()
  .toFile(outputPath)
  .then(() => {
    console.log(`Created placeholder icon at ${outputPath}`);
    console.log('Replace with your own 1024x1024 PNG for production branding.');
  })
  .catch(err => {
    console.error('Failed to create icon:', err);
    process.exit(1);
  });
