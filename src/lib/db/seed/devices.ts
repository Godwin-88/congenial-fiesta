import type { Device } from '@/payload-types'

type SeedDevice = Omit<Device, 'id' | 'createdAt' | 'updatedAt'>

export const seedBrands = [
  {
    name: 'Samsung',
    slug: 'samsung',
    logo: 'https://placehold.co/200x200?text=Samsung',
    website: 'https://samsung.com',
    featured: true,
  },
  {
    name: 'Apple',
    slug: 'apple',
    logo: 'https://placehold.co/200x200?text=Apple',
    website: 'https://apple.com',
    featured: true,
  },
  {
    name: 'Google',
    slug: 'google',
    logo: 'https://placehold.co/200x200?text=Google',
    website: 'https://store.google.com',
    featured: true,
  },
  {
    name: 'Tecno',
    slug: 'tecno',
    logo: 'https://placehold.co/200x200?text=Tecno',
    website: 'https://tecno-mobile.com',
    featured: false,
  },
  {
    name: 'Infinix',
    slug: 'infinix',
    logo: 'https://placehold.co/200x200?text=Infinix',
    website: 'https://infinixmobility.com',
    featured: false,
  },
] as const

function richTextText(text: string): Record<string, unknown> {
  return {
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
              type: 'text',
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
          textFormat: 0,
          textStyle: '',
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

export const seedDevices: SeedDevice[] = [
  // 1. Samsung Galaxy S25 Ultra
  {
    name: 'Galaxy S25 Ultra',
    slug: 'galaxy-s25-ultra',
    brand: 'samsung' as unknown as Device['brand'], // resolved to relationship ID at seed time
    releaseYear: 2025,
    category: 'ultra-premium',
    priceKES: 259999,
    priceUSD: 1299,
    tagline:
      'The ultimate Android flagship with Galaxy AI, S Pen, and a titanium design.',
    status: 'published',
    images: [
      {
        url: 'https://placehold.co/800x1000?text=Galaxy+S25+Ultra',
        alt: 'Samsung Galaxy S25 Ultra in Titanium Gray',
        colour: 'Titanium Gray',
        isPrimary: true,
      },
      {
        url: 'https://placehold.co/800x1000?text=Galaxy+S25+Ultra+White',
        alt: 'Samsung Galaxy S25 Ultra in Titanium White',
        colour: 'Titanium White',
        isPrimary: false,
      },
    ],
    scores: {
      display: 9.5,
      performance: 9.5,
      camera: 9.2,
      battery: 8.5,
      value: 7.0,
      overall: 88,
    },
    verdict: {
      pros: [
        { point: 'Best-in-class display with 2600 nits peak brightness and anti-reflective coating' },
        { point: 'Exynos 2500 / Snapdragon 8 Elite delivers exceptional performance' },
        { point: 'Versatile quad-camera system with 200MP main and improved telephoto' },
        { point: 'S Pen integration and Galaxy AI features are genuinely useful' },
        { point: '7 years of OS and security updates' },
      ],
      cons: [
        { point: 'Extremely expensive — KES 260,000 puts it out of reach for most Kenyans' },
        { point: '45W charging is slow compared to Chinese rivals at half the price' },
        { point: 'Bulky and heavy at 219g — not everyone wants a phablet' },
      ],
      bottomLine:
        'The Galaxy S25 Ultra is the most powerful Android phone money can buy, but its massive price tag makes sense only for power users and creatives — most Kenyans will get better value from the S25+ or a flagship from Xiaomi or Tecno.',
      fullVerdict: richTextText(
        "The Galaxy S25 Ultra continues Samsung's tradition of leaving no box unchecked. The titanium frame feels premium, the Dynamic AMOLED 2X display is simply the best in the business with its anti-reflective coating making outdoor use a joy, and the quad-camera setup covers every focal length from ultrawide to 5x telephoto. Performance is ludicrously fast — the Exynos 2500 in our review unit handled everything we threw at it without breaking a sweat.\n\nWhere it falls short is battery life. Despite a 5000mAh cell, the powerful chipset and high-refresh display mean you'll usually reach for a charger by evening. And 45W charging in 2025 feels dated when competitors offer 100W+. Still, if you want the absolute best Android experience and have the budget, this is it.",
      ),
    },
    specsDesign: {
      dimensions: '162.8 x 77.6 x 8.2 mm',
      weight: '219 g',
      build: 'Titanium frame, Corning Gorilla Armor 2 glass front/back',
      colours: 'Titanium Gray, Titanium White, Titanium Blue, Titanium Black',
      waterResistance: 'IP68 (1.5m for 30 min)',
    },
    specsDisplay: {
      size: '6.9 inches',
      type: 'Dynamic AMOLED 2X',
      resolution: '1440 x 3120 pixels',
      refreshRate: '1-120 Hz adaptive',
      brightness: '2600 nits peak',
      protection: 'Corning Gorilla Armor 2',
    },
    specsProcessor: {
      chipset: 'Exynos 2500 / Snapdragon 8 Elite',
      cpu: 'Deca-core (3.3 GHz)',
      gpu: 'Xclipse 950 / Adreno 830',
      process: '3nm TSMC',
    },
    specsMemory: {
      ram: '12GB / 16GB LPDDR5X',
      storage: '256GB / 512GB / 1TB UFS 4.0',
      expandable: false,
    },
    specsCamera: {
      mainCamera: '200MP f/1.7 OIS',
      ultrawide: '12MP f/2.2 120°',
      telephoto: '10MP f/2.4 3x OIS + 50MP f/3.4 5x OIS',
      videoMain: '8K@30fps, 4K@120fps',
      frontCamera: '12MP f/2.2',
      videoFront: '4K@60fps',
    },
    specsBattery: {
      capacity: '5000 mAh',
      wiredCharging: '45W',
      wirelessCharging: '15W Qi2',
      reverseCharging: '4.5W reverse wireless',
    },
    specsConnectivity: {
      network: '5G Sub-6 + mmWave',
      wifi: 'Wi-Fi 7 (802.11be)',
      bluetooth: 'Bluetooth 5.4',
      nfc: true,
      usb: 'USB 3.2 Gen 2 Type-C',
      satellite: 'Emergency SOS via satellite',
    },
    specsSoftware: {
      os: 'Android 15',
      ui: 'One UI 7.0',
      updatePolicy: '7 years OS + security updates',
    },
    benchmarks: {
      geekbenchSingle: 3100,
      geekbenchMulti: 9800,
      antutu: 2350000,
      pcmark: 18500,
    },
    buyLinks: [
      {
        retailer: 'jumia',
        url: '#',
        price: 'KES 259,999',
      },
      {
        retailer: 'amazon',
        url: '#',
        price: '$1,299',
      },
    ],
    relatedVideo: '',
    relatedTiktok: '',
    seo: {
      metaTitle: 'Samsung Galaxy S25 Ultra Review & Full Specs | FweezyTech',
      metaDescription:
        'In-depth Samsung Galaxy S25 Ultra review by Fweezy. Score: 88/100. Full specs, benchmarks, pros & cons, and best prices in Kenya from KES 259,999.',
    },
  },

  // 2. iPhone 16 Pro Max
  {
    name: 'iPhone 16 Pro Max',
    slug: 'iphone-16-pro-max',
    brand: 'apple' as unknown as Device['brand'],
    releaseYear: 2024,
    category: 'ultra-premium',
    priceKES: 229999,
    priceUSD: 1199,
    tagline:
      'Apple\'s most powerful iPhone with A18 Pro, Camera Control button, and pro-grade video.',
    status: 'published',
    images: [
      {
        url: 'https://placehold.co/800x1000?text=iPhone+16+Pro+Max',
        alt: 'iPhone 16 Pro Max in Natural Titanium',
        colour: 'Natural Titanium',
        isPrimary: true,
      },
    ],
    scores: {
      display: 9.0,
      performance: 9.8,
      camera: 9.5,
      battery: 9.0,
      value: 7.5,
      overall: 91,
    },
    verdict: {
      pros: [
        { point: 'A18 Pro chip is the fastest mobile processor — unmatched raw power' },
        { point: 'ProRes video recording with 4K@120fps — a videographer\'s dream' },
        { point: 'Camera Control button adds tactile photography experience' },
        { point: 'Excellent battery life — easily lasts a full day of heavy use' },
        { point: 'iOS ecosystem integration is seamless for Apple users' },
      ],
      cons: [
        { point: 'iOS is restrictive — no sideloading, customisation limited' },
        { point: 'Charging at 27W is embarrassingly slow at this price point' },
        { point: 'No USB-C fast charging improvements over previous generation' },
      ],
      bottomLine:
        'The iPhone 16 Pro Max is a video creation powerhouse with class-leading performance and battery life, but the slow charging and iOS limitations mean Android flagships offer more flexibility for the same money.',
      fullVerdict: richTextText(
        "The iPhone 16 Pro Max is Apple's most refined phone yet. The A18 Pro chip delivers desktop-class performance that makes everything feel instant, and the 4K@120fps ProRes video recording is genuinely groundbreaking for mobile content creators. The new Camera Control button adds a DSLR-like feel to photography, and battery life is the best we've seen on any iPhone — easy all-day use even with heavy camera work.\n\nBut at KES 230,000, you're paying a premium for the Apple logo. The 27W charging is a joke compared to the 45W+ competition, and iOS 18, while improved, still can't match Android's flexibility. If you're in the Apple ecosystem, this is the best iPhone ever. If you're not, the Galaxy S25 Ultra offers more phone for less money.",
      ),
    },
    specsDesign: {
      dimensions: '163.0 x 77.6 x 8.3 mm',
      weight: '227 g',
      build: 'Titanium frame, textured matte glass back',
      colours: 'Natural Titanium, Desert Titanium, White Titanium, Black Titanium',
      waterResistance: 'IP68 (6m for 30 min)',
    },
    specsDisplay: {
      size: '6.9 inches',
      type: 'LTPO Super Retina XDR OLED',
      resolution: '1320 x 2868 pixels',
      refreshRate: '1-120 Hz ProMotion',
      brightness: '2000 nits peak (outdoor)',
      protection: 'Ceramic Shield 2nd gen',
    },
    specsProcessor: {
      chipset: 'Apple A18 Pro',
      cpu: 'Hexa-core (2x 4.0 GHz + 4x 2.2 GHz)',
      gpu: 'Apple GPU (6-core)',
      process: '3nm TSMC N3E',
    },
    specsMemory: {
      ram: '8GB LPDDR5X',
      storage: '256GB / 512GB / 1TB NVMe',
      expandable: false,
    },
    specsCamera: {
      mainCamera: '48MP f/1.78 OIS',
      ultrawide: '48MP f/2.2 120°',
      telephoto: '12MP f/2.8 5x OIS tetraprism',
      videoMain: '4K@120fps ProRes, 8K@30fps',
      frontCamera: '12MP f/1.9 with autofocus',
      videoFront: '4K@60fps',
    },
    specsBattery: {
      capacity: '4685 mAh',
      wiredCharging: '27W USB-PD',
      wirelessCharging: '15W MagSafe Qi2',
      reverseCharging: '4.5W reverse wired',
    },
    specsConnectivity: {
      network: '5G Sub-6 + mmWave',
      wifi: 'Wi-Fi 7 (802.11be)',
      bluetooth: 'Bluetooth 5.4',
      nfc: true,
      usb: 'USB 3.2 Gen 2 Type-C',
      satellite: 'Emergency SOS via satellite + Messages via satellite',
    },
    specsSoftware: {
      os: 'iOS 18',
      ui: 'iOS 18',
      updatePolicy: '5+ years OS updates',
    },
    benchmarks: {
      geekbenchSingle: 3400,
      geekbenchMulti: 8700,
      antutu: 1950000,
      pcmark: 17800,
    },
    buyLinks: [
      {
        retailer: 'jumia',
        url: '#',
        price: 'KES 229,999',
      },
      {
        retailer: 'amazon',
        url: '#',
        price: '$1,199',
      },
      {
        retailer: 'carrier',
        url: '#',
        price: 'From KES 8,500/mo',
      },
    ],
    relatedVideo: '',
    relatedTiktok: '',
    seo: {
      metaTitle: 'iPhone 16 Pro Max Review & Full Specs | FweezyTech',
      metaDescription:
        'In-depth iPhone 16 Pro Max review by Fweezy. Score: 91/100. Full specs, benchmarks, pros & cons, and best prices in Kenya from KES 229,999.',
    },
  },

  // 3. Google Pixel 9 Pro
  {
    name: 'Pixel 9 Pro',
    slug: 'pixel-9-pro',
    brand: 'google' as unknown as Device['brand'],
    releaseYear: 2024,
    category: 'flagship',
    priceKES: 159999,
    priceUSD: 999,
    tagline:
      'The best camera phone gets Gemini AI smarts and a refined design.',
    status: 'published',
    images: [
      {
        url: 'https://placehold.co/800x1000?text=Pixel+9+Pro',
        alt: 'Google Pixel 9 Pro in Obsidian',
        colour: 'Obsidian',
        isPrimary: true,
      },
    ],
    scores: {
      display: 8.8,
      performance: 8.5,
      camera: 9.8,
      battery: 8.0,
      value: 8.0,
      overall: 86,
    },
    verdict: {
      pros: [
        { point: 'Best smartphone camera — unmatched computational photography' },
        { point: 'Gemini AI features like Call Notes and AI photo editing are genuinely useful' },
        { point: 'Clean, bloat-free Android 15 with guaranteed updates' },
        { point: '7 years of OS, security, and Pixel Feature Drops' },
      ],
      cons: [
        { point: 'Tensor G4 chip lags behind Snapdragon 8 Elite and A18 Pro in raw performance' },
        { point: 'Charging is slow at 27W wired, 12W wireless' },
        { point: 'Availability in Kenya is limited — no official local support' },
      ],
      bottomLine:
        'The Pixel 9 Pro is the phone for photographers and AI enthusiasts. The camera is genuinely class-leading, and Gemini AI features make everyday tasks easier. But the Tensor chip isn\'t a gaming powerhouse, and the lack of official Kenyan support is a concern.',
      fullVerdict: richTextText(
        "The Pixel 9 Pro is Google's most polished phone yet, and it's all about the camera. The 50MP main sensor with Google's computational photography magic produces stunning photos in any lighting — Magic Eraser and Best Take are party tricks that actually work. Gemini AI integration is thoughtful: Call Notes transcribes calls, AI summaries keep you on top of notifications, and the new Pixel Studio generates images on-device.\n\nThe Tensor G4 is fast enough for daily use, but gamers and power users will notice the gap to Snapdragon 8 Elite devices. Battery life is average — you'll make it through a day but not more. The KES 160,000 price is reasonable for what you get, but importing a Pixel to Kenya means no local warranty. Worth it for camera lovers, but most Kenyans should consider Samsung or Tecno flagships instead.",
      ),
    },
    specsDesign: {
      dimensions: '152.8 x 72.0 x 8.5 mm',
      weight: '199 g',
      build: 'Aluminum frame, Gorilla Glass Victus 2 front/back',
      colours: 'Obsidian, Porcelain, Hazel, Rose Quartz',
      waterResistance: 'IP68',
    },
    specsDisplay: {
      size: '6.3 inches',
      type: 'LTPO Super Actua OLED',
      resolution: '1280 x 2856 pixels',
      refreshRate: '1-120 Hz LTPO',
      brightness: '3000 nits peak',
      protection: 'Corning Gorilla Glass Victus 2',
    },
    specsProcessor: {
      chipset: 'Google Tensor G4',
      cpu: 'Octa-core (1x 3.1 GHz + 3x 2.8 GHz + 4x 2.0 GHz)',
      gpu: 'Mali-G715 MP7',
      process: '4nm Samsung',
    },
    specsMemory: {
      ram: '16GB LPDDR5X',
      storage: '128GB / 256GB / 512GB / 1TB UFS 3.1',
      expandable: false,
    },
    specsCamera: {
      mainCamera: '50MP f/1.68 OIS',
      ultrawide: '48MP f/1.7 123°',
      telephoto: '48MP f/2.8 5x OIS',
      videoMain: '4K@60fps HDR, 8K@30fps',
      frontCamera: '42MP f/2.2',
      videoFront: '4K@60fps',
    },
    specsBattery: {
      capacity: '4700 mAh',
      wiredCharging: '27W USB-PD 3.0',
      wirelessCharging: '12W Qi',
      reverseCharging: '5W reverse wireless',
    },
    specsConnectivity: {
      network: '5G Sub-6 + mmWave',
      wifi: 'Wi-Fi 7 (802.11be)',
      bluetooth: 'Bluetooth 5.4',
      nfc: true,
      usb: 'USB 3.2 Gen 2 Type-C',
      satellite: 'Satellite SOS',
    },
    specsSoftware: {
      os: 'Android 15',
      ui: 'Pixel Launcher',
      updatePolicy: '7 years OS + security + Pixel Feature Drops',
    },
    benchmarks: {
      geekbenchSingle: 1950,
      geekbenchMulti: 4650,
      antutu: 1150000,
      pcmark: 12800,
    },
    buyLinks: [
      {
        retailer: 'amazon',
        url: '#',
        price: '$999',
      },
      {
        retailer: 'other',
        url: '#',
        price: 'KES 159,999 (imported)',
      },
    ],
    relatedVideo: '',
    relatedTiktok: '',
    seo: {
      metaTitle: 'Google Pixel 9 Pro Review & Full Specs | FweezyTech',
      metaDescription:
        'In-depth Google Pixel 9 Pro review by Fweezy. Score: 86/100. The best camera phone tested — full specs, benchmarks, pros & cons, and prices in Kenya.',
    },
  },

  // 4. Tecno Phantom V Fold2
  {
    name: 'Phantom V Fold2',
    slug: 'phantom-v-fold2',
    brand: 'tecno' as unknown as Device['brand'],
    releaseYear: 2025,
    category: 'flagship',
    priceKES: 149999,
    priceUSD: 899,
    tagline:
      "Kenya's first affordable foldable flagship — premium design meets local pricing.",
    status: 'published',
    images: [
      {
        url: 'https://placehold.co/800x1000?text=Phantom+V+Fold2',
        alt: 'Tecno Phantom V Fold2 in Karst Green',
        colour: 'Karst Green',
        isPrimary: true,
      },
    ],
    scores: {
      display: 8.0,
      performance: 7.5,
      camera: 7.0,
      battery: 8.5,
      value: 9.0,
      overall: 79,
    },
    verdict: {
      pros: [
        { point: 'Foldable at KES 150,000 — half the price of Samsung Galaxy Z Fold6' },
        { point: 'Large 7.85-inch inner display is great for multitasking and media' },
        { point: 'Excellent battery life with 45W charging' },
        { point: 'Dedicated SD card slot — rare in foldables' },
      ],
      cons: [
        { point: 'Dimensity 9000+ chip is two generations behind flagship silicon' },
        { point: 'Camera system is mediocre — fine for social media, not for serious photography' },
        { point: 'Crease is more visible than Galaxy Z Fold series' },
        { point: 'Software update commitment is unclear (2-3 years?)' },
      ],
      bottomLine:
        'The Phantom V Fold2 makes foldables accessible to Kenyan buyers at KES 150,000. It\'s not as polished as the Galaxy Z Fold6, but at half the price with good battery and a massive screen, it\'s the smart choice for foldable-curious Kenyans.',
      fullVerdict: richTextText(
        "Tecno has done something genuinely important with the Phantom V Fold2: they've made foldables affordable for the Kenyan market. At KES 150,000, it's less than a Galaxy S25 Ultra and half a Galaxy Z Fold6 — yet you get a 7.85-inch inner display that unfolds into a proper tablet experience.\n\nThe compromises are real. The Dimensity 9000+ is a capable chip, but it's not in the same league as the Snapdragon 8 Elite. The cameras are average — the 50MP main takes decent daytime shots but struggles in low light. The crease is noticeable, though less bothersome over time. But here's the thing: for most Kenyans, the foldable experience at this price is a revelation. The battery life is excellent, 45W charging is competitive, and having a microSD slot is genuinely useful. If you want to try a foldable without breaking the bank, this is the one.",
      ),
    },
    specsDesign: {
      dimensions: '159.0 x 72.0 x 14.5 mm (folded), 159.0 x 140.4 x 6.8 mm (unfolded)',
      weight: '290 g',
      build: 'Plastic frame, glass front, eco-leather back',
      colours: 'Karst Green, Astral Black',
      waterResistance: 'None (splash resistant only)',
    },
    specsDisplay: {
      size: '6.42 inches (cover) / 7.85 inches (folded)',
      type: 'AMOLED (both displays)',
      resolution: '1080 x 2550 (cover) / 2000 x 2296 (inner)',
      refreshRate: '120 Hz (both)',
      brightness: '1600 nits peak (inner)',
      protection: 'UTG (inner) / Gorilla Glass 5 (cover)',
    },
    specsProcessor: {
      chipset: 'MediaTek Dimensity 9000+',
      cpu: 'Octa-core (1x 3.2 GHz + 3x 2.85 GHz + 4x 1.8 GHz)',
      gpu: 'Mali-G710 MP10',
      process: '4nm TSMC',
    },
    specsMemory: {
      ram: '12GB LPDDR5X',
      storage: '256GB / 512GB UFS 3.1',
      expandable: true,
    },
    specsCamera: {
      mainCamera: '50MP f/1.9 OIS',
      ultrawide: '50MP f/2.0 115°',
      telephoto: '13MP f/2.4 2x',
      videoMain: '4K@30fps',
      frontCamera: '32MP f/2.5 (cover) + 32MP f/2.5 (inner)',
      videoFront: '1080p@30fps',
    },
    specsBattery: {
      capacity: '5000 mAh',
      wiredCharging: '45W',
      wirelessCharging: '15W',
      reverseCharging: '5W reverse wired',
    },
    specsConnectivity: {
      network: '5G Sub-6',
      wifi: 'Wi-Fi 6 (802.11ax)',
      bluetooth: 'Bluetooth 5.3',
      nfc: true,
      usb: 'USB 2.0 Type-C',
      satellite: '',
    },
    specsSoftware: {
      os: 'Android 15',
      ui: 'HiOS 15',
      updatePolicy: '2 major OS updates, 3 years security',
    },
    benchmarks: {
      geekbenchSingle: 1350,
      geekbenchMulti: 4300,
      antutu: 1020000,
      pcmark: 11500,
    },
    buyLinks: [
      {
        retailer: 'jumia',
        url: '#',
        price: 'KES 149,999',
      },
      {
        retailer: 'kilimall',
        url: '#',
        price: 'KES 145,000',
      },
      {
        retailer: 'carrier',
        url: '#',
        price: 'From KES 5,500/mo',
      },
    ],
    relatedVideo: '',
    relatedTiktok: '',
    seo: {
      metaTitle: 'Tecno Phantom V Fold2 Review & Full Specs | FweezyTech',
      metaDescription:
        'In-depth Tecno Phantom V Fold2 review by Fweezy. Score: 79/100. Kenya\'s most affordable foldable — full specs, benchmarks, pros & cons, and best prices.',
    },
  },

  // 5. Infinix Zero 40 5G
  {
    name: 'Zero 40 5G',
    slug: 'zero-40-5g',
    brand: 'infinix' as unknown as Device['brand'],
    releaseYear: 2025,
    category: 'mid-range',
    priceKES: 49999,
    priceUSD: 299,
    tagline:
      'The budget king returns — 108MP camera, 120Hz AMOLED, and 45W charging at KES 50,000.',
    status: 'published',
    images: [
      {
        url: 'https://placehold.co/800x1000?text=Zero+40+5G',
        alt: 'Infinix Zero 40 5G in Moving Titanium',
        colour: 'Moving Titanium',
        isPrimary: true,
      },
      {
        url: 'https://placehold.co/800x1000?text=Zero+40+5G+Green',
        alt: 'Infinix Zero 40 5G in Dreamy Green',
        colour: 'Dreamy Green',
        isPrimary: false,
      },
    ],
    scores: {
      display: 7.5,
      performance: 6.5,
      camera: 7.0,
      battery: 9.0,
      value: 9.5,
      overall: 76,
    },
    verdict: {
      pros: [
        { point: 'Unbelievable value at KES 50,000 — 108MP camera, 120Hz AMOLED, 5G' },
        { point: '45W charging with charger included — charges 0-70% in 30 minutes' },
        { point: '5000mAh battery easily lasts 1.5-2 days' },
        { point: 'Clean XOS interface with minimal bloatware compared to rivals' },
      ],
      cons: [
        { point: 'Dimensity 7020 chip is fine for daily use but struggles with gaming' },
        { point: '108MP camera is oversampled to 12MP by default — detail is average' },
        { point: 'Build quality is plasticky — no water resistance rating' },
        { point: 'Update policy limited to 1 major OS update, 2 years security' },
      ],
      bottomLine:
        'The Infinix Zero 40 5G is the best phone you can buy under KES 50,000 in Kenya. It\'s not perfect — the camera won\'t compete with flagships — but the 120Hz AMOLED, 45W charging, and all-day battery make it unbeatable value for money.',
      fullVerdict: richTextText(
        "The Infinix Zero 40 5G is exactly what Kenya's smartphone market needs: a genuinely capable phone at an accessible price. At KES 50,000, you get a 120Hz AMOLED display that's buttery smooth, a 108MP camera that takes solid daytime shots, 45W fast charging that fills the 5000mAh battery in under an hour, and 5G connectivity that future-proofs your purchase.\n\nOf course, corners are cut. The MediaTek Dimensity 7020 is fine for WhatsApp, YouTube, and social media, but don't expect to run Genshin Impact at high settings. The 108MP sensor produces 12MP pixel-binned images that are good for the price but not exceptional. And the plastic build won't win any design awards. But here's the thing: for 99% of what Kenyan phone buyers do — browse, chat, take photos for Instagram, watch TikTok — this phone delivers a premium experience at a budget price. The Infinix Zero 40 5G is our pick for the best value phone in Kenya right now, and it's not close.",
      ),
    },
    specsDesign: {
      dimensions: '164.0 x 74.5 x 7.9 mm',
      weight: '186 g',
      build: 'Plastic frame, plastic back, glass front',
      colours: 'Moving Titanium, Dreamy Green, Magic Black',
      waterResistance: 'None (P2i splash resistant coating)',
    },
    specsDisplay: {
      size: '6.78 inches',
      type: 'AMOLED',
      resolution: '1080 x 2436 pixels',
      refreshRate: '120 Hz',
      brightness: '1300 nits peak',
      protection: 'Corning Gorilla Glass 5',
    },
    specsProcessor: {
      chipset: 'MediaTek Dimensity 7020',
      cpu: 'Octa-core (2x 2.2 GHz + 6x 2.0 GHz)',
      gpu: 'IMG BXM-8-256',
      process: '6nm TSMC',
    },
    specsMemory: {
      ram: '8GB LPDDR4X (+ 8GB virtual RAM)',
      storage: '256GB UFS 2.2',
      expandable: true,
    },
    specsCamera: {
      mainCamera: '108MP f/1.75 (pixel-binned to 12MP)',
      ultrawide: '13MP f/2.2 120°',
      telephoto: '',
      videoMain: '2K@30fps, 1080p@60fps',
      frontCamera: '50MP f/2.5',
      videoFront: '1080p@30fps',
    },
    specsBattery: {
      capacity: '5000 mAh',
      wiredCharging: '45W (charger included)',
      wirelessCharging: '',
      reverseCharging: '5W reverse wired',
    },
    specsConnectivity: {
      network: '5G Sub-6',
      wifi: 'Wi-Fi 6 (802.11ax)',
      bluetooth: 'Bluetooth 5.2',
      nfc: true,
      usb: 'USB 2.0 Type-C',
      satellite: '',
    },
    specsSoftware: {
      os: 'Android 15',
      ui: 'XOS 15',
      updatePolicy: '1 major OS update, 2 years security patches',
    },
    benchmarks: {
      geekbenchSingle: 900,
      geekbenchMulti: 2300,
      antutu: 490000,
      pcmark: 8500,
    },
    buyLinks: [
      {
        retailer: 'jumia',
        url: '#',
        price: 'KES 49,999',
      },
      {
        retailer: 'kilimall',
        url: '#',
        price: 'KES 47,500',
      },
    ],
    relatedVideo: '',
    relatedTiktok: '',
    seo: {
      metaTitle: 'Infinix Zero 40 5G Review & Full Specs | FweezyTech',
      metaDescription:
        'In-depth Infinix Zero 40 5G review by Fweezy. Score: 76/100. The best phone under KES 50,000 in Kenya — full specs, benchmarks, pros & cons, and best prices.',
    },
  },
]