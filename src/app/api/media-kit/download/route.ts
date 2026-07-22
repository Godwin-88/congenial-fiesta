import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { pdfRateLimit } from '@/lib/upstash/ratelimit'

const BRAND_PRIMARY = '#0066FF'
const BRAND_AMBER = '#F59E0B'
const BG_DARK = '#111827'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  }
}

export async function GET(request: Request) {
  // Rate limit
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const { success } = await pdfRateLimit.limit(`media-kit:${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    // Fetch active MediaKit from Payload
    let mediaKitData: Record<string, unknown> = {
      shortBio: 'FweezyTech is Kenya\'s #1 tech content creator, delivering honest, in-depth reviews of smartphones, gadgets, and consumer electronics to a growing audience across East Africa.',
      longBio: 'FweezyTech is a premier technology content creator based in Kenya, dedicated to providing honest, thorough, and accessible reviews of smartphones, gadgets, and consumer electronics. With a focus on the East African market, FweezyTech bridges the gap between global tech trends and local relevance, helping consumers make informed purchasing decisions. Known for detailed benchmarks, real-world camera tests, battery life evaluations, and value-for-money analysis, FweezyTech has become the go-to source for tech enthusiasts in Kenya, Uganda, Tanzania, and beyond. Content spans YouTube, TikTok, Instagram, and Facebook, reaching millions of viewers monthly.',
      totalFollowers: '150K+',
      totalViews: '5M+',
      yearsActive: 5,
      youtubeFollowers: '100K',
      tiktokFollowers: '35K',
      instagramFollowers: '10K',
      facebookFollowers: '5K',
    }

    try {
      const { getPayload } = await import('payload')
      const config = (await import('@payload-config')).default
      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: 'media-kit',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { active: { equals: true } } as any,
        limit: 1,
        depth: 0,
      })

      if (result.docs.length > 0) {
        const doc = result.docs[0] as Record<string, unknown>
        mediaKitData = {
          ...mediaKitData,
          ...doc,
        }
      }
    } catch {
      // Use defaults if Payload fetch fails
    }

    const year = new Date().getFullYear()

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)

    // Embed standard fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    const pageWidth = 612 // US Letter
    const pageHeight = 792

    // ── Page 1: Cover ──────────────────────────────────────
    const coverPage = pdfDoc.addPage([pageWidth, pageHeight])
    const { r: bgR, g: bgG, b: bgB } = hexToRgb(BG_DARK)
    const { r: primaryR, g: primaryG, b: primaryB } = hexToRgb(BRAND_PRIMARY)
    const { r: amberR, g: amberG, b: amberB } = hexToRgb(BRAND_AMBER)

    // Background
    coverPage.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(bgR, bgG, bgB),
    })

    // FweezyTech wordmark
    coverPage.drawText('FweezyTech', {
      x: 60,
      y: pageHeight - 200,
      size: 48,
      font: helveticaBold,
      color: rgb(primaryR, primaryG, primaryB),
    })

    // Tagline
    coverPage.drawText("Kenya's #1 Tech Content Creator", {
      x: 60,
      y: pageHeight - 260,
      size: 16,
      font: helvetica,
      color: rgb(amberR, amberG, amberB),
    })

    // Media Kit subtitle
    coverPage.drawText(`Media Kit ${year}`, {
      x: 60,
      y: pageHeight - 300,
      size: 14,
      font: helveticaOblique,
      color: rgb(0.6, 0.6, 0.6),
    })

    // URL at bottom
    const url = process.env.NEXT_PUBLIC_SERVER_URL ?? 'fweezytech.com'
    coverPage.drawText(url, {
      x: 60,
      y: 60,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    })

    // ── Page 2: About & Stats ──────────────────────────────
    const aboutPage = pdfDoc.addPage([pageWidth, pageHeight])
    aboutPage.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(bgR, bgG, bgB),
    })

    aboutPage.drawText('About FweezyTech', {
      x: 60,
      y: pageHeight - 80,
      size: 24,
      font: helveticaBold,
      color: rgb(primaryR, primaryG, primaryB),
    })

    const shortBio = (mediaKitData.shortBio as string) ?? ''
    const bioLines = wrapText(shortBio, 80)
    let bioY = pageHeight - 120
    for (const line of bioLines) {
      aboutPage.drawText(line, {
        x: 60,
        y: bioY,
        size: 11,
        font: helvetica,
        color: rgb(0.85, 0.85, 0.85),
      })
      bioY -= 18
    }

    const statsY = bioY - 40
    const statItems = [
      { label: 'Total Followers', value: String(mediaKitData.totalFollowers ?? '—') },
      { label: 'Total Views', value: String(mediaKitData.totalViews ?? '—') },
      { label: 'Years Active', value: String(mediaKitData.yearsActive ?? '—') },
    ]

    aboutPage.drawText('Stats', {
      x: 60,
      y: statsY,
      size: 18,
      font: helveticaBold,
      color: rgb(amberR, amberG, amberB),
    })

    let statY = statsY - 30
    for (const stat of statItems) {
      aboutPage.drawText(stat.label, {
        x: 60,
        y: statY,
        size: 10,
        font: helvetica,
        color: rgb(0.6, 0.6, 0.6),
      })
      aboutPage.drawText(stat.value, {
        x: 200,
        y: statY,
        size: 12,
        font: helveticaBold,
        color: rgb(primaryR, primaryG, primaryB),
      })
      statY -= 22
    }

    const platformY = statY - 30
    const platforms = [
      { name: 'YouTube', followers: String(mediaKitData.youtubeFollowers ?? '—') },
      { name: 'TikTok', followers: String(mediaKitData.tiktokFollowers ?? '—') },
      { name: 'Instagram', followers: String(mediaKitData.instagramFollowers ?? '—') },
      { name: 'Facebook', followers: String(mediaKitData.facebookFollowers ?? '—') },
    ]

    aboutPage.drawText('Platform Breakdown', {
      x: 60,
      y: platformY,
      size: 18,
      font: helveticaBold,
      color: rgb(amberR, amberG, amberB),
    })

    let pfY = platformY - 30
    for (const pf of platforms) {
      aboutPage.drawText(pf.name, {
        x: 60,
        y: pfY,
        size: 10,
        font: helvetica,
        color: rgb(0.6, 0.6, 0.6),
      })
      aboutPage.drawText(pf.followers, {
        x: 200,
        y: pfY,
        size: 12,
        font: helveticaBold,
        color: rgb(primaryR, primaryG, primaryB),
      })
      pfY -= 22
    }

    // ── Page 3: Brand Assets ───────────────────────────────
    const brandPage = pdfDoc.addPage([pageWidth, pageHeight])
    brandPage.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(bgR, bgG, bgB),
    })

    brandPage.drawText('Brand Assets', {
      x: 60,
      y: pageHeight - 80,
      size: 24,
      font: helveticaBold,
      color: rgb(primaryR, primaryG, primaryB),
    })

    brandPage.drawText('Logos', {
      x: 60,
      y: pageHeight - 120,
      size: 18,
      font: helveticaBold,
      color: rgb(amberR, amberG, amberB),
    })

    const logoUrls = [
      { name: 'Logo Light (PNG)', url: String(mediaKitData.logoLight ?? '—') },
      { name: 'Logo Dark (PNG)', url: String(mediaKitData.logoDark ?? '—') },
      { name: 'Logo Light (SVG)', url: String(mediaKitData.logoSvgLight ?? '—') },
      { name: 'Logo Dark (SVG)', url: String(mediaKitData.logoSvgDark ?? '—') },
    ]

    let logoY = pageHeight - 150
    for (const logo of logoUrls) {
      brandPage.drawText(`${logo.name}:`, {
        x: 60,
        y: logoY,
        size: 10,
        font: helveticaBold,
        color: rgb(0.85, 0.85, 0.85),
      })
      brandPage.drawText(logo.url, {
        x: 220,
        y: logoY,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      })
      logoY -= 16
    }

    brandPage.drawText('Download logos from fweezytech.com/press', {
      x: 60,
      y: logoY - 10,
      size: 10,
      font: helveticaOblique,
      color: rgb(0.6, 0.6, 0.6),
    })

    const coloursY = logoY - 50
    brandPage.drawText('Brand Colours', {
      x: 60,
      y: coloursY,
      size: 18,
      font: helveticaBold,
      color: rgb(amberR, amberG, amberB),
    })

    const defaultColours = [
      { name: 'Electric Blue', hex: '#0066FF', rgb: '0, 102, 255' },
      { name: 'Amber', hex: '#F59E0B', rgb: '245, 158, 11' },
      { name: 'Charcoal', hex: '#111827', rgb: '17, 24, 39' },
      { name: 'White', hex: '#FFFFFF', rgb: '255, 255, 255' },
    ]

    const brandColours = (mediaKitData.brandColours as Array<Record<string, string>>) ?? []
    const colours = brandColours.length > 0
      ? brandColours.map((c) => ({
          name: String(c.name),
          hex: String(c.hex),
          rgb: String(c.rgb ?? '—'),
        }))
      : defaultColours

    let colourY = coloursY - 30
    for (const colour of colours) {
      const { r: swR, g: swG, b: swB } = hexToRgb(colour.hex)
      brandPage.drawRectangle({
        x: 60,
        y: colourY - 10,
        width: 20,
        height: 20,
        color: rgb(swR, swG, swB),
        borderColor: rgb(0.5, 0.5, 0.5),
        borderWidth: 1,
      })

      brandPage.drawText(`${colour.name}: ${colour.hex}`, {
        x: 90,
        y: colourY,
        size: 10,
        font: helvetica,
        color: rgb(0.85, 0.85, 0.85),
      })
      brandPage.drawText(`RGB(${colour.rgb})`, {
        x: 90,
        y: colourY - 14,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      })
      colourY -= 36
    }

    // ── Page 4: Contact ────────────────────────────────────
    const contactPage = pdfDoc.addPage([pageWidth, pageHeight])
    contactPage.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(bgR, bgG, bgB),
    })

    contactPage.drawText("Let's Work Together", {
      x: 60,
      y: pageHeight - 200,
      size: 28,
      font: helveticaBold,
      color: rgb(primaryR, primaryG, primaryB),
    })

    contactPage.drawText('For partnership inquiries visit:', {
      x: 60,
      y: pageHeight - 250,
      size: 14,
      font: helvetica,
      color: rgb(0.85, 0.85, 0.85),
    })

    contactPage.drawText('fweezytech.com/advertise', {
      x: 60,
      y: pageHeight - 275,
      size: 14,
      font: helveticaBold,
      color: rgb(amberR, amberG, amberB),
    })

    const contactEmail = process.env.ADMIN_EMAIL ?? 'hello@fweezytech.com'
    contactPage.drawText(`Email: ${contactEmail}`, {
      x: 60,
      y: pageHeight - 310,
      size: 12,
      font: helvetica,
      color: rgb(0.85, 0.85, 0.85),
    })

    const socialY = pageHeight - 360
    contactPage.drawText('Social', {
      x: 60,
      y: socialY,
      size: 18,
      font: helveticaBold,
      color: rgb(amberR, amberG, amberB),
    })

    const socials = [
      'YouTube: @FweezyTech',
      'TikTok: @fweezytech',
      'Instagram: @fweezytech',
      'Facebook: /FweezyTech',
    ]

    let socY = socialY - 30
    for (const social of socials) {
      contactPage.drawText(social, {
        x: 60,
        y: socY,
        size: 11,
        font: helvetica,
        color: rgb(0.85, 0.85, 0.85),
      })
      socY -= 20
    }

    contactPage.drawText(`Generated by FweezyTech — ${year}`, {
      x: 60,
      y: 60,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Serialize PDF
    const pdfBytes = await pdfDoc.save()

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="FweezyTech-MediaKit-${year}.pdf"`,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(pdfBytes.length),
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).length > maxChars) {
      lines.push(currentLine.trim())
      currentLine = word
    } else {
      currentLine += (currentLine ? ' ' : '') + word
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim())
  }

  return lines
}