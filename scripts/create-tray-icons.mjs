#!/usr/bin/env node
/**
 * Creates platform-specific tray icons for Ancestree.
 *
 * Generates:
 * - macOS: iconTemplate.png (16x16), iconTemplate@2x.png (32x32) - black + alpha only
 * - Windows: icon.ico (multi-resolution ICO with 16, 24, 32, 48)
 * - Linux: icon.png (22x22)
 *
 * macOS template images use black + alpha only so the system can
 * automatically invert for dark mode.
 */
import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const sourceIcon = join(projectRoot, 'assets', 'icon-source.png');
const outputDir = join(projectRoot, 'build', 'icons', 'tray');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

/**
 * Create macOS template image (black + alpha only)
 * The "Template" suffix tells macOS to auto-invert for dark mode
 */
async function createMacOSTemplate(size, suffix) {
  const outputPath = join(outputDir, `iconTemplate${suffix}.png`);

  // Read source, resize, convert to grayscale, extract alpha
  // For template images: use black (#000000) with original alpha channel
  const image = sharp(sourceIcon)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });

  // Get the alpha channel from the original
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Create new buffer: black pixels with alpha from luminance of original
  const outputData = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0; i < info.width * info.height; i++) {
    const srcOffset = i * 4;
    const dstOffset = i * 4;

    // Get luminance from RGB (approximate grayscale)
    const r = data[srcOffset];
    const g = data[srcOffset + 1];
    const b = data[srcOffset + 2];
    const a = data[srcOffset + 3];

    // Calculate luminance (darker parts of original become more opaque)
    const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    // For template: black pixels, alpha based on inverse of luminance
    // Dark areas in original -> more opaque black
    // Light areas in original -> more transparent
    const templateAlpha = Math.round((255 - luminance) * (a / 255));

    outputData[dstOffset] = 0;      // R = black
    outputData[dstOffset + 1] = 0;  // G = black
    outputData[dstOffset + 2] = 0;  // B = black
    outputData[dstOffset + 3] = templateAlpha; // Alpha from inverse luminance
  }

  await sharp(outputData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png()
    .toFile(outputPath);

  console.log(`Created ${outputPath} (${size}x${size} template)`);
}

/**
 * Create Windows ICO with multiple resolutions
 * ICO format: header + directory entries + image data
 */
async function createWindowsICO() {
  const outputPath = join(outputDir, 'icon.ico');
  const sizes = [16, 24, 32, 48];

  // Generate PNG buffers for each size
  const images = await Promise.all(
    sizes.map(async (size) => {
      const buffer = await sharp(sourceIcon)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      return { size, buffer };
    })
  );

  // ICO file format:
  // Header (6 bytes): reserved(2) + type(2) + count(2)
  // Directory entries (16 bytes each): width, height, colors, reserved, planes, bpp, size, offset
  // Image data (PNG format)

  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * images.length;
  let offset = headerSize + dirSize;

  // Build directory entries
  const dirEntries = [];
  for (const img of images) {
    dirEntries.push({
      width: img.size === 256 ? 0 : img.size, // 0 means 256 in ICO format
      height: img.size === 256 ? 0 : img.size,
      colors: 0,    // 0 for PNG
      reserved: 0,
      planes: 1,
      bpp: 32,      // 32-bit color
      size: img.buffer.length,
      offset: offset
    });
    offset += img.buffer.length;
  }

  // Calculate total file size
  const totalSize = offset;
  const ico = Buffer.alloc(totalSize);

  // Write header
  ico.writeUInt16LE(0, 0);           // Reserved
  ico.writeUInt16LE(1, 2);           // Type (1 = ICO)
  ico.writeUInt16LE(images.length, 4); // Image count

  // Write directory entries
  let entryOffset = headerSize;
  for (const entry of dirEntries) {
    ico.writeUInt8(entry.width, entryOffset);
    ico.writeUInt8(entry.height, entryOffset + 1);
    ico.writeUInt8(entry.colors, entryOffset + 2);
    ico.writeUInt8(entry.reserved, entryOffset + 3);
    ico.writeUInt16LE(entry.planes, entryOffset + 4);
    ico.writeUInt16LE(entry.bpp, entryOffset + 6);
    ico.writeUInt32LE(entry.size, entryOffset + 8);
    ico.writeUInt32LE(entry.offset, entryOffset + 12);
    entryOffset += dirEntrySize;
  }

  // Write image data
  for (const img of images) {
    const entry = dirEntries[images.indexOf(img)];
    img.buffer.copy(ico, entry.offset);
  }

  writeFileSync(outputPath, ico);
  console.log(`Created ${outputPath} (multi-resolution ICO: ${sizes.join(', ')})`);
}

/**
 * Create Linux tray icon (22x22 is standard for GNOME/Unity)
 */
async function createLinuxIcon() {
  const outputPath = join(outputDir, 'icon.png');

  await sharp(sourceIcon)
    .resize(22, 22, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outputPath);

  console.log(`Created ${outputPath} (22x22 PNG)`);
}

// Run all icon generation
async function main() {
  console.log('Creating tray icons...\n');

  try {
    // macOS template icons
    await createMacOSTemplate(16, '');        // iconTemplate.png
    await createMacOSTemplate(32, '@2x');     // iconTemplate@2x.png

    // Windows ICO
    await createWindowsICO();

    // Linux PNG
    await createLinuxIcon();

    console.log('\nAll tray icons created successfully!');
  } catch (err) {
    console.error('Failed to create tray icons:', err);
    process.exit(1);
  }
}

main();
