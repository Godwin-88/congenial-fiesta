import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'
import { adminOnly, adminOnlyField, adminOrEditor, adminOrSelf, authenticatedRead } from '@/lib/admin/access'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.DATABASE_URL) {
  throw new Error('Missing env var DATABASE_URL')
}

if (!process.env.PAYLOAD_SECRET) {
  throw new Error('Missing env var PAYLOAD_SECRET')
}

if (!process.env.NEXT_PUBLIC_SERVER_URL) {
  throw new Error('Missing env var NEXT_PUBLIC_SERVER_URL')
}

export default buildConfig({
  admin: {
    user: 'users',

    // Custom branding — replaces default Payload logo + name
    meta: {
      titleSuffix: '— FweezyTech CMS',
    },
    components: {
      // Keep existing analytics nav link
      afterNavLinks: ['@/components/admin/AnalyticsNavLink'],

      // Custom dashboard that replaces the default blank screen
      views: {
        Dashboard: {
          Component: '@/components/admin/Dashboard',
        },
      },

      // Brand logo in the sidebar top-left
      graphics: {
        Logo: '@/components/admin/Logo',
        Icon: '@/components/admin/Icon',
      },
    },
  },
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
  collections: [
    // ── Users ──────────────────────────────────────────────
    {
      slug: 'users',
      auth: true,
      admin: {
        useAsTitle: 'email',
        defaultColumns: ['email', 'role', 'createdAt'],
        description: 'CMS staff accounts. Admin role has full access. Editor can create and update content but cannot delete. Viewer is read-only.',
        group: 'Settings',
      },
      access: {
        create: adminOnly,
        read: adminOrSelf,
        update: adminOrSelf,
        delete: adminOnly,
      },
      fields: [
        {
          name: 'role',
          type: 'select',
          options: [
            { label: '👑 Admin — full access', value: 'admin' },
            { label: '✏️ Editor — create and update', value: 'editor' },
            { label: '👁️ Viewer — read only', value: 'viewer' },
          ],
          defaultValue: 'viewer',
          required: true,
          admin: {
            position: 'sidebar',
            description: 'Controls what this user can do in the CMS.',
          },
          // Only admins can change roles
          access: {
            update: adminOnlyField,
          },
        },
        {
          name: 'displayName',
          type: 'text',
          admin: {
            description: 'Name shown in the CMS dashboard greeting.',
          },
        },
      ],
    },

    // ── Brands ──────────────────────────────────────────────
    {
      slug: 'brands',
      admin: {
        group: 'Reviews',
        useAsTitle: 'name',
        defaultColumns: ['name', 'slug'],
        description: 'Phone manufacturers and tech brands featured on the site',
      },
      access: {
        create: adminOrEditor,
        read: authenticatedRead,
        update: adminOrEditor,
        delete: adminOnly,
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          admin: {
            description: 'URL-safe identifier e.g. samsung',
          },
        },
        {
          name: 'logo',
          type: 'text',
          admin: {
            description: 'Cloudflare Images URL for brand logo',
          },
        },
        {
          name: 'website',
          type: 'text',
        },
        {
          name: 'featured',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Show in homepage brand grid',
          },
        },
      ],
    },

    // ── Devices ─────────────────────────────────────────────
    {
      slug: 'devices',
      admin: {
        group: 'Reviews',
        useAsTitle: 'name',
        defaultColumns: ['name', 'brand', 'category', 'status', 'scores.overall', 'releaseYear'],
        description: 'Each device becomes a review page at /devices/{brand}/{slug}. Fill all spec groups for the best user experience.',

        livePreview: {
          url: ({ data }: { data: Record<string, unknown> }) => {
            const brand = typeof data.brand === 'object' && data.brand ? (data.brand as Record<string, unknown>)?.slug as string : data.brand as string
            return `${process.env.NEXT_PUBLIC_SERVER_URL}/devices/${brand}/${data.slug as string}`
          },
          breakpoints: [
            { label: 'Mobile',  name: 'mobile',  width: 390,  height: 844 },
            { label: 'Tablet',  name: 'tablet',  width: 768,  height: 1024 },
            { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
          ],
        },

        preview: (data: Record<string, unknown>) => {
          const brand = typeof data.brand === 'object' && data.brand ? (data.brand as Record<string, unknown>)?.slug as string : data.brand as string
          return `${process.env.NEXT_PUBLIC_SERVER_URL}/devices/${brand}/${data.slug as string}`
        },
      },
      access: {
        create: adminOrEditor,
        read: authenticatedRead,
        update: adminOrEditor,
        delete: adminOnly,
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            if (data.scores) {
              const weights = { display: 0.20, performance: 0.25, camera: 0.25, battery: 0.15, value: 0.15 }
              const overall =
                (data.scores.display * weights.display +
                 data.scores.performance * weights.performance +
                 data.scores.camera * weights.camera +
                 data.scores.battery * weights.battery +
                 data.scores.value * weights.value) * 10
              data.scores.overall = Math.round(overall * 10) / 10
            }
            return data
          },
        ],
        afterChange: [
          async ({ doc }) => {
            const { indexDevice } = await import('@/lib/search/indexing')
            await indexDevice(doc)
          },
        ],
        afterDelete: [
          async ({ doc }) => {
            const { removeFromIndex } = await import('@/lib/search/indexing')
            await removeFromIndex(`device:${doc.slug}`)
          },
        ],
      },
      fields: [
        // ── Identity ──────────────────────────────────────
        { name: 'name', type: 'text', required: true },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          admin: {
            position: 'sidebar',
            description: 'Auto-fill: lowercase, hyphens only. e.g. galaxy-s25-ultra',
          },
        },
        { name: 'brand', type: 'relationship', relationTo: 'brands', required: true },
        { name: 'releaseYear', type: 'number', required: true },
        {
          name: 'category',
          type: 'select',
          required: true,
          options: ['flagship', 'mid-range', 'budget', 'ultra-premium'],
        },
        {
          name: 'priceKES',
          type: 'number',
          admin: { description: 'Launch price in KES' },
        },
        { name: 'priceUSD', type: 'number' },
        {
          name: 'tagline',
          type: 'text',
          admin: { description: 'One-line summary shown on catalogue card' },
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: '📝 Draft — not visible on site', value: 'draft' },
            { label: '✅ Published — live on site', value: 'published' },
          ],
          defaultValue: 'draft',
          required: true,
          admin: {
            description: 'Set to Published when the device page is ready for public viewing.',
            position: 'sidebar',
          },
        },

        // ── Images ────────────────────────────────────────
        {
          name: 'images',
          type: 'array',
          label: '📸 Device Images',
          minRows: 1,
          maxRows: 10,
          admin: {
            description: 'Upload to Cloudflare Images first, then paste the URL here. Mark exactly ONE image as isPrimary — it powers the catalogue card and OG image.',
          },
          fields: [
            { name: 'url', type: 'text', required: true, admin: { description: 'Cloudflare Images URL' } },
            { name: 'alt', type: 'text', required: true },
            { name: 'colour', type: 'text', admin: { description: 'Colour variant label e.g. Phantom Black' } },
            { name: 'isPrimary', type: 'checkbox', defaultValue: false },
          ],
        },

        // ── Fweezy Score ─────────────────────────────────
        {
          name: 'scores',
          type: 'group',
          label: '⭐ Fweezy Score',
          admin: {
            description: 'Rate each dimension 0–10. The Overall score is computed automatically when you save.',
          },
          fields: [
            { name: 'display', type: 'number', min: 0, max: 10, required: true },
            { name: 'performance', type: 'number', min: 0, max: 10, required: true },
            { name: 'camera', type: 'number', min: 0, max: 10, required: true },
            { name: 'battery', type: 'number', min: 0, max: 10, required: true },
            { name: 'value', type: 'number', min: 0, max: 10, required: true },
            { name: 'overall', type: 'number', admin: { readOnly: true, description: 'Auto-computed — do not edit' } },
          ],
        },

        // ── Verdict ───────────────────────────────────────
        {
          name: 'verdict',
          type: 'group',
          label: "Fweezy's Verdict",
          fields: [
            {
              name: 'pros',
              type: 'array',
              maxRows: 5,
              fields: [{ name: 'point', type: 'text', required: true }],
            },
            {
              name: 'cons',
              type: 'array',
              maxRows: 5,
              fields: [{ name: 'point', type: 'text', required: true }],
            },
            {
              name: 'bottomLine',
              type: 'text',
              admin: { description: 'One sentence recommendation' },
            },
            { name: 'fullVerdict', type: 'richText' },
          ],
        },

        // ── Specs: Design ─────────────────────────────────
        {
          name: 'specsDesign',
          type: 'group',
          label: 'Design',
          fields: [
            { name: 'dimensions', type: 'text' },
            { name: 'weight', type: 'text' },
            { name: 'build', type: 'text', admin: { description: 'e.g. Glass front, aluminum frame' } },
            { name: 'colours', type: 'text' },
            { name: 'waterResistance', type: 'text', admin: { description: 'e.g. IP68' } },
          ],
        },

        // ── Specs: Display ────────────────────────────────
        {
          name: 'specsDisplay',
          type: 'group',
          label: 'Display',
          fields: [
            { name: 'size', type: 'text', admin: { description: 'e.g. 6.8 inches' } },
            { name: 'type', type: 'text', admin: { description: 'e.g. Dynamic AMOLED 2X' } },
            { name: 'resolution', type: 'text', admin: { description: 'e.g. 1440 x 3088 pixels' } },
            { name: 'refreshRate', type: 'text', admin: { description: 'e.g. 1-120Hz adaptive' } },
            { name: 'brightness', type: 'text', admin: { description: 'e.g. 2600 nits peak' } },
            { name: 'protection', type: 'text', admin: { description: 'e.g. Gorilla Glass Armor 2' } },
          ],
        },

        // ── Specs: Processor ──────────────────────────────
        {
          name: 'specsProcessor',
          type: 'group',
          label: 'Processor',
          fields: [
            { name: 'chipset', type: 'text', admin: { description: 'e.g. Snapdragon 8 Elite' } },
            { name: 'cpu', type: 'text', admin: { description: 'e.g. Octa-core 4.47 GHz' } },
            { name: 'gpu', type: 'text', admin: { description: 'e.g. Adreno 830' } },
            { name: 'process', type: 'text', admin: { description: 'e.g. 3nm TSMC' } },
          ],
        },

        // ── Specs: Memory ─────────────────────────────────
        {
          name: 'specsMemory',
          type: 'group',
          label: 'Memory',
          fields: [
            { name: 'ram', type: 'text', admin: { description: 'e.g. 12GB LPDDR5X' } },
            { name: 'storage', type: 'text', admin: { description: 'e.g. 256GB / 512GB / 1TB UFS 4.0' } },
            { name: 'expandable', type: 'checkbox', defaultValue: false },
          ],
        },

        // ── Specs: Camera ─────────────────────────────────
        {
          name: 'specsCamera',
          type: 'group',
          label: 'Camera',
          fields: [
            { name: 'mainCamera', type: 'text', admin: { description: 'e.g. 200MP f/1.7 OIS' } },
            { name: 'ultrawide', type: 'text', admin: { description: 'e.g. 12MP f/2.2 120°' } },
            { name: 'telephoto', type: 'text', admin: { description: 'e.g. 10MP f/2.4 3x + 50MP f/3.4 5x' } },
            { name: 'videoMain', type: 'text', admin: { description: 'e.g. 8K@30fps, 4K@120fps' } },
            { name: 'frontCamera', type: 'text', admin: { description: 'e.g. 12MP f/2.2' } },
            { name: 'videoFront', type: 'text', admin: { description: 'e.g. 4K@60fps' } },
          ],
        },

        // ── Specs: Battery ────────────────────────────────
        {
          name: 'specsBattery',
          type: 'group',
          label: 'Battery',
          fields: [
            { name: 'capacity', type: 'text', admin: { description: 'e.g. 5000 mAh' } },
            { name: 'wiredCharging', type: 'text', admin: { description: 'e.g. 45W' } },
            { name: 'wirelessCharging', type: 'text', admin: { description: 'e.g. 15W Qi2' } },
            { name: 'reverseCharging', type: 'text', admin: { description: 'e.g. 4.5W reverse wireless' } },
          ],
        },

        // ── Specs: Connectivity ───────────────────────────
        {
          name: 'specsConnectivity',
          type: 'group',
          label: 'Connectivity',
          fields: [
            { name: 'network', type: 'text', admin: { description: 'e.g. 5G Sub-6 + mmWave' } },
            { name: 'wifi', type: 'text', admin: { description: 'e.g. Wi-Fi 7 (802.11be)' } },
            { name: 'bluetooth', type: 'text', admin: { description: 'e.g. Bluetooth 5.4' } },
            { name: 'nfc', type: 'checkbox', defaultValue: false },
            { name: 'usb', type: 'text', admin: { description: 'e.g. USB 3.2 Gen 2 Type-C' } },
            { name: 'satellite', type: 'text', admin: { description: 'e.g. Emergency SOS via satellite' } },
          ],
        },

        // ── Specs: Software ───────────────────────────────
        {
          name: 'specsSoftware',
          type: 'group',
          label: 'Software',
          fields: [
            { name: 'os', type: 'text', admin: { description: 'e.g. Android 15' } },
            { name: 'ui', type: 'text', admin: { description: 'e.g. One UI 7.0' } },
            { name: 'updatePolicy', type: 'text', admin: { description: 'e.g. 7 years OS + security updates' } },
          ],
        },

        // ── Benchmarks ────────────────────────────────────
        {
          name: 'benchmarks',
          type: 'group',
          label: 'Benchmarks',
          fields: [
            { name: 'geekbenchSingle', type: 'number' },
            { name: 'geekbenchMulti', type: 'number' },
            { name: 'antutu', type: 'number' },
            { name: 'pcmark', type: 'number' },
          ],
        },

        // ── Buy Links ─────────────────────────────────────
        {
          name: 'buyLinks',
          type: 'array',
          label: '🛒 Where to Buy',
          maxRows: 4,
          admin: {
            description: 'Add affiliate links. Always set priceDate so visitors know how current the price is.',
          },
          fields: [
            {
              name: 'retailer',
              type: 'select',
              options: ['jumia', 'amazon', 'kilimall', 'carrier', 'other'],
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              required: true,
              admin: { description: 'Full affiliate URL' },
            },
            { name: 'price', type: 'text', admin: { description: 'e.g. KES 189,000' } },
            { name: 'priceDate', type: 'date' },
          ],
        },

        // ── Related Content ───────────────────────────────
        {
          name: 'relatedVideo',
          type: 'text',
          label: '▶️ YouTube Review Video ID',
          admin: { description: 'Paste the YouTube video ID only (not the full URL). e.g. dQw4w9WgXcQ' },
        },
        {
          name: 'relatedTiktok',
          type: 'text',
          admin: { description: 'TikTok video URL' },
        },

        // ── SEO ───────────────────────────────────────────
        {
          name: 'seo',
          type: 'group',
          label: '🔍 SEO',
          admin: {
            position: 'sidebar',
            description: 'Leave blank to use auto-generated values. Only fill if you want to override the defaults.',
          },
          fields: [
            { name: 'metaTitle', type: 'text' },
            { name: 'metaDescription', type: 'text' },
            { name: 'ogImageUrl', type: 'text' },
          ],
        },
      ],
    },

    // ── Videos ─────────────────────────────────────────────
    {
      slug: 'videos',
      admin: {
        group: 'Content',
        useAsTitle: 'title',
        defaultColumns: ['title', 'platform', 'featured', 'publishedAt', 'viewCount'],
        description: 'Manually add TikTok, Instagram, and Facebook videos here. YouTube videos are auto-fetched from the channel — only add YouTube videos here if you want to feature them manually.',
      },
      access: {
        create: adminOrEditor,
        read: authenticatedRead,
        update: adminOrEditor,
        delete: adminOrEditor,
      },
      hooks: {
        afterChange: [
          async ({ doc }) => {
            const { indexVideo } = await import('@/lib/search/indexing')
            await indexVideo(doc)
          },
        ],
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: ['youtube', 'tiktok', 'instagram', 'facebook'],
        },
        {
          name: 'embedId',
          type: 'text',
          required: true,
          admin: { description: 'YouTube video ID, TikTok video URL, IG reel URL, or FB video URL' },
        },
        {
          name: 'thumbnailUrl',
          type: 'text',
          admin: { description: 'Leave blank for YouTube — auto-fetched. Required for TikTok/IG/FB.' },
        },
        {
          name: 'viewCount',
          type: 'number',
          admin: { description: 'Leave blank for YouTube — auto-fetched via API. Manual for others.' },
        },
        { name: 'duration', type: 'text', admin: { description: 'e.g. 12:34' } },
        { name: 'associatedDevice', type: 'relationship', relationTo: 'devices', hasMany: false },
        { name: 'publishedAt', type: 'date', required: true },
        {
          name: 'featured',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Include in homepage hero carousel' },
        },
      ],
    },

    // ── Articles ───────────────────────────────────────────
    {
      slug: 'articles',
      admin: {
        group: 'Content',
        useAsTitle: 'title',
        defaultColumns: ['title', 'category', 'status', 'publishedAt', 'readingTimeMinutes'],
        description: 'Published articles appear at /articles/{slug} and are indexed for search automatically on save.',

        livePreview: {
          url: ({ data }) =>
            `${process.env.NEXT_PUBLIC_SERVER_URL}/articles/${data.slug}`,
          breakpoints: [
            { label: 'Mobile',  name: 'mobile',  width: 390,  height: 844 },
            { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
          ],
        },

        preview: (data) =>
          `${process.env.NEXT_PUBLIC_SERVER_URL}/articles/${data.slug}`,
      },
      access: {
        create: adminOrEditor,
        read: authenticatedRead,
        update: adminOrEditor,
        delete: adminOnly,
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            // Auto-compute reading time: avg 200 words per minute
            if (data.body) {
              const text = JSON.stringify(data.body)
              const wordCount = text.length / 5
              data.readingTimeMinutes = Math.max(1, Math.round(wordCount / 200))
            }
            return data
          },
        ],
        afterChange: [
          async ({ doc }) => {
            const { indexArticle } = await import('@/lib/search/indexing')
            await indexArticle(doc)
          },
        ],
        afterDelete: [
          async ({ doc }) => {
            const { removeFromIndex } = await import('@/lib/search/indexing')
            await removeFromIndex(`article:${doc.slug}`)
          },
        ],
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          admin: {
            position: 'sidebar',
            description: 'URL path: /articles/{slug}',
          },
        },
        {
          name: 'excerpt',
          type: 'textarea',
          admin: { description: '1-2 sentence summary shown on article cards and in search' },
        },
        {
          name: 'featuredImage',
          type: 'text',
          admin: { description: 'Cloudflare Images URL' },
        },
        {
          name: 'body',
          type: 'richText',
          label: '✍️ Article Body',
          admin: { description: 'Use the Pros/Cons block for verdict sections. Use the Buy Box block for affiliate links inside the article.' },
        },
        {
          name: 'category',
          type: 'select',
          options: ['review', 'comparison', 'news', 'buying-guide', 'opinion'],
        },
        { name: 'associatedDevice', type: 'relationship', relationTo: 'devices', hasMany: false },
        {
          name: 'tags',
          type: 'array',
          fields: [{ name: 'tag', type: 'text' }],
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: '📝 Draft', value: 'draft' },
            { label: '✅ Published', value: 'published' },
          ],
          defaultValue: 'draft',
          admin: { position: 'sidebar' },
        },
        {
          name: 'publishedAt',
          type: 'date',
          admin: {
            position: 'sidebar',
            description: 'Set the publish date. Used for sorting and Schema.org.',
          },
        },
        {
          name: 'readingTimeMinutes',
          type: 'number',
          admin: {
            position: 'sidebar',
            readOnly: true,
            description: 'Auto-computed — leave blank',
          },
        },
        {
          name: 'seo',
          type: 'group',
          label: '🔍 SEO',
          admin: {
            position: 'sidebar',
          },
          fields: [
            { name: 'metaTitle', type: 'text' },
            { name: 'metaDescription', type: 'text' },
          ],
        },
      ],
    },

    // ── Coming Soon ────────────────────────────────────────
    {
      slug: 'coming-soon',
      admin: {
        group: 'Content',
        useAsTitle: 'deviceName',
        defaultColumns: ['deviceName', 'expectedWeek', 'notifyCount'],
        description: 'Tease upcoming devices before they launch — captures email notifications',
      },
      access: {
        create: adminOrEditor,
        read: authenticatedRead,
        update: adminOrEditor,
        delete: adminOrEditor,
      },
      fields: [
        {
          name: 'deviceName',
          type: 'text',
          required: true,
          admin: { description: 'Public name shown on teaser card e.g. "Samsung Galaxy S26"' },
        },
        {
          name: 'silhouetteImage',
          type: 'text',
          admin: { description: 'Cloudflare Images URL — blurred/dark silhouette only, no reveal' },
        },
        {
          name: 'expectedWeek',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "Late January 2026" — shown publicly' },
        },
        {
          name: 'teaser',
          type: 'textarea',
          admin: { description: 'Optional one-liner to build hype without revealing details' },
        },
        {
          name: 'notifyEmails',
          type: 'array',
          admin: {
            description: 'Auto-populated — do not edit. View count in notifyCount field.',
            readOnly: true,
          },
          access: {
            read: adminOnlyField,
            update: adminOnlyField,
          },
          fields: [{ name: 'email', type: 'email' }],
        },
        {
          name: 'notifyCount',
          type: 'number',
          defaultValue: 0,
          admin: {
            position: 'sidebar',
            readOnly: true,
            description: 'Auto-computed count of notify signups',
          },
        },
        {
          name: 'linkedDevice',
          type: 'relationship',
          relationTo: 'devices',
          hasMany: false,
          admin: {
            position: 'sidebar',
            description: 'When you publish the device, set this relationship. The teaser card auto-hides.',
          },
        },
        {
          name: 'active',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            position: 'sidebar',
            description: 'Uncheck to hide without deleting',
          },
        },
      ],
    },

    // ── Media ─────────────────────────────────────────────
    {
      slug: 'media',
      admin: {
        group: 'Settings',
        description: 'Upload and manage images and files used across the site',
      },
      access: {
        create: adminOrEditor,
        read: authenticatedRead,
        update: adminOrEditor,
        delete: adminOnly,
      },
      upload: {
        staticDir: path.resolve(dirname, '../../public/media'),
      },
      fields: [],
    },

    // ── Sponsors (past brand partners showcase) ────────────
    {
      slug: 'sponsors',
      admin: {
        group: 'Brand',
        useAsTitle: 'companyName',
        defaultColumns: ['companyName', 'active'],
        description: 'Past and current brand partners showcased on the site',
      },
      access: {
        create: adminOnly,
        read: authenticatedRead,
        update: adminOnly,
        delete: adminOnly,
      },
      fields: [
        { name: 'companyName', type: 'text', required: true },
        {
          name: 'logo', type: 'text', required: true,
          admin: { description: 'Cloudflare Images URL — use transparent PNG, min 300px wide' },
        },
        { name: 'website', type: 'text' },
        {
          name: 'associatedVideo', type: 'text',
          admin: { description: 'YouTube video ID for the sponsored content' },
        },
        {
          name: 'partnershipType', type: 'select',
          options: ['shoutout', 'dedicated-video', 'full-campaign', 'product-seeding'],
        },
        {
          name: 'displayOrder', type: 'number', defaultValue: 0,
          admin: { description: 'Lower = shown first in logo grid' },
        },
        {
          name: 'active', type: 'checkbox', defaultValue: true,
          admin: { description: 'Uncheck to hide without deleting' },
        },
      ],
    },

    // ── Sponsorship Packages (three-tier cards) ────────────
    {
      slug: 'sponsorship-packages',
      admin: {
        group: 'Brand',
        useAsTitle: 'name',
        defaultColumns: ['name', 'tier'],
        description: 'Three-tier pricing cards shown on the Advertise page',
      },
      access: {
        create: adminOnly,
        read: authenticatedRead,
        update: adminOnly,
        delete: adminOnly,
      },
      fields: [
        {
          name: 'name', type: 'text', required: true,
          admin: { description: 'e.g. "Shoutout" / "Dedicated Video" / "Full Campaign"' },
        },
        { name: 'tier', type: 'select', required: true, options: ['starter', 'pro', 'premium'] },
        { name: 'description', type: 'textarea', required: true },
        {
          name: 'deliverables', type: 'array',
          fields: [{ name: 'item', type: 'text', required: true }],
        },
        {
          name: 'highlighted', type: 'checkbox', defaultValue: false,
          admin: { description: 'Renders with brand accent border — use for recommended tier' },
        },
        { name: 'displayOrder', type: 'number', defaultValue: 0 },
      ],
    },

    // ── Milestones ──────────────────────────────────────────
    {
      slug: 'milestones',
      admin: {
        group: 'Brand',
        useAsTitle: 'title',
        defaultColumns: ['year', 'title'],
        description: 'Company timeline milestones shown on the About page',
      },
      access: {
        create: adminOnly,
        read: authenticatedRead,
        update: adminOnly,
        delete: adminOnly,
      },
      fields: [
        {
          name: 'year',
          type: 'number',
          required: true,
          admin: { description: 'e.g. 2021' },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "Hit 100K subscribers on YouTube"' },
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'displayOrder',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Lower = shown first. Use for ordering within same year.' },
        },
      ],
    },

    // ── Awards ──────────────────────────────────────────────
    {
      slug: 'awards',
      admin: {
        group: 'Brand',
        useAsTitle: 'awardName',
        defaultColumns: ['awardName', 'awardingBody', 'year'],
        description: 'Awards and recognitions received by FweezyTech',
      },
      access: {
        create: adminOnly,
        read: authenticatedRead,
        update: adminOnly,
        delete: adminOnly,
      },
      fields: [
        {
          name: 'awardName',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "Best Tech Creator — Kenya Digital Awards 2024"' },
        },
        {
          name: 'awardingBody',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "Kenya Digital Awards"' },
        },
        { name: 'year', type: 'number', required: true },
        {
          name: 'certificateImageUrl',
          type: 'text',
          admin: { description: 'Cloudflare Images URL of certificate scan or award badge' },
        },
        {
          name: 'awardUrl',
          type: 'text',
          admin: { description: 'Link to announcement or award body website' },
        },
        {
          name: 'displayOrder',
          type: 'number',
          defaultValue: 0,
        },
      ],
    },

    // ── Media Kit ─────────────────────────────────────────
    {
      slug: 'media-kit',
      admin: {
        group: 'Brand',
        useAsTitle: 'label',
        defaultColumns: ['label', 'active'],
        description: 'Press kit content — bios, logos, headshots, and brand colours',
      },
      access: {
        create: adminOnly,
        read: authenticatedRead,
        update: adminOnly,
        delete: adminOnly,
      },
      fields: [
        {
          name: 'label', type: 'text', required: true,
          admin: { description: 'Internal label — not shown publicly' },
        },
        {
          name: 'shortBio', type: 'textarea', required: true,
          admin: { description: 'Max 100 words — shown on /press with Copy button' },
        },
        {
          name: 'longBio', type: 'textarea', required: true,
          admin: { description: 'Max 300 words — shown on /press with Copy button' },
        },
        {
          name: 'totalFollowers', type: 'text',
          admin: { description: 'e.g. "850K+" — manually updated' },
        },
        {
          name: 'totalViews', type: 'text',
          admin: { description: 'e.g. "12M+" — manually updated' },
        },
        { name: 'yearsActive', type: 'number' },
        { name: 'youtubeFollowers', type: 'text' },
        { name: 'tiktokFollowers', type: 'text' },
        { name: 'instagramFollowers', type: 'text' },
        { name: 'facebookFollowers', type: 'text' },
        {
          name: 'logoLight', type: 'text',
          admin: { description: 'Cloudflare Images URL — light variant PNG' },
        },
        {
          name: 'logoDark', type: 'text',
          admin: { description: 'Cloudflare Images URL — dark variant PNG' },
        },
        {
          name: 'logoSvgLight', type: 'text',
          admin: { description: 'Cloudflare Images URL — light variant SVG' },
        },
        {
          name: 'logoSvgDark', type: 'text',
          admin: { description: 'Cloudflare Images URL — dark variant SVG' },
        },
        {
          name: 'headshots', type: 'array', maxRows: 4,
          fields: [
            { name: 'url', type: 'text', required: true },
            { name: 'label', type: 'text', admin: { description: 'e.g. "Studio headshot 2025"' } },
          ],
        },
        {
          name: 'brandColours', type: 'array',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'hex', type: 'text', required: true },
            { name: 'rgb', type: 'text' },
            { name: 'cmyk', type: 'text' },
          ],
        },
        {
          name: 'active', type: 'checkbox', defaultValue: true,
          admin: { description: 'Only one MediaKit record should be active at a time' },
        },
      ],
    },
  ],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    },
    push: true,
  }),
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  graphQL: {
    disable: true,
  },
})
