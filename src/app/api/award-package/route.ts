import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getUser } from '@/lib/auth/actions'
import { pdfRateLimit } from '@/lib/upstash/ratelimit'

export const runtime = 'nodejs'

async function getTopDevices(limit: number) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'devices',
    where: { status: { equals: 'published' } },
    sort: '-scores.overall',
    limit,
  })
  return result.docs.map((d) => ({
    name: String(d.name ?? ''),
    score: d.scores?.overall ?? null,
  }))
}

async function getTotalPageViews() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    return data?.length ?? 0
  } catch {
    return 0
  }
}

export async function GET() {
  // Auth check
  const user = await getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || user?.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const ip = 'admin'
  const { success } = await pdfRateLimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const payload = await getPayload({ config })

    const [mediaKitResult, awards, milestones, topDevices, totalViews] = await Promise.all([
      payload.find({ collection: 'media-kit', where: { active: { equals: true } }, limit: 1 }).catch(() => ({ docs: [] })),
      payload.find({ collection: 'awards', sort: '-year', limit: 20 }).catch(() => ({ docs: [] })),
      payload.find({ collection: 'milestones', sort: '-year,displayOrder', limit: 20 }).catch(() => ({ docs: [] })),
      getTopDevices(5),
      getTotalPageViews(),
    ])

    const mediaKit = mediaKitResult.docs[0] || null
    const year = new Date().getFullYear()

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier)

    // Helper: add page with letterhead
    function addPage() {
      const page = pdfDoc.addPage([612, 792]) // US Letter
      // Dark header bar
      page.drawRectangle({
        x: 0, y: 750, width: 612, height: 42,
        color: rgb(0.07, 0.09, 0.15),
      })
      page.drawText('FWEEZYTECH', {
        x: 40, y: 762, size: 14, font: fontBold, color: rgb(0.38, 0.4, 1),
      })
      page.drawText('Award Submission Package', {
        x: 300, y: 762, size: 10, font: font,
        color: rgb(0.6, 0.63, 0.67),
      })
      return page
    }

    // Page 1 — Cover
    const cover = addPage()
    cover.drawText('AWARD SUBMISSION PACKAGE', {
      x: 40, y: 600, size: 28, font: fontBold, color: rgb(0.07, 0.09, 0.15),
    })
    cover.drawText(`Prepared: ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
      x: 40, y: 560, size: 14, font: font, color: rgb(0.4, 0.4, 0.4),
    })
    cover.drawText('fweezytech.com', {
      x: 40, y: 530, size: 12, font: fontMono, color: rgb(0.3, 0.3, 0.3),
    })
    // Accent line
    cover.drawRectangle({
      x: 40, y: 510, width: 200, height: 3,
      color: rgb(0.38, 0.4, 1),
    })

    // Page 2 — Creator Profile
    const profile = addPage()
    let yPos = 700
    profile.drawText('About FweezyTech', {
      x: 40, y: yPos, size: 20, font: fontBold, color: rgb(0.07, 0.09, 0.15),
    })
    yPos -= 30
    profile.drawText(mediaKit?.shortBio?.slice(0, 300) ?? "Kenya's premier tech review platform.", {
      x: 40, y: yPos, size: 11, font: font, color: rgb(0.3, 0.3, 0.3),
      maxWidth: 530, lineHeight: 16,
    })
    yPos -= 60

    // Platform reach table
    profile.drawText('Platform Reach', {
      x: 40, y: yPos, size: 16, font: fontBold, color: rgb(0.07, 0.09, 0.15),
    })
    yPos -= 25

    const platforms = [
      ['Platform', 'Followers'],
      ['YouTube', mediaKit?.youtubeFollowers ?? '—'],
      ['TikTok', mediaKit?.tiktokFollowers ?? '—'],
      ['Instagram', mediaKit?.instagramFollowers ?? '—'],
      ['Facebook', mediaKit?.facebookFollowers ?? '—'],
      ['Total', mediaKit?.totalFollowers ?? '—'],
    ]

    for (const row of platforms) {
      profile.drawText(row[0], { x: 40, y: yPos, size: 11, font: row[0] === 'Platform' ? fontBold : font, color: rgb(0.2, 0.2, 0.2) })
      profile.drawText(row[1], { x: 200, y: yPos, size: 11, font: row[1] === 'Followers' ? fontBold : font, color: rgb(0.2, 0.2, 0.2) })
      yPos -= 18
    }

    yPos -= 20
    if (mediaKit?.yearsActive) {
      profile.drawText(`Years Active: ${mediaKit.yearsActive}`, {
        x: 40, y: yPos, size: 11, font: font, color: rgb(0.3, 0.3, 0.3),
      })
    }

    // Page 3 — Content Achievement
    const content = addPage()
    yPos = 700
    content.drawText('Content Portfolio', {
      x: 40, y: yPos, size: 20, font: fontBold, color: rgb(0.07, 0.09, 0.15),
    })
    yPos -= 30

    content.drawText('Top Reviewed Devices:', {
      x: 40, y: yPos, size: 14, font: fontBold, color: rgb(0.2, 0.2, 0.2),
    })
    yPos -= 22

    for (const device of topDevices) {
      const scoreText = device.score ? `Fweezy Score: ${device.score}/100` : ''
      content.drawText(`${device.name} ${scoreText ? '- ' + scoreText : ''}`, {
        x: 50, y: yPos, size: 11, font: font, color: rgb(0.3, 0.3, 0.3),
      })
      yPos -= 18
    }

    yPos -= 20
    content.drawText(`Site Analytics (Last 90 Days):`, {
      x: 40, y: yPos, size: 14, font: fontBold, color: rgb(0.2, 0.2, 0.2),
    })
    yPos -= 22
    content.drawText(`Page Views: ${totalViews.toLocaleString()}`, {
      x: 50, y: yPos, size: 11, font: font, color: rgb(0.3, 0.3, 0.3),
    })

    // Page 4 — Milestones
    const milePage = addPage()
    yPos = 700
    milePage.drawText('Journey & Achievements', {
      x: 40, y: yPos, size: 20, font: fontBold, color: rgb(0.07, 0.09, 0.15),
    })
    yPos -= 30

    for (const m of milestones.docs) {
      const title = String(m.title ?? '')
      milePage.drawText(`${m.year} — ${title}`, {
        x: 45, y: yPos, size: 11, font: font, color: rgb(0.3, 0.3, 0.3),
        maxWidth: 520, lineHeight: 15,
      })
      yPos -= 20
      if (yPos < 50) break
    }

    // Page 5 — Awards History
    const awardPage = addPage()
    yPos = 700
    awardPage.drawText('Awards History', {
      x: 40, y: yPos, size: 20, font: fontBold, color: rgb(0.07, 0.09, 0.15),
    })
    yPos -= 30

    if (awards.docs.length > 0) {
      for (const a of awards.docs) {
        awardPage.drawText(`${a.year} — ${a.awardName} (${a.awardingBody})`, {
          x: 45, y: yPos, size: 11, font: font, color: rgb(0.3, 0.3, 0.3),
          maxWidth: 520, lineHeight: 15,
        })
        yPos -= 20
        if (yPos < 50) break
      }
    } else {
      awardPage.drawText('First award submission — building our track record.', {
        x: 45, y: yPos, size: 12, font: font, color: rgb(0.5, 0.5, 0.5),
      })
    }

    // Page 6 — Contact
    const contact = addPage()
    yPos = 700
    contact.drawText('Contact Information', {
      x: 40, y: yPos, size: 20, font: fontBold, color: rgb(0.07, 0.09, 0.15),
    })
    yPos -= 30
    const contactLines = [
      'Name: Fweezy',
      'Website: https://fweezytech.com',
      'YouTube: https://www.youtube.com/@fweezytech',
      'TikTok: https://www.tiktok.com/@fweezytech',
      'Instagram: https://www.instagram.com/fweezytech',
      'Facebook: https://www.facebook.com/fweezytech',
      'Email: hello@fweezytech.com',
    ]
    for (const line of contactLines) {
      contact.drawText(line, {
        x: 45, y: yPos, size: 11, font: font, color: rgb(0.3, 0.3, 0.3),
      })
      yPos -= 18
    }

    const pdfBytes = await pdfDoc.save()
    const pdfBuffer = Buffer.from(pdfBytes)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="FweezyTech-Award-Submission-${year}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('Award package error:', error)
    return NextResponse.json({ error: 'Failed to generate package' }, { status: 500 })
  }
}