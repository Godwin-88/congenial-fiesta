import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

function baseSvg(size: number) {
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#0066FF"/>
  <text
    x="50%" y="56%"
    font-family="Arial, sans-serif"
    font-weight="bold"
    font-size="${size * 0.55}"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
  >F</text>
</svg>`
}

function screenshotSvg(label: string) {
  return `
<svg width="390" height="844" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="844" fill="#111827"/>
  <rect x="0" y="0" width="390" height="3" fill="#0066FF"/>
  <text
    x="195" y="422"
    font-family="Arial, sans-serif"
    font-weight="bold"
    font-size="24"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
  >${label}</text>
  <text
    x="195" y="460"
    font-family="Arial, sans-serif"
    font-size="14"
    fill="#9CA3AF"
    text-anchor="middle"
    dominant-baseline="middle"
  >fweezytech.com</text>
</svg>`
}

async function generateIcons() {
  const outputDir = path.resolve('public/icons')
  fs.mkdirSync(outputDir, { recursive: true })

  for (const size of sizes) {
    await sharp(Buffer.from(baseSvg(size)))
      .png()
      .toFile(path.join(outputDir, `icon-${size}.png`))
    console.log(`✅ Generated icon-${size}.png`)
  }

  // Also generate favicon.png (48x48)
  await sharp(Buffer.from(baseSvg(48)))
    .png()
    .toFile(path.join('public', 'favicon.png'))
  console.log('✅ Generated favicon.png')

  // Generate screenshots
  const screenshotsDir = path.resolve('public/screenshots')
  fs.mkdirSync(screenshotsDir, { recursive: true })

  await sharp(Buffer.from(screenshotSvg('FweezyTech - Homepage')))
    .png()
    .toFile(path.join(screenshotsDir, 'home-mobile.png'))
  console.log('✅ Generated screenshots/home-mobile.png')

  await sharp(Buffer.from(screenshotSvg('FweezyTech - Device Review')))
    .png()
    .toFile(path.join(screenshotsDir, 'device-mobile.png'))
  console.log('✅ Generated screenshots/device-mobile.png')
}

generateIcons().catch(console.error)