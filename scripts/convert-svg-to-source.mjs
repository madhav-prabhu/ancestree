#!/usr/bin/env node
/**
 * Converts an SVG logo to the icon-source.png for the icon pipeline.
 * Usage: node scripts/convert-svg-to-source.mjs [path-to-svg]
 * Default: assets/logo-concepts/concept-1-tree-silhouette.svg
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Get SVG path from args or use default
const svgPath = process.argv[2] || join(projectRoot, 'assets', 'logo-concepts', 'concept-1-tree-silhouette.svg');
const outputPath = join(projectRoot, 'assets', 'icon-source.png');

const size = 1024;

async function convertSvgToSource() {
  console.log(`Converting ${svgPath} to icon source...`);

  // Read SVG content
  const svgContent = readFileSync(svgPath, 'utf-8');

  // Convert SVG to 1024x1024 PNG
  await sharp(Buffer.from(svgContent))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`Created ${outputPath} (${size}x${size})`);
  console.log('\nNext steps:');
  console.log('  npm run icons       # Generate app icons');
  console.log('  npm run icons:tray  # Generate tray icons');
}

convertSvgToSource().catch(err => {
  console.error('Failed to convert SVG:', err);
  process.exit(1);
});
