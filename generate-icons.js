const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const sizes = [16, 24, 32, 48, 64, 128, 256, 512];
const iconDir = path.join(__dirname, 'icons');
const svgPath = path.join(iconDir, 'icon.svg');

// Ensure icons directory exists
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Generating icons...\n');

  const pngFiles = [];

  // Generate PNG files for each size
  for (const size of sizes) {
    const outputPath = path.join(iconDir, `icon-${size}x${size}.png`);

    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    pngFiles.push(outputPath);
    console.log(`✅ Generated: icon-${size}x${size}.png`);
  }

  // Generate a 1024x1024 PNG for high-res displays
  const highResPath = path.join(iconDir, 'icon-1024x1024.png');
  await sharp(svgPath)
    .resize(1024, 1024)
    .png()
    .toFile(highResPath);
  console.log(`✅ Generated: icon-1024x1024.png`);

  // Create main icon.png (512x512)
  const mainIconPath = path.join(iconDir, 'icon.png');
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(mainIconPath);
  console.log(`✅ Generated: icon.png (512x512)`);

  // Generate .ico file with multiple sizes (16, 32, 48, 64, 128, 256)
  console.log('\n🔧 Generating .ico file...');
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const icoBuffers = [];

  for (const size of icoSizes) {
    const buffer = await sharp(svgPath)
      .resize(size, size)
      .png()
      .toBuffer();
    icoBuffers.push(buffer);
  }

  const icoBuffer = await toIco(icoBuffers);
  const icoPath = path.join(iconDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`✅ Generated: icon.ico (multi-size: ${icoSizes.join(', ')})`);

  // Create a batch of common .ico sizes for Windows
  console.log('\n💾 Creating ICO-ready PNG files...');
  for (const size of icoSizes) {
    const outputPath = path.join(iconDir, `icon-ico-${size}.png`);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated: icon-ico-${size}.png`);
  }
  // Generate additional sizes for Raspberry Pi 4 / Linux
  const raspSizes = [96, 192, 256, 512];
  console.log('\n🍇 Generating Raspberry Pi optimized icons...');

  for (const size of raspSizes) {
    const outputPath = path.join(iconDir, `icon-raspi-${size}x${size}.png`);

    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated: icon-raspi-${size}x${size}.png`);
  }

  console.log('\n✨ All icons generated successfully!');
  console.log('\n📁 Icon files created in: ' + iconDir);
  console.log('\nIcon sizes generated:');
  console.log('  - PNG: 16, 24, 32, 48, 64, 128, 256, 512, 1024');
  console.log('  - ICO: Multi-size (16, 32, 48, 64, 128, 256)');
  console.log('  - ICO-ready PNGs: 16, 32, 48, 64, 128, 256');
  console.log('  - Raspberry Pi: 96, 192, 256, 512');
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
