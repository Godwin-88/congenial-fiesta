-- ============================================================
-- FweezyTech Devices Seed — Phones Batch 1 (Migration 025)
-- Sources: GSMArena, PhoneArena, iTechGuides, Smartprix (2024-2025)
-- Status: 'draft' (matches MobileAPI ingestion convention)
-- Scores: 0 — to be filled via CMS Fweezy Score editor
-- Run brands first, then devices. Devices upsert on slug (re-runnable).
-- ============================================================

-- ─────────────────────────────────────────────
-- BRANDS (upsert-safe)
-- ─────────────────────────────────────────────
INSERT INTO brands (name, slug, featured)
VALUES
  ('Samsung',  'samsung',  true),
  ('Apple',    'apple',    true),
  ('Tecno',    'tecno',    true),
  ('Infinix',  'infinix',  true),
  ('Xiaomi',   'xiaomi',   true)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- SAMSUNG
-- ═══════════════════════════════════════════════════════════

-- 1. Samsung Galaxy S25 Ultra (Flagship)
INSERT INTO devices (
  name, slug, brand_id, release_year, price_tier, major_category, device_type_id,
  price_usd, tagline, status,
  score_display, score_performance, score_camera, score_battery, score_value, scores_overall,
  specs_display, specs_design, specs_processor, specs_memory, specs_camera,
  specs_battery, specs_connectivity, specs_software, specs_network
)
VALUES (
  'Samsung Galaxy S25 Ultra',
  'samsung-galaxy-s25-ultra',
  (SELECT id FROM brands WHERE slug = 'samsung'),
  2025,
  'flagship',
  'phones',
  (SELECT id FROM device_types WHERE slug = 'phone'),
  1299,
  'Samsung''s 2025 titan — Snapdragon 8 Elite, 200MP quad-camera, built-in S Pen, and seven years of OS updates.',
  'draft',
  0, 0, 0, 0, 0, 0,
  '{"Size": "6.9 inches", "Type": "Dynamic AMOLED 2X", "Resolution": "3088 x 1440 px (QHD+)", "Refresh Rate": "1-120 Hz adaptive", "Pixel Density": "503 PPI", "Screen-to-body ratio": "91.7%", "Peak Brightness": "2600 nits", "HDR": "HDR10+", "Color depth": "16M", "Protection": "Corning Gorilla Armor 2"}',
  '{"Dimensions": "162.8 x 77.6 x 8.2 mm", "Weight": "218 g", "Build": "Titanium frame, Gorilla Armor 2 glass front and back", "SIM": "Nano-SIM + eSIM", "Colours": "Titanium Silverblue, Titanium Black, Titanium Gray, Titanium Whitesilver", "IP Rating": "IP68", "Ports": "USB Type-C 3.2 Gen 2", "Speakers": "Stereo", "3.5mm jack": "No"}',
  '{"Chipset": "Snapdragon 8 Elite for Galaxy (3 nm)", "CPU": "Octa-core (2x4.47 GHz Oryon V2 + 6x3.53 GHz Oryon V2)", "GPU": "Adreno 830", "Node size": "3 nm", "NPU": "Hexagon NPU"}',
  '{"RAM": "12 GB", "RAM type": "LPDDR5X", "Storage": "256 GB / 512 GB / 1 TB", "Storage type": "UFS 4.0", "Expandable": "No"}',
  '{"rear": [{"type": "Wide (main)", "sensorType": "200 MP, f/1.7, OIS, PDAF"}, {"type": "Ultrawide", "sensorType": "50 MP, f/1.9, AF"}, {"type": "Periscope telephoto (5x)", "sensorType": "50 MP, f/3.4, OIS"}, {"type": "Telephoto (3x)", "sensorType": "10 MP, f/2.4, OIS"}], "selfie": {"type": "Wide", "sensorType": "12 MP, f/2.2"}, "video": "8K@30fps, 4K@120fps", "extras": "Night mode, Expert RAW, ProVideo, AI photo editing"}',
  '{"Capacity": "5000 mAh", "Battery type": "Li-Ion", "Wired charging": "45W", "Wireless charging": "15W Qi2", "Reverse charging": "Yes (4.5W)", "Charging protocols": "USB PD 3.0, PPS"}',
  '{"WiFi": "Wi-Fi 7 (802.11 be)", "Bluetooth": "5.4", "NFC": "Yes", "USB": "USB-C 3.2 Gen 2", "Positioning": "GPS, GLONASS, BeiDou, Galileo", "IR blaster": "No"}',
  '{"OS": "Android 15", "UI layer": "One UI 7", "Major OS upgrades": "7", "Security patches": "7 years"}',
  '{"SIM": "Nano-SIM + eSIM", "Technology": "GSM / HSPA / LTE / 5G", "2G": "GSM 850/900/1800/1900", "3G": "HSDPA 850/900/1700/1900/2100", "4G": "LTE (bands vary by region)", "5G": "Sub-6 GHz + mmWave (US)"}'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Samsung Galaxy S25+ (Flagship)
INSERT INTO devices (
  name, slug, brand_id, release_year, price_tier, major_category, device_type_id,
  price_usd, tagline, status,
  score_display, score_performance, score_camera, score_battery, score_value, scores_overall,
  specs_display, specs_design, specs_processor, specs_memory, specs_camera,
  specs_battery, specs_connectivity, specs_software, specs_network
)
VALUES (
  'Samsung Galaxy S25+',
  'samsung-galaxy-s25-plus',
  (SELECT id FROM brands WHERE slug = 'samsung'),
  2025,
  'flagship',
  'phones',
  (SELECT id FROM device_types WHERE slug = 'phone'),
  999,
  'The sweet-spot S25 — larger 6.7-inch display, Snapdragon 8 Elite, and a 4900 mAh battery without the Ultra''s bulk.',
  'draft',
  0, 0, 0, 0, 0, 0,
  '{"Size": "6.7 inches", "Type": "Dynamic AMOLED 2X", "Resolution": "3088 x 1440 px (QHD+)", "Refresh Rate": "1-120 Hz adaptive", "Pixel Density": "505 PPI", "Screen-to-body ratio": "91.5%", "Peak Brightness": "2600 nits", "HDR": "HDR10+", "Color depth": "16M", "Protection": "Corning Gorilla Glass Victus 2"}',
  '{"Dimensions": "158.5 x 75.8 x 7.3 mm", "Weight": "190 g", "Build": "Aluminum frame, Gorilla Glass Victus 2", "SIM": "Nano-SIM + eSIM", "Colours": "Icy Blue, Mint, Navy, Silver Shadow", "IP Rating": "IP68", "Ports": "USB Type-C 3.2 Gen 2", "Speakers": "Stereo", "3.5mm jack": "No"}',
  '{"Chipset": "Snapdragon 8 Elite for Galaxy (3 nm)", "CPU": "Octa-core (2x4.47 GHz Oryon V2 + 6x3.53 GHz Oryon V2)", "GPU": "Adreno 830", "Node size": "3 nm", "NPU": "Hexagon NPU"}',
  '{"RAM": "12 GB", "RAM type": "LPDDR5X", "Storage": "256 GB / 512 GB", "Storage type": "UFS 4.0", "Expandable": "No"}',
  '{"rear": [{"type": "Wide (main)", "sensorType": "50 MP, f/1.8, OIS, PDAF"}, {"type": "Ultrawide", "sensorType": "12 MP, f/2.2"}, {"type": "Telephoto (3x)", "sensorType": "10 MP, f/2.4, OIS"}], "selfie": {"type": "Wide", "sensorType": "12 MP, f/2.2"}, "video": "8K@30fps, 4K@60fps", "extras": "Night mode, ProVideo, AI photo editing"}',
  '{"Capacity": "4900 mAh", "Battery type": "Li-Ion", "Wired charging": "45W", "Wireless charging": "15W Qi2", "Reverse charging": "Yes (4.5W)", "Charging protocols": "USB PD 3.0, PPS"}',
  '{"WiFi": "Wi-Fi 7 (802.11 be)", "Bluetooth": "5.4", "NFC": "Yes", "USB": "USB-C 3.2 Gen 2", "Positioning": "GPS, GLONASS, BeiDou, Galileo", "IR blaster": "No"}',
  '{"OS": "Android 15", "UI layer": "One UI 7", "Major OS upgrades": "7", "Security patches": "7 years"}',
  '{"SIM": "Nano-SIM + eSIM", "Technology": "GSM / HSPA / LTE / 5G", "2G": "GSM 850/900/1800/1900", "3G": "HSDPA", "4G": "LTE", "5G": "Sub-6 GHz + mmWave (US)"}'
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Samsung Galaxy S25 (Flagship)
INSERT INTO devices (
  name, slug, brand_id, release_year, price_tier, major_category, device_type_id,
  price_usd, tagline, status,
  score_display, score_performance, score_camera, score_battery, score_value, scores_overall,
  specs_display, specs_design, specs_processor, specs_memory, specs_camera,
  specs_battery, specs_connectivity, specs_software, specs_network
)
VALUES (
  'Samsung Galaxy S25',
  'samsung-galaxy-s25',
  (SELECT id FROM brands WHERE slug = 'samsung'),
  2025,
  'flagship',
  'phones',
  (SELECT id FROM device_types WHERE slug = 'phone'),
  799,
  'Compact Snapdragon 8 Elite flagship in a 162g body — entry point to Samsung''s Galaxy AI ecosystem.',
  'draft',
  0, 0, 0, 0, 0, 0,
  '{"Size": "6.2 inches", "Type": "Dynamic AMOLED 2X", "Resolution": "2340 x 1080 px (FHD+)", "Refresh Rate": "1-120 Hz adaptive", "Pixel Density": "416 PPI", "Screen-to-body ratio": "90.6%", "Peak Brightness": "2600 nits", "HDR": "HDR10+", "Color depth": "16M", "Protection": "Corning Gorilla Glass Victus 2"}',
  '{"Dimensions": "146.9 x 70.5 x 7.2 mm", "Weight": "162 g", "Build": "Aluminum frame, Gorilla Glass Victus 2", "SIM": "Nano-SIM + eSIM", "Colours": "Icy Blue, Mint, Navy, Silver Shadow", "IP Rating": "IP68", "Ports": "USB Type-C 3.2 Gen 2", "Speakers": "Stereo", "3.5mm jack": "No"}',
  '{"Chipset": "Snapdragon 8 Elite for Galaxy (3 nm)", "CPU": "Octa-core (2x4.47 GHz Oryon V2 + 6x3.53 GHz Oryon V2)", "GPU": "Adreno 830", "Node size": "3 nm", "NPU": "Hexagon NPU"}',
  '{"RAM": "12 GB", "RAM type": "LPDDR5X", "Storage": "128 GB / 256 GB", "Storage type": "UFS 4.0", "Expandable": "No"}',
  '{"rear": [{"type": "Wide (main)", "sensorType": "50 MP, f/1.8, OIS, PDAF"}, {"type": "Ultrawide", "sensorType": "12 MP, f/2.2"}, {"type": "Telephoto (3x)", "sensorType": "10 MP, f/2.4, OIS"}], "selfie": {"type": "Wide", "sensorType": "12 MP, f/2.2"}, "video": "8K@30fps, 4K@60fps", "extras": "Night mode, ProVideo, Galaxy AI"}',
  '{"Capacity": "4000 mAh", "Battery type": "Li-Ion", "Wired charging": "25W", "Wireless charging": "15W Qi2", "Reverse charging": "Yes (4.5W)", "Charging protocols": "USB PD 3.0, PPS"}',
  '{"WiFi": "Wi-Fi 7 (802.11 be)", "Bluetooth": "5.4", "NFC": "Yes", "USB": "USB-C 3.2 Gen 2", "Positioning": "GPS, GLONASS, BeiDou, Galileo", "IR blaster": "No"}',
  '{"OS": "Android 15", "UI layer": "One UI 7", "Major OS upgrades": "7", "Security patches": "7 years"}',
  '{"SIM": "Nano-SIM + eSIM", "Technology": "GSM / HSPA / LTE / 5G", "2G": "GSM 850/900/1800/1900", "3G": "HSDPA", "4G": "LTE", "5G": "Sub-6 GHz"}'
)
ON CONFLICT (slug) DO NOTHING;

-- 4. Samsung Galaxy A55 5G (Mid-range)
INSERT INTO devices (
  name, slug, brand_id, release_year, price_tier, major_category, device_type_id,
  price_usd, tagline, status,
  score_display, score_performance, score_camera, score_battery, score_value, scores_overall,
  specs_display, specs_design, specs_processor, specs_memory, specs_camera,
  specs_battery, specs_connectivity, specs_software, specs_network
)
VALUES (
  'Samsung Galaxy A55 5G',
  'samsung-galaxy-a55-5g',
  (SELECT id FROM brands WHERE slug = 'samsung'),
  2024,
  'mid-range',
  'phones',
  (SELECT id FROM device_types WHERE slug = 'phone'),
  399,
  'Mid-range with Samsung Knox Vault security, Exynos 1480, and a 50MP triple camera — best A-series yet.',
  'draft',
  0, 0, 0, 0, 0, 0,
  '{"Size": "6.6 inches", "Type": "Super AMOLED", "Resolution": "2340 x 1080 px (FHD+)", "Refresh Rate": "120 Hz", "Pixel Density": "390 PPI", "Screen-to-body ratio": "~84%", "Peak Brightness": "~1000 nits", "HDR": "No", "Color depth": "16M", "Protection": "Corning Gorilla Glass Victus+"}',
  '{"Dimensions": "161.1 x 77.4 x 8.2 mm", "Weight": "213 g", "Build": "Metal frame, glass front and back", "SIM": "Nano-SIM + microSD", "Colours": "Awesome Iceblue, Awesome Lemon, Awesome Lilac, Awesome Navy", "IP Rating": "IP67", "Ports": "USB Type-C 2.0", "Speakers": "Stereo", "3.5mm jack": "No"}',
  '{"Chipset": "Exynos 1480 (4 nm)", "CPU": "Octa-core (4x2.75 GHz Cortex-A78 + 4x2.0 GHz Cortex-A55)", "GPU": "Xclipse 530", "Node size": "4 nm", "NPU": "Dedicated NPU"}',
  '{"RAM": "8 GB / 12 GB", "RAM type": "LPDDR4X", "Storage": "128 GB / 256 GB", "Storage type": "UFS 2.2", "Expandable": "Yes (microSDXC)"}',
  '{"rear": [{"type": "Wide (main)", "sensorType": "50 MP, f/1.8, OIS, PDAF"}, {"type": "Ultrawide", "sensorType": "12 MP, f/2.2"}, {"type": "Macro", "sensorType": "5 MP, f/2.4"}], "selfie": {"type": "Wide", "sensorType": "32 MP, f/2.2"}, "video": "4K@30fps", "extras": "Night mode, Knox Vault security"}',
  '{"Capacity": "5000 mAh", "Battery type": "Li-Ion", "Wired charging": "25W", "Wireless charging": "No", "Reverse charging": "No", "Charging protocols": "USB PD"}',
  '{"WiFi": "Wi-Fi 6 (802.11 ax)", "Bluetooth": "5.3", "NFC": "Yes", "USB": "USB-C 2.0", "Positioning": "GPS, GLONASS, BeiDou, Galileo", "IR blaster": "No"}',
  '{"OS": "Android 14", "UI layer": "One UI 6.1", "Major OS upgrades": "4", "Security patches": "5 years"}',
  '{"SIM": "Nano-SIM + microSD", "Technology": "GSM / HSPA / LTE / 5G", "2G": "GSM 850/900/1800/1900", "3G": "HSDPA", "4G": "LTE", "5G": "Sub-6 GHz"}'
)
ON CONFLICT (slug) DO NOTHING;

-- 5. Samsung Galaxy A35 5G (Mid-range)
INSERT INTO devices (
  name, slug, brand_id, release_year, price_tier, major_category, device_type_id,
  price_usd, tagline, status,
  score_display, score_performance, score_camera, score_battery, score_value, scores_overall,
  specs_display, specs_design, specs_processor, specs_memory, specs_camera,
  specs_battery, specs_connectivity, specs_software, specs_network
)
VALUES (
  'Samsung Galaxy A35 5G',
  'samsung-galaxy-a35-5g',
  (SELECT id FROM brands WHERE slug = 'samsung'),
  2024,
  'mid-range',
  'phones',
  (SELECT id FROM device_types WHERE slug = 'phone'),
  299,
  'Balanced 5G mid-ranger with 120Hz AMOLED, Exynos 1380, and Knox Vault — great value under $300.',
  'draft',
  0, 0, 0, 0, 0, 0,
  '{"Size": "6.6 inches", "Type": "Super AMOLED", "Resolution": "2340 x 1080 px (FHD+)", "Refresh Rate": "120 Hz", "Pixel Density": "390 PPI", "Screen-to-body ratio": "~83%", "Peak Brightness": "~1000 nits", "HDR": "No", "Color depth": "16M", "Protection": "Corning Gorilla Glass Victus+"}',
  '{"Dimensions": "161.7 x 78.0 x 8.2 mm", "Weight": "210 g", "Build": "Plastic frame, glass front", "SIM": "Nano-SIM + microSD", "Colours": "Awesome Iceblue, Awesome Lemon, Awesome Lilac, Awesome Navy", "IP Rating": "IP67", "Ports": "USB Type-C 2.0", "Speakers": "Stereo", "3.5mm jack": "No"}',
  '{"Chipset": "Exynos 1380 (5 nm)", "CPU": "Octa-core (4x2.4 GHz Cortex-A78 + 4x2.0 GHz Cortex-A55)", "GPU": "Xclipse 530", "Node size": "5 nm", "NPU": "Dedicated NPU"}',
  '{"RAM": "6 GB / 8 GB", "RAM type": "LPDDR4X", "Storage": "128 GB / 256 GB", "Storage type": "UFS 2.2", "Expandable": "Yes (microSDXC)"}',
  '{"rear": [{"type": "Wide (main)", "sensorType": "50 MP, f/1.8, OIS, PDAF"}, {"type": "Ultrawide", "sensorType": "8 MP, f/2.2"}, {"type": "Macro", "sensorType": "5 MP, f/2.4"}], "selfie": {"type": "Wide", "sensorType": "13 MP, f/2.2"}, "video": "4K@30fps", "extras": "Night mode, Knox Vault security"}',
  '{"Capacity": "5000 mAh", "Battery type": "Li-Ion", "Wired charging": "25W", "Wireless charging": "No", "Reverse charging": "No", "Charging protocols": "USB PD"}',
  '{"WiFi": "Wi-Fi 6 (802.11 ax)", "Bluetooth": "5.3", "NFC": "Yes", "USB": "USB-C 2.0", "Positioning": "GPS, GLONASS, BeiDou, Galileo", "IR blaster": "No"}',
  '{"OS": "Android 14", "UI layer": "One UI 6.1", "Major OS upgrades": "4", "Security patches": "5 years"}',
  '{"SIM": "Nano-SIM + microSD", "Technology": "GSM / HSPA / LTE / 5G", "2G": "GSM 850/900/1800/1900", "3G": "HSDPA", "4G": "LTE", "5G": "Sub-6 GHz"}'
)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- APPLE
-- ═══════════════════════════════════════════════════════════

-- 6. Apple iPhone 16 Pro Max (Ultra-premium)
INSERT INTO devices (
  name, slug, brand_id, release_year, price_tier, major_category, device_type_id,
  price_usd, tagline, status,
  score_display, score_performance, score_camera, score_battery, score_value, scores_overall,
  specs_display, specs_design, specs_processor, specs_memory, specs_camera,
  specs_battery, specs_connectivity, specs_software, specs_network
)
VALUES (
  'Apple iPhone 16 Pro Max',
  'apple-iphone-16-pro-max',
  (SELECT id FROM brands WHERE slug = 'apple'),
  2024,
  'ultra-premium',
  'phones',
  (SELECT id FROM device_types WHERE slug = 'phone'),
  1199,
  '6.9-inch Super Retina XDR, A18 Pro chip, 48MP triple camera with 5x periscope zoom — Apple''s 2024 magnum opus.',
  'draft',
  0, 0, 0, 0, 0, 0,
  '{"Size": "6.9 inches", "Type": "Super Retina XDR OLED", "Resolution": "2868 x 1320 px (QHD)", "Refresh Rate": "1-120 Hz ProMotion", "Pixel Density": "460 PPI", "Screen-to-body ratio": "92.35%", "Peak Brightness": "2000 nits (outdoor)", "HDR": "HDR10, Dolby Vision", "Color depth": "16M", "Protection": "Ceramic Shield (2024 gen)"}',
  '{"Dimensions": "163.0 x 77.6 x 8.25 mm", "Weight": "227 g", "Build": "Titanium frame, textured matte glass back", "SIM": "Nano-SIM + eSIM (eSIM-only in USA)", "Colours": "Black Titanium, White Titanium, Natural Titanium, Desert Titanium", "IP Rating": "IP68", "Ports": "USB Type-C 3.2 Gen 2 (USB 3)", "Speakers": "Stereo, Dolby Atmos", "3.5mm jack": "No"}',
  '{"Chipset": "Apple A18 Pro (3 nm)", "CPU": "Hexa-core (2x performance + 4x efficiency)", "GPU": "Apple GPU (6-core)", "Node size": "3 nm", "NPU": "Apple Neural Engine 16-core"}',
  '{"RAM": "8 GB", "RAM type": "LPDDR5", "Storage": "256 GB / 512 GB / 1 TB", "Storage type": "NVMe", "Expandable": "No"}',
  '{"rear": [{"type": "Wide (main)", "sensorType": "48 MP, f/1.78, OIS, PDAF, Fusion camera"}, {"type": "Ultrawide + Macro", "sensorType": "48 MP, f/2.2, autofocus"}, {"type": "Periscope telephoto (5x)", "sensorType": "12 MP, f/2.8, OIS, tetraprism"}], "selfie": {"type": "TrueDepth", "sensorType": "12 MP, f/1.9, autofocus"}, "video": "4K@120fps (ProRes), 4K@60fps Dolby Vision, spatial video", "extras": "Camera Control button, Action button, ProRAW, ProRes, Photographic Styles 2.0"}',
  '{"Capacity": "4685 mAh", "Battery type": "Li-Ion", "Wired charging": "27W (USB-C)", "Wireless charging": "25W MagSafe / 15W Qi2", "Reverse charging": "No", "Charging protocols": "USB PD 3.0"}',
  '{"WiFi": "Wi-Fi 7 (802.11 be)", "Bluetooth": "5.3", "NFC": "Yes", "USB": "USB-C 3.2 Gen 2 (USB 3)", "Positioning": "GPS, GLONASS, BeiDou, Galileo, QZSS", "IR blaster": "No"}',
  '{"OS": "iOS 18", "UI layer": "iOS", "Major OS upgrades": "6+ (up to iOS 26)", "Security patches": "Ongoing"}',
  '{"SIM": "Nano-SIM + eSIM", "Technology": "GSM / CDMA / HSPA / LTE / 5G", "2G": "GSM 850/900/1800/1900", "3G": "HSDPA", "4G": "LTE (28 bands)", "5G": "Sub-6 GHz + mmWave (US model)"}'
)
ON CONFLICT (slug) DO NOTHING;

-- 7. Apple iPhone 16 Pro (Ultra-premium)
INSERT INTO devices (
  name, slug, brand_id, release_year, price_tier, major_category, device_type_id,
  price_usd, tagline, status,
  score_display, score_performance, score_camera, score_battery, score_value, scores_overall,
  specs_display, specs_design, specs_processor, specs_memory, specs_camera,
  specs_battery, specs_connectivity, specs_software, specs_network
)
VALUES (
  'Apple iPhone 16 Pro',
  'apple-iphone-16-pro',
  (SELECT id FROM brands WHERE slug = 'apple'),
  2024,
  'ultra-premium',
  'phones',
  (SELECT id FROM device_types WHERE slug = 'phone'),
  999,
  'Compact pro powerhouse — 6.3-inch ProMotion, A18 Pro, Camera Control, and 5x optical zoom in 199g.',
  'draft',
  0, 0, 0, 0, 0, 0,
  '{"Size": "6.3 inches", "Type": "Super Retina XDR OLED", "Resolution": "2622 x 1206 px", "Refresh Rate": "1-120 Hz ProMotion", "Pixel Density": "460 PPI", "Screen-to-body ratio": "91.9%", "Peak Brightness": "2000 nits (outdoor)", "HDR": "HDR10, Dolby Vision", "Color depth": "16M", "Protection": "Ceramic Shield (2024 gen)"}',
  '{"Dimensions": "149.6 x 71.5 x 8.25 mm", "Weight": "199 g", "Build": "Titanium frame, textured matte glass back", "SIM": "Nano-SIM + eSIM", "Colours": "Black Titanium, White Titanium, Natural Titanium, Desert Titanium", "IP Rating": "IP68", "Ports": "USB Type-C 3.2 Gen 2 (USB 3)", "Speakers": "Stereo, Dolby Atmos", "3.5mm jack": "No"}',
  '{"Chipset": "Apple A18 Pro (3 nm)", "CPU": "Hexa-core (2x performance + 4x efficiency)", "GPU": "Apple GPU (6-core)", "Node size": "3 nm", "NPU": "Apple Neural Engine 16-core"}',
  '{"RAM": "8 GB", "RAM type": "LPDDR5", "Storage": "128 GB / 256 GB / 512 GB / 1 TB", "Storage type": "NVMe", "Expandable": "No"}',
  '{"rear": [{"type": "Wide (main)", "sensorType": "48 MP, f/1.78, OIS, PDAF"}, {"type": "Ultrawide + Macro", "sensorType": "48 MP, f/2.2, autofocus"}, {"type": "Periscope telephoto (5x)", "sensorType": "12 MP, f/2.8, OIS, tetraprism"}], "selfie": {"type": "TrueDepth", "sensorType": "12 MP, f/1.9, autofocus"}, "video": "4K@120fps (ProRes), 4K@60fps Dolby Vision", "extras": "Camera Control, Action button, ProRAW, ProRes"}',
  '{"Capacity": "3582 mAh", "Battery type": "Li-Ion", "Wired charging": "27W", "Wireless charging": "25W MagSafe", "Reverse charging": "No", "Charging protocols": "USB PD 3.0"}',
  '{"WiFi": "Wi-Fi 7 (802.11 be)", "Bluetooth": "5.3", "NFC": "Yes", "USB": "USB-C 3.2 Gen 2", "Positioning": "GPS, GLONASS, BeiDou, Galileo, QZSS", "IR blaster": "No"}',
  '{"OS": "iOS 18", "UI layer": "iOS", "Major OS upgrades": "6+", "Security patches": "Ongoing"}',
  '{"SIM": "Nano-SIM + eSIM", "Technology": "GSM / CDMA / HSPA / LTE / 5G", "2G": "GSM 850/900/1800/1900", "3G": "HSDPA", "4G": "LTE", "5G": "Sub-6 GHz + mmWave (US)"}'
)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- TECNO
-- ═══════════════════════════════════════════════════════════

-- 8. Tecno Phantom X3 Pro (Flagship)
INSERT INTO devices (
  name, slug, brand_id, release_year, price_tier, major_category, device_type_id,
  price_usd, tagline, status,
  score_display, score_performance, score_camera, score_battery, score_value, scores_overall,
  specs_display, specs_design, specs_processor, specs_memory, specs_camera,
  specs_battery, specs_connectivity, specs_software, specs_network
)
VALUES (
  'Tecno Phantom X3 Pro',
  'tecno-phantom-x3-pro',
  (SELECT id FROM brands WHERE slug = 'tecno'),
  2024,
  'flagship',
  'phones',
  (SELECT id FROM device_types WHERE slug = 'phone'),
  499,
  'Tecno''s boldest flagship — Dimensity 9200, retractable periscope telephoto, and a 129W ultra-fast charger.',
  'draft',
  0, 0, 0, 0, 0, 0,
  '{"Size": "6.8 inches", "Type": "AMOLED", "Resolution": "2400 x 1080 px (FHD+)", "Refresh Rate": "120 Hz", "Pixel Density": "387 PPI", "Screen-to-body ratio": "~90%", "Peak Brightness": "950 nits", "HDR": "HDR10+", "Color depth": "16M", "Protection": "Corning Gorilla Glass"}',
  '{"Dimensions": "164.6 x 72.7 x 9.0 mm", "Weight": "201 g", "Build": "Aluminum frame, glass back", "SIM": "Nano-SIM (Dual)", "Colours": "Midnight Black, Starry Silver", "IP Rating": "None declared", "Ports": "USB Type-C 2.0", "Speakers": "Stereo", "3.5mm jack": "No"}',
  '{"Chipset": "MediaTek Dimensity 9200 (4 nm)", "CPU": "Octa-core (1x3.05 GHz Cortex-X3 + 3x2.85 GHz Cortex-A715 + 4x1.80 GHz Cortex-A510)", "GPU": "Arm Immortalis-G715 MC11", "Node size": "4 nm", "NPU": "MediaTek APU 690"}',
  '{"RAM": "12 GB", "RAM type": "LPDDR5", "Storage": "256 GB / 512 GB", "Storage type": "UFS 3.1", "Expandable": "No"}',
  '{"rear": [{"type": "Wide (main)", "sensorType": "50 MP, f/1.9, PDAF"}, {"type": "Periscope telephoto (2.5x)", "sensorType": "50 MP, f/1.5, retractable lens, PDAF"}, {"type": "Ultrawide", "sensorType": "32 MP, f/2.2, AF"}], "selfie": {"type": "Wide", "sensorType": "32 MP, f/2.5"}, "video": "4K@30fps", "extras": "LED flash, HDR, panorama, retractable telephoto mechanism"}',
  '{"Capacity": "5000 mAh", "Battery type": "Li-Po", "Wired charging": "129W", "Wireless charging": "No", "Reverse charging": "No", "Charging protocols": "Proprietary 129W"}',
  '{"WiFi": "Wi-Fi 6E (802.11 ax)", "Bluetooth": "5.3", "NFC": "Yes", "USB": "USB-C 2.0", "Positioning": "GPS, GLONASS, BeiDou, Galileo", "IR blaster": "No"}',
  '{"OS": "Android 14", "UI layer": "HiOS 14", "Major OS upgrades": "2", "Security patches": "Quarterly"}',
  '{"SIM": "Dual Nano-SIM", "Technology": "GSM / HSPA / LTE / 5G", "2G": "GSM", "3G": "HSDPA", "4G": "LTE", "5G": "Sub-6 GHz"}'
)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- INFINIX
-- ═══════════════════════════════════════════════════════════

-- 9. Infinix Note 40 Pro (Mid-range)
INSERT INTO devices (
  name, slug, brand_id, release_year, price_tier, major_category, device_type_id,
  price_usd, tagline, status,
  score_display, score_performance, score_camera, score_battery, score_value, scores_overall,
  specs_display, specs_design, specs_processor, specs_memory, specs_camera,
  specs_battery, specs_connectivity, specs_software, specs_network
)
VALUES (
  'Infinix Note 40 Pro',
  'infinix-note-40-pro',
  (SELECT id FROM brands WHERE slug = 'infinix'),
  2024,
  'mid-range',
  'phones',
  (SELECT id FROM device_types WHERE slug = 'phone'),
  229,
  '120Hz AMOLED, Dimensity 7020, 108MP triple camera, and 45W wireless charging — budget-tier puncher.',
  'draft',
  0, 0, 0, 0, 0, 0,
  '{"Size": "6.78 inches", "Type": "AMOLED", "Resolution": "2436 x 1080 px (FHD+)", "Refresh Rate": "120 Hz", "Pixel Density": "393 PPI", "Screen-to-body ratio": "~90%", "Peak Brightness": "900 nits", "HDR": "No", "Color depth": "16M", "Protection": "Corning Gorilla Glass"}',
  '{"Dimensions": "168.4 x 76.4 x 7.9 mm", "Weight": "195 g", "Build": "Plastic frame", "SIM": "Nano-SIM (Dual) + microSD", "Colours": "Titan Gold, Racing Black, Mist Lavender", "IP Rating": "None declared", "Ports": "USB Type-C 2.0", "Speakers": "Stereo", "3.5mm jack": "Yes"}',
  '{"Chipset": "MediaTek Dimensity 7020 (6 nm)", "CPU": "Octa-core (2x2.2 GHz Cortex-A78 + 6x2.0 GHz Cortex-A55)", "GPU": "Mali-G57 MC2", "Node size": "6 nm", "NPU": "MediaTek APU"}',
  '{"RAM": "8 GB / 12 GB", "RAM type": "LPDDR4X", "Storage": "256 GB", "Storage type": "UFS 2.2", "Expandable": "Yes (microSDXC)"}',
  '{"rear": [{"type": "Wide (main)", "sensorType": "108 MP, f/1.75, PDAF"}, {"type": "Ultrawide", "sensorType": "8 MP, f/2.2"}, {"type": "Macro", "sensorType": "2 MP, f/2.4"}], "selfie": {"type": "Wide", "sensorType": "32 MP, f/2.45"}, "video": "4K@30fps", "extras": "LED flash, panorama, HDR"}',
  '{"Capacity": "5000 mAh", "Battery type": "Li-Po", "Wired charging": "70W", "Wireless charging": "45W", "Reverse charging": "Yes (5W)", "Charging protocols": "Proprietary"}',
  '{"WiFi": "Wi-Fi 5 (802.11 ac)", "Bluetooth": "5.2", "NFC": "Yes", "USB": "USB-C 2.0", "Positioning": "GPS, GLONASS, BeiDou", "IR blaster": "Yes"}',
  '{"OS": "Android 14", "UI layer": "XOS 14", "Major OS upgrades": "2", "Security patches": "Quarterly"}',
  '{"SIM": "Dual Nano-SIM + microSD", "Technology": "GSM / HSPA / LTE", "2G": "GSM", "3G": "HSDPA", "4G": "LTE", "5G": "No (4G model)"}'
)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- XIAOMI
-- ═══════════════════════════════════════════════════════════

-- 10. Xiaomi Redmi Note 14 Pro (Mid-range)
INSERT INTO devices (
  name, slug, brand_id, release_year, price_tier, major_category, device_type_id,
  price_usd, tagline, status,
  score_display, score_performance, score_camera, score_battery, score_value, scores_overall,
  specs_display, specs_design, specs_processor, specs_memory, specs_camera,
  specs_battery, specs_connectivity, specs_software, specs_network
)
VALUES (
  'Xiaomi Redmi Note 14 Pro',
  'xiaomi-redmi-note-14-pro',
  (SELECT id FROM brands WHERE slug = 'xiaomi'),
  2025,
  'mid-range',
  'phones',
  (SELECT id FROM device_types WHERE slug = 'phone'),
  349,
  '200MP main camera, 120Hz AMOLED, Helio G100 Ultra, and a massive 5500 mAh battery — Redmi''s value king.',
  'draft',
  0, 0, 0, 0, 0, 0,
  '{"Size": "6.7 inches", "Type": "AMOLED", "Resolution": "2400 x 1080 px (FHD+)", "Refresh Rate": "120 Hz", "Pixel Density": "395 PPI", "Screen-to-body ratio": "87.43%", "Peak Brightness": "1800 nits", "HDR": "No", "Color depth": "16M", "Protection": "Corning Gorilla Glass Victus 2"}',
  '{"Dimensions": "162.2 x 74.9 x 8.2 mm", "Weight": "180 g", "Build": "Plastic frame, aluminum accents", "SIM": "Nano-SIM (Dual) + microSD", "Colours": "Midnight Black, Aurora Purple, Ocean Blue", "IP Rating": "IP64", "Ports": "USB Type-C 2.0", "Speakers": "Stereo", "3.5mm jack": "No"}',
  '{"Chipset": "MediaTek Helio G100 Ultra (6 nm)", "CPU": "Octa-core (2x2.2 GHz Cortex-A76 + 6x2.0 GHz Cortex-A55)", "GPU": "Mali-G57 MC2", "Node size": "6 nm", "NPU": "APU"}',
  '{"RAM": "8 GB / 12 GB", "RAM type": "LPDDR4X", "Storage": "128 GB / 256 GB / 512 GB", "Storage type": "UFS 2.2", "Expandable": "Yes (microSDXC)"}',
  '{"rear": [{"type": "Wide (main)", "sensorType": "200 MP, f/1.7, OIS, PDAF"}, {"type": "Ultrawide", "sensorType": "8 MP, f/2.2"}, {"type": "Macro", "sensorType": "2 MP, f/2.4"}], "selfie": {"type": "Wide", "sensorType": "16 MP, f/2.4"}, "video": "1080p@60fps", "extras": "LED flash, HDR, panorama"}',
  '{"Capacity": "5500 mAh", "Battery type": "Li-Ion", "Wired charging": "45W", "Wireless charging": "No", "Reverse charging": "No", "Charging protocols": "USB PD 3.0"}',
  '{"WiFi": "Wi-Fi 5 (802.11 ac)", "Bluetooth": "5.2", "NFC": "Yes", "USB": "USB-C 2.0", "Positioning": "GPS, GLONASS, BeiDou, Galileo", "IR blaster": "Yes"}',
  '{"OS": "Android 14", "UI layer": "MIUI 14 / HyperOS", "Major OS upgrades": "2", "Security patches": "3 years"}',
  '{"SIM": "Dual Nano-SIM + microSD", "Technology": "GSM / HSPA / LTE", "2G": "GSM", "3G": "HSDPA", "4G": "LTE", "5G": "No"}'
)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- VERIFY
-- ═══════════════════════════════════════════════════════════
-- Run this after the inserts to confirm all 10 rows landed:
-- SELECT name, slug, price_tier, price_usd, release_year, status
-- FROM devices
-- WHERE slug IN (
--   'samsung-galaxy-s25-ultra', 'samsung-galaxy-s25-plus', 'samsung-galaxy-s25',
--   'samsung-galaxy-a55-5g', 'samsung-galaxy-a35-5g',
--   'apple-iphone-16-pro-max', 'apple-iphone-16-pro',
--   'tecno-phantom-x3-pro',
--   'infinix-note-40-pro',
--   'xiaomi-redmi-note-14-pro'
-- )
-- ORDER BY brand_id, price_usd DESC;
