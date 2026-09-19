# **FweezyTech Device Database + FweezyTech Ranking Engine** 

## **Master Technical Implementation Prompt** 

Build the FweezyTech device database and FweezyTech phone ranking system as **one integrated system** . 

The device database is the source of truth for phone specifications, while the ranking engine consumes the verified device data and benchmark data from that database to calculate a single public **FweezyTech Score /100** . 

The ranking system must NOT be a separate manually maintained list. 

The intended architecture is: 

**External Sources → Data Import → Draft Device → Admin Verification/Correction → Published Device → Ranking Engine → FweezyTech Score** 

The system must be designed so that new phones can continuously be added, existing specifications can be updated, benchmark data can be updated, and the global ranking can automatically recalculate as technology improves. 

# **1. CORE SYSTEM PRINCIPLE** 

The website already has a device-information system containing specifications for phones and other supported devices. 

The ranking system must use that same database. 

Do NOT create a second independent set of specifications solely for ranking. 

For example, if the device database contains: 

- Samsung Galaxy S26 Ultra 

- Snapdragon 8 Elite Gen 5 

- 12GB RAM 

- 512GB storage 

- 6.9-inch AMOLED display 

- 120Hz 

- 200MP main camera 

- 5,000mAh battery 

- 100W charging 

the ranking engine should read those values directly from the verified device record. 

The ranking engine then transforms those specifications into internal component scores and finally produces: 

**FweezyTech Score: 94/100** 

Only that final score should be displayed publicly. 

# **2. DATA SOURCE ARCHITECTURE** 

Every imported specification and benchmark should have an identifiable source. 

The system must distinguish between: 

### **2a. Device specification sources** 

Approved sources can include: 

- GSMArena 

- Official manufacturer specifications 

- Official product pages 

- Official technical documentation 

- Other administrator-approved specification databases 

GSMArena can be used as an important reference for general phone specifications, but the system must not blindly assume that every GSMArena field is correct. 

Manufacturer information should generally take precedence for specifications that the manufacturer explicitly documents. 

### **2b. Processor benchmark sources** 

FweezyTech must NOT test every phone itself. 

It is unrealistic to independently benchmark hundreds or thousands of devices. 

Processor performance data should therefore come from established benchmark sources. 

Approved sources can include: 

- Geekbench Browser / Geekbench results 

- NanoReview 

- Other reputable benchmark databases approved by the administrator 

The system should support multiple benchmark sources rather than permanently tying the ranking system to one website. 

For example: 

```
Processor:
Snapdragon 8 Elite Gen 5
CPU Benchmark:
Geekbench 6
Single-Core:
3,850
Multi-Core:
11,200
GPU:
[approved GPU benchmark value]
Source:
Geekbench Browser
Source Date:
2026-09-13
Confidence:
High
```

If NanoReview also provides benchmark information for the same SoC, it can be stored as another source. 

### **2c. Important benchmark principle** 

Do NOT treat benchmark numbers as permanent properties of a phone. 

Processor benchmark data should primarily be associated with the **SoC/processor** , while the device database stores which SoC a particular phone uses. 

For example: 

```
Galaxy S26 Ultra
    ↓
Snapdragon 8 Elite Gen 5
    ↓
Benchmark Database
    ↓
Geekbench Single-Core
Geekbench Multi-Core
GPU Benchmark
    ↓
FweezyTech Ranking Engine
```

This avoids having to manually enter the same processor benchmark information into every phone using that processor. 

# **3. SOURCE PRIORITY AND VERIFICATION** 

The system must have a source hierarchy. 

Suggested priority: 

### **Tier 1 — Official manufacturer information** 

Use for: 

- Display specifications 

- Battery capacity 

- Charging capabilities 

- Camera hardware 

- IP rating 

- Materials 

- RAM/storage configurations 

- Processor/SoC 

- Wireless charging 

- Other explicitly documented hardware 

### **Tier 2 — Reputable specification databases** 

Examples: 

- GSMArena 

- Other administrator-approved specification databases 

Use these to supplement information that manufacturers do not clearly provide. 

### **Tier 3 — Benchmark databases** 

Examples: 

- Geekbench Browser 

- NanoReview 

- Other administrator-approved benchmark sources 

Use these specifically for performance benchmark information. 

### **Tier 4 — Secondary sources** 

Reviews, articles and other publications can be used when necessary, but should not automatically override an official specification. 

# **4. DRAFT → VERIFY → PUBLISH WORKFLOW** 

The ranking system must integrate directly with the existing device database workflow. 

Imported information must NEVER automatically become publicly published information. The workflow must be: 

**Step 1 — Import** 

The system imports device information from configured sources. 

**Step 2 — Draft** 

All imported information enters the existing **Draft** section. 

The imported data should include its source. 

Example: 

```
Device:
Samsung Galaxy S26 Ultra
Processor:
Snapdragon 8 Elite Gen 5
```

```
Source:
GSMArena
Benchmark:
Geekbench 6
Single-Core:
3,850
Multi-Core:
11,200
Benchmark Source:
Geekbench Browser
Status:
Draft
```

### **Step 3 — Admin verification** 

The administrator reviews the imported information. 

The administrator must be able to: 

- Accept the imported value 

- Edit the value 

- Reject the value 

- Add a missing value 

- Change the source 

- Add another source 

- Mark information as unknown 

- Add images 

- Complete missing specifications 

### **Step 4 — Publish** 

Only after verification does the device become Published. 

### **Step 5 — Ranking calculation** 

The ranking engine reads the **published/verified device information** . 

It should not use unverified Draft information for the public ranking. 

# **5. RAW DATA MUST BE STORED SEPARATELY FROM SCORES** 

Never store only the final score. 

The system must store the underlying raw data. 

For example: 

```
Processor:
Snapdragon 8 Elite Gen 5
Single-Core:
3850
Multi-Core:
11200
GPU Benchmark:
XXXX
Benchmark Version:
Geekbench 6
Benchmark Source:
```

```
Geekbench Browser
```

The ranking engine calculates the score from this data. 

Do NOT permanently store: 

```
Processor Score = 17.43
```

as the only information. 

Instead: 

```
RAW DATA
↓
BENCHMARK DATA
↓
SCORING FORMULA
↓
COMPONENT SCORE
↓
FINAL FWEezyTECH SCORE
```

This allows the scoring system to be recalculated whenever benchmark standards change. 

# **6. FWEezyTECH RANKING PHILOSOPHY** 

The public ranking must use a single: 

# **FweezyTech Score /100** 

This is an **absolute global score** . 

It is NOT: 

- A value-for-money score 

- A score against phones in the same price range 

- A score against phones from the same year 

- A score against phones from the same category 

- A launch-era score 

- A popularity score 

The question the score answers is: 

#### **How capable is this phone by current global hardware standards?** 

Therefore, older phones can naturally decline in score over time as new technology improves. 

For example: 

A 2019 flagship may have been one of the best phones in 2019. 

But if modern midrange hardware becomes substantially better in certain areas, that old flagship should not remain artificially high simply because it was once expensive or flagshipgrade. 

# **7. NO PRICE OR VALUE SCORE** 

Price must NOT be included anywhere in the FweezyTech Score calculation. 

Do not use: 

- Retail price 

- Launch price 

- Price-to-performance 

- Discount 

- Current market price 

- Value for money 

A phone's price may be displayed elsewhere on the website and used for buying guides, but it must not affect the global hardware score. 

# **8. THE FIVE RANKING CATEGORIES** 

The total score is exactly 100 points. 

`1. Build Quality       = 10 2. Display             = 20 3. Performance         = 25 4. Cameras             = 25 5. Battery & Charging  = 20 TOTAL                  = 100` 

Do not change these category totals. 

# **9. BUILD QUALITY — 10 POINTS** 

## **9a. IP Rating — 3 points** 

Use the IP rating documented under the IEC 60529 system. 

Separate the dust and water portions. 

Dust factor: 

```
DustFactor = DustRating / 6
```

Water factor: 

```
None/X = 0
IPX1 = 0.10
IPX2 = 0.20
IPX3 = 0.30
IPX4 = 0.40
IPX5 = 0.55
IPX6 = 0.65
IPX7 = 0.80
IPX8 = 0.95
IPX9 = 1.00
```

Formula: 

```
IPScore =
3 × (
    0.40 × DustFactor
    +
    0.60 × WaterFactor
)
```

Water resistance is slightly more heavily weighted than dust protection. 

Do not assume an undocumented IP rating. 

If no reliable standardized rating exists: 

```
IPScore = 0
```

unless another recognized standardized protection rating is documented and the scoring system explicitly supports it. 

## **9b. Glass Protection — 2.5 points** 

Use a standardized internal hierarchy. 

Initial hierarchy: 

```
Unspecified/basic glass       = 0.20
Generic strengthened glass    = 0.40
Gorilla Glass 3               = 0.50
Gorilla Glass 5               = 0.60
```

```
Gorilla Glass 6               = 0.70
Gorilla Glass Victus          = 0.80
Victus+                       = 0.85
Victus 2                      = 0.90
Newer superior protection     = 0.90–1.00
```

#### Formula: 

```
GlassScore = 2.5 × GlassFactor
```

The hierarchy must be stored in configuration so it can be updated as newer glass technologies appear. 

Do not give a phone a perfect score merely because its manufacturer says "strengthened glass." 

## **9c. Frame — 2.5 points** 

#### Initial hierarchy: 

```
Plastic                       = 0.30
Composite/reinforced plastic  = 0.40
Aluminum                      = 0.70
Stainless steel               = 0.85
Titanium                      = 1.00
New superior material         = administrator-defined
```

#### Formula: 

```
FrameScore = 2.5 × FrameFactor
```

## **9d. Back Material — 2 points** 

Initial hierarchy: 

```
Plastic              = 0.30
Composite            = 0.45
Glass                = 0.75
Ceramic              = 0.95
Premium specialty    = 1.00
```

#### Formula: 

```
BackScore = 2 × BackFactor
```

# **10. DISPLAY — 20 POINTS** 

## **10a. Display Type — 4 points** 

Initial hierarchy: 

```
TFT LCD              = 0.35
IPS LCD              = 0.50
LTPS LCD             = 0.55
OLED                 = 0.75
AMOLED               = 0.80
Premium/flexible OLED= 0.85
LTPO OLED            = 1.00
```

#### Formula: 

```
DisplayTypeScore = 4 × DisplayTypeFactor
```

Manufacturer marketing names must be mapped to the underlying display technology. 

## **10b. Resolution — 4 points** 

Calculate PPI: 

```
PPI =
sqrt(width² + height²) / screen_size_inches
```

Then: 

```
ResolutionFactor =
min(1, (PPI / 500)^0.65)
```

And: 

```
ResolutionScore = 4 × ResolutionFactor
```

Use diminishing returns. 

This prevents extreme resolutions from receiving disproportionately large advantages. 

## **10c. Refresh Rate — 3 points** 

Base formula: 

```
RefreshFactor =
min(
    1,
    ln(1 + RefreshRate) / ln(1 + 120)
)
```

Adaptive multiplier: 

```
Fixed refresh rate       = 0.90
Dynamic refresh           = 0.95
Wide-range LTPO/adaptive  = 1.00
```

#### Formula: 

```
RefreshScore =
3 × RefreshFactor × AdaptiveMultiplier
```

This prevents a fixed 165Hz panel from automatically beating a more sophisticated adaptive 120Hz panel. 

## **10d. Brightness — 4 points** 

Brightness should be treated carefully because manufacturer peak brightness figures can be highly conditional. 

If an independent measured value is available: 

```
BrightnessFactor =
min(1, (MeasuredNits / 2500)^0.55)
```

If only a manufacturer claim is available: 

```
EffectiveNits =
ClaimedNits × 0.65
```

Then: 

```
BrightnessFactor =
min(1, (EffectiveNits / 2500)^0.55)
```

#### Finally: 

```
BrightnessScore = 4 × BrightnessFactor
```

The 2,500-nit benchmark must be configurable so it can be updated as display technology advances. 

Do not blindly accept extremely high manufacturer peak brightness claims as equivalent to independent measurements. 

## **10e. HDR — 5 points** 

Initial HDR factors: 

```
No HDR                     = 0
HDR10                      = 0.55
HDR10+                     = 0.75
Dolby Vision               = 0.80
HDR10+ + Dolby Vision      = 0.95
Exceptional documented HDR = 1.00
```

#### Base: 

```
BaseHDRScore = 5 × HDRFactor
```

#### Brightness modifier: 

```
Below 500 nits       = 0.70
500–799 nits         = 0.80
800–1199 nits        = 0.90
1200+ nits           = 1.00
```

#### Final: 

```
HDRScore =
BaseHDRScore × BrightnessModifier
```

This prevents an "HDR supported" checkbox from giving a phone an artificially high score when the display cannot deliver strong HDR brightness. 

# **11. PERFORMANCE — 25 POINTS** 

Performance is exactly: 

```
Processor = 18
RAM       = 3
Storage   = 4
TOTAL     = 25
```

Do not add additional performance components. 

Do NOT require FweezyTech to perform physical benchmark testing. 

The system must use external benchmark data. 

# **12. PROCESSOR — 18 POINTS** 

## **12a Processor data source** 

The phone database stores the actual SoC. 

Example: 

```
Processor:
Snapdragon 8 Elite Gen 5
```

The processor database then contains benchmark information for that SoC. 

Benchmark sources can include: 

- Geekbench Browser 

- NanoReview 

- Other administrator-approved reputable benchmark sources 

The system must store: 

```
SoC name
Benchmark name
Benchmark version
Single-core score
Multi-core score
GPU score
Source
Source URL/reference
Date collected
Confidence/status
```

# **13. PROCESSOR BENCHMARK NORMALIZATION** 

Use three benchmark dimensions: 

```
Single-Core CPU = 45%
Multi-Core CPU  = 35%
GPU             = 20%
```

For each benchmark, compare the processor against the **current global best** . 

```
SingleCoreFactor =
PhoneSingleCore / CurrentGlobalBestSingleCore
```

```
MultiCoreFactor =
PhoneMultiCore / CurrentGlobalBestMultiCore
```

```
GPUFactor =
PhoneGPU / CurrentGlobalBestGPU
```

Then: 

```
ProcessorIndex =
(
    0.45 × SingleCoreFactor
    +
```

```
    0.35 × MultiCoreFactor
    +
    0.20 × GPUFactor
)
```

Finally: 

```
ProcessorScore =
18 × ProcessorIndex
```

Cap the result at 18. 

# **14. PROCESSOR BENCHMARK DATA MUST BE DYNAMIC** 

The current global benchmark must not be hardcoded forever. 

For example: 

```
Current Global Best Single-Core
Current Global Best Multi-Core
Current Global Best GPU
```

must be stored as benchmark configuration. 

When a new processor becomes the global benchmark, the system should update the benchmark reference and recalculate affected devices. 

Example: 

### **Current generation** 

```
Current best processor:
Snapdragon 8 Elite Gen 5
```

```
Score:
18/18
```

A future processor may become substantially faster. 

The system then updates: 

```
Current best processor:
Future Processor X
Score:
18/18
```

The previous processor will automatically receive a lower relative score. 

This is essential to maintaining the "living global benchmark" philosophy. 

# **15. MULTIPLE BENCHMARK RESULTS** 

The system must account for the fact that benchmark results can vary. 

The same SoC can have different scores depending on: 

- Device 

- RAM configuration 

- Software 

- Thermal conditions 

- Benchmark version 

- Testing methodology 

Therefore, do not simply select the highest score found online. 

The database should support multiple benchmark records. 

Example: 

```
SoC:
Snapdragon 8 Elite Gen 5
```

```
Geekbench 6
```

```
Source A:
Single = 3,800
Multi = 11,000
```

```
Source B:
Single = 3,850
Multi = 11,200
```

```
Source C:
Single = 3,900
Multi = 11,350
```

The system should use a consistent representative value, preferably a reliable median/standardized value where sufficient data exists. 

The methodology must be the same for every processor. 

Do not cherry-pick the highest result for some chips and average results for others. 

# **16. RAM — 3 POINTS** 

Capacity: 

```
RAMFactor =
min(1, (RAM_GB / 16)^0.55)
```

RAM generation: 

```
LPDDR4   = 0.85
LPDDR4X  = 0.90
LPDDR5   = 0.95
LPDDR5X  = 1.00
Newer    = administrator-defined
```

Formula: 

`RAMScore = 3 × RAMFactor × RAMGenerationMultiplier` Cap at 3. 

# **17. STORAGE — 4 POINTS** 

Capacity: 

```
CapacityFactor =
min(1, (StorageGB / 512)^0.45)
```

Storage technology: 

```
eMMC      = 0.25
UFS 2.1   = 0.50
UFS 2.2   = 0.60
UFS 3.0   = 0.75
UFS 3.1   = 0.85
UFS 4.0   = 0.95
UFS 4.1   = 1.00
Newer     = administrator-defined
```

Overall storage factor: 

```
StorageFactor =
(
    0.35 × CapacityFactor
    +
    0.65 × StorageTechnologyFactor
)
```

#### Then: 

```
StorageScore = 4 × StorageFactor
```

Storage technology is deliberately more important than capacity. 

# **18. CAMERAS — 25 POINTS** 

The camera category is exactly: 

```
Main Camera      = 9
Telephoto        = 6
Ultrawide        = 5
Selfie           = 4
Macro            = 1
TOTAL            = 25
```

Do not add additional camera categories. 

Do not reward a phone simply for having more cameras. 

Do not reward megapixels alone. 

Camera hardware should be evaluated based on meaningful specifications. 

# **19. MAIN CAMERA — 9 POINTS** 

#### Weights: 

```
Sensor          = 35%
Aperture        = 15%
Resolution      = 10%
Stabilization   = 15%
AF              = 10%
Video           = 15%
```

#### Formula: 

```
MainCameraIndex =
(
    0.35 × SensorFactor
    +
    0.15 × ApertureFactor
    +
    0.10 × MPFactor
    +
    0.15 × StabilizationFactor
    +
    0.10 × AFFactor
    +
    0.15 × VideoFactor
)
```

Then: 

```
MainCameraScore =
9 × MainCameraIndex
```

Sensor: 

```
SensorFactor =
min(
    1,
    sqrt(
        SensorArea /
        CurrentGlobalBestSensorArea
    )
)
```

Aperture: 

```
ApertureFactor =
min(
    1,
    (CurrentBestAperture / PhoneAperture)^0.5
)
```

Resolution: 

```
MPFactor =
min(
    1,
    (Megapixels / 200)^0.35
)
```

Stabilization: 

```
None       = 0
EIS        = 0.40
OIS        = 0.75
OIS + EIS  = 0.90
Advanced   = 1.00
```

Autofocus: 

```
Fixed focus              = 0
Contrast AF              = 0.40
PDAF                     = 0.75
Dual Pixel/advanced PDAF = 0.90
Advanced multi-system    = 1.00
```

Video should consider documented capabilities such as: 

- Maximum resolution 

- Maximum frame rate 

- • 4K60 

- 4K120 

- 8K 

- HDR video 

- Stabilization 

- Other meaningful documented video capabilities 

Do not require FweezyTech to personally test video quality on every device. 

# **20. TELEPHOTO — 6 POINTS** 

Weights: 

```
Sensor          = 30%
Optical Zoom    = 25%
Aperture        = 15%
Stabilization   = 15%
AF              = 10%
Video           = 5%
```

Formula: 

```
TelephotoIndex =
```

```
(
    0.30 × SensorFactor
    +
    0.25 × ZoomFactor
    +
    0.15 × ApertureFactor
    +
    0.15 × StabilizationFactor
    +
    0.10 × AFFactor
    +
    0.05 × VideoFactor
)
```

Then: 

```
TelephotoScore =
6 × TelephotoIndex
```

#### Optical zoom hierarchy: 

```
2x      = 0.45
2.5x    = 0.55
3x      = 0.65
3.5x    = 0.72
4x      = 0.80
5x      = 0.90
6x+     = 1.00
```

Digital zoom is NOT equivalent to optical zoom. 

A phone advertising "100x zoom" must not receive the same credit as a phone with 5x optical zoom. 

# **21. ULTRAWIDE — 5 POINTS** 

Weights: 

```
Sensor          = 35%
Resolution      = 15%
Aperture        = 15%
AF              = 15%
Stabilization   = 10%
Video           = 10%
```

Formula: 

```
UltrawideIndex =
(
    0.35 × SensorFactor
    +
    0.15 × ResolutionFactor
    +
    0.15 × ApertureFactor
    +
    0.15 × AFFactor
    +
    0.10 × StabilizationFactor
    +
    0.10 × VideoFactor
)
```

Then: 

```
UltrawideScore =
5 × UltrawideIndex
```

Autofocus is important because it increases versatility and can allow high-quality closeup/macro photography. 

# **22. SELFIE — 4 POINTS** 

Weights: 

```
Sensor          = 30%
Resolution      = 15%
Aperture        = 15%
AF              = 15%
Stabilization   = 10%
Video           = 15%
```

Formula: 

```
SelfieIndex =
(
    0.30 × SensorFactor
    +
    0.15 × ResolutionFactor
    +
    0.15 × ApertureFactor
    +
    0.15 × AFFactor
    +
    0.10 × StabilizationFactor
    +
    0.15 × VideoFactor
)
```

Then: 

```
SelfieScore =
4 × SelfieIndex
```

Do not score selfie cameras based solely on megapixels. 

# **23. MACRO — 1 POINT** 

Macro scoring: 

```
No meaningful macro capability = 0
Low-quality dedicated macro    = 0.25–0.40
Good dedicated macro           = 0.60–0.80
Excellent macro                = 0.80–1.00
```

An autofocus ultrawide can qualify as meaningful macro capability. 

Do not reward a phone merely because it contains a low-quality 2MP or 5MP macro camera. 

# **24. BATTERY & CHARGING — 20 POINTS** 

Exactly: 

```
Capacity          = 7
Wired Charging    = 8
Wireless Charging = 5
```

```
TOTAL             = 20
```

Do not add battery endurance as a separate component. 

Do not require FweezyTech to perform battery testing on every device. 

# **25. BATTERY CAPACITY — 7 POINTS** 

Formula: 

```
CapacityFactor =
min(
    1,
    (Battery_mAh / 7500)^0.55
)
```

Then: 

```
CapacityScore =
7 × CapacityFactor
```

The 7,500mAh benchmark should be configurable and may be updated as battery technology changes. 

Do not claim that capacity directly equals battery endurance. 

# **26. WIRED CHARGING — 8 POINTS** 

Use documented maximum wired charging power. 

Do NOT calculate estimated charging time. 

Formula: 

```
WiredChargingFactor =
min(
    1,
    (Wattage / 150)^0.55
)
```

Then: 

```
WiredChargingScore =
8 × WiredChargingFactor
```

The 150W benchmark should be configurable and updateable. 

# **27. WIRELESS CHARGING — 5 POINTS** 

Formula: 

```
WirelessFactor =
min(
    1,
    (WirelessWattage / 100)^0.55
)
```

Then: 

`WirelessScore = 5 × WirelessFactor` No wireless charging: `WirelessScore = 0` 

Do not apply an additional penalty elsewhere. 

The missing capability is already represented by receiving 0/5. 

# **28. MISSING VS UNKNOWN DATA** 

This is extremely important. 

The system must distinguish: 

### **Missing hardware** 

Example: 

```
Wireless charging: No
```

This means the phone genuinely does not support wireless charging. 

Therefore: 

```
WirelessScore = 0
```

### **Unknown specification** 

Example: 

```
Wireless charging: Unknown
```

This means FweezyTech does not currently have reliable information. 

It must NOT automatically be interpreted as "No." 

Do not invent information. 

Do not assume that an unknown specification is either the best or worst possible value. The admin interface must clearly distinguish: 

```
Yes
No
Unknown
```

where applicable. 

# **29. NO DOUBLE PENALTIES** 

A missing feature should only affect the relevant component. 

Example: 

If a phone has no wireless charging: 

```
Wireless Charging = 0/5
```

Do not additionally deduct points from: 

- Battery capacity 

- Build quality 

- Performance 

- Overall score 

The component's zero already represents the absence. 

# **30. GLOBAL BENCHMARK SYSTEM** 

The system must have a configurable global benchmark table. 

Examples: 

```
Current Best Processor Single-Core
Current Best Processor Multi-Core
```

```
Current Best GPU
Current Best Camera Sensor
Current Best Display Brightness
Current Best Battery Capacity
Current Best Wired Charging
Current Best Wireless Charging
```

Not every benchmark must necessarily be manually entered. 

Where possible, benchmark references should be calculated from the approved current dataset. 

However, the administrator must have the ability to override benchmark references when required. 

Every benchmark must have: 

```
Benchmark value
Reference device/technology
Source
Date
Version
Active/inactive status
```

# **31. DYNAMIC SCORE RECALCULATION** 

The ranking engine must support automatic recalculation. 

For example: 

```
New phone added
        ↓
Published
        ↓
Scoring engine calculates score
        ↓
Check whether it changes any global benchmark
        ↓
If yes:
update benchmark
        ↓
Recalculate affected phones
        ↓
Update rankings
```

Similarly, if benchmark data changes: 

```
Benchmark data updated
        ↓
Scoring engine recalculates
        ↓
```

```
Affected phone scores update
        ↓
Rankings update
```

# **32. VERSION THE SCORING ENGINE** 

The system must keep internal versions for: 

```
Scoring Formula Version
Benchmark Version
Benchmark Source
Calculation Date
```

For example: 

```
Scoring Version:
FTS-1.0
Benchmark Version:
GB-2026-09
Calculated:
2026-09-13
```

This is important because the methodology may evolve. 

If FweezyTech changes a formula later, historical calculation information should not become impossible to trace. 

# **33. DETERMINISTIC CALCULATION** 

Given the same: 

- Raw specifications 

- Benchmark data 

- Benchmark version 

- Formula version 

the system must always produce the same score. 

There must be no randomness. 

There must be no subjective manual adjustment of individual phones unless an administrator explicitly overrides data or scoring configuration. 

# **34. SCORE PRECISION** 

Keep high precision internally. 

For example: 

```
Build = 8.274
Display = 17.842
Performance = 21.437
Cameras = 22.619
Battery = 16.882
```

Total: 

```
87.054
```

Only round when displaying the public score: 

```
FweezyTech Score: 87/100
```

Do not round every component before adding them. 

# **35. PUBLIC USER INTERFACE** 

The public website should show ONLY: 

# **FweezyTech Score: 87/100** 

Do NOT publicly display: 

- Build Quality score 

- Display score 

- Performance score 

- Camera score 

- Battery score 

- Processor score 

- RAM score 

- Storage score 

- Value score 

- Benchmark score 

- Internal weighting 

- Internal factors 

The detailed scoring methodology can be explained on a dedicated methodology page, but individual phone pages should primarily present the single final score. 

The goal is simplicity. 

# **36. ADMIN INTERFACE** 

The admin interface should show considerably more information. 

For a device, administrators should be able to see: 

```
FweezyTech Score: 87.34
Build Quality:
    IP Rating: 2.6
    Glass: 2.0
    Frame: 1.8
    Back: 1.5
Display:
    Display Type: 3.4
    Resolution: 3.2
    Refresh Rate: 2.7
    Brightness: 3.1
    HDR: 4.0
Performance:
    Processor: 16.2
    RAM: 2.5
    Storage: 3.4
...
```

This detailed information is for internal verification/debugging. 

It must not automatically appear publicly. 

# **37. SOURCE INFORMATION IN THE ADMIN PANEL** 

Every imported data group should make it possible to identify where the information came from. 

For example: 

```
Processor
Value:
Snapdragon 8 Elite Gen 5
Source:
GSMArena
```

```
Status:
Verified
```

And: 

```
Geekbench Single-Core
Value:
3,850
Source:
Geekbench Browser
Benchmark:
Geekbench 6
Status:
Verified
```

The admin should be able to replace or correct the source. 

# **38. DEVICE DATABASE AND RANKING DATABASE RELATIONSHIP** 

The developer should structure the database so that: 

### **Device table** 

Contains the phone itself. 

```
device_id
brand
model
variant
release_date
status
publication_status
```

### **Specification tables** 

Contain the actual hardware specifications. 

Examples: 

```
display_specs
performance_specs
camera_specs
battery_specs
build_specs
storage_specs
```

### **Processor/SoC table** 

Contains: 

```
soc_id
soc_name
manufacturer
CPU architecture
GPU
```

### **Processor benchmark table** 

Contains: 

```
soc_id
benchmark_name
benchmark_version
single_core
multi_core
gpu_score
source
source_reference
date
confidence
```

### **Ranking calculation table** 

Contains the generated internal calculation. 

```
device_id
scoring_version
benchmark_version
build_score
display_score
performance_score
camera_score
battery_score
final_score
calculated_at
```

Again, the ranking calculation is derived data. 

The raw specifications remain the source of truth. 

# **39. DEVICE VARIANTS** 

The database must handle variants correctly. 

For example: 

```
Phone A
```

```
8GB / 256GB
Phone A
12GB / 512GB
```

If RAM and storage differ, the ranking score may differ. 

The system should therefore support either: 

- Separate device variants, or 

- A clearly defined base device + variant-level specifications 

The developer must not accidentally assign the 12GB/512GB score to the 8GB/256GB model. 

The exact variant structure should integrate with the existing device-information database. 

# **40. REGIONAL VARIANTS** 

Different regions can sometimes have different: 

- Processors 

- RAM 

- Storage 

- Charging 

- Network capabilities 

- Camera configurations 

The database must support regional variants. 

The ranking must use the specifications of the actual variant being scored. 

Do not assume that every phone with the same model name has identical hardware. 

# **41. SOURCE CONFLICTS** 

If two reliable sources disagree: 

Example: 

```
Source A:
5000mAh
```

```
Source B:
5100mAh
```

The system must not silently choose one. 

The admin interface should flag the conflict. 

The administrator can then: 

1. Verify the manufacturer's specification 

2. Select the correct value 

3. Record the preferred source 

4. Publish the corrected data 

The ranking engine should only use the verified value. 

# **42. IMPORT INSTRUCTIONS FOR FUTURE AUTOMATION** 

The system should support administrator-defined import instructions. 

For example: 

```
Import phone specifications from approved sources.
Use manufacturer specifications as the primary authority
where officially documented.
```

```
Use GSMArena for additional specification coverage.
```

```
Use Geekbench Browser and NanoReview for processor
benchmark information.
```

```
Do not import benchmark numbers as permanent processor
scores.
```

```
Store benchmark values separately from raw device specifications.
```

```
All imported information must enter Draft.
```

```
Do not automatically publish.
```

```
Flag conflicting values.
```

```
Do not invent missing specifications.
```

```
Do not treat unknown as No.
```

```
After admin verification and publication, recalculate
the FweezyTech Score.
```

These source/import rules should be configurable rather than hardcoded into the application. 

# **43. WHAT HAPPENS WHEN A NEW PHONE IS IMPORTED** 

Example: 

### **New device** 

```
Xiaomi Phone X
```

The importer finds: 

```
Processor:
Snapdragon 8 Elite Gen 5
RAM:
12GB
Storage:
512GB
Display:
AMOLED
QHD+
120Hz
3000 nits
HDR10+
Battery:
6000mAh
120W
50W wireless
```

Camera data is also imported. 

Everything enters: 

#### **DRAFT** 

The administrator verifies the information. 

After publication: 

```
Device Data
    ↓
Processor Benchmark Lookup
    ↓
Scoring Engine
    ↓
Build = X
Display = X
Performance = X
Cameras = X
Battery = X
    ↓
```

```
FweezyTech Score = XX/100
```

# **44. WHAT HAPPENS WHEN A NEW PROCESSOR ARRIVES** 

Suppose a future processor is significantly faster than the current best. 

The admin adds: 

```
Future SoC X
```

to the SoC database. 

Benchmark information is imported: 

```
Single-Core
Multi-Core
GPU
```

The administrator verifies the data. 

The system determines that it is now the global benchmark. 

The benchmark table updates. 

The scoring engine recalculates affected processors. 

This means old phones can automatically receive lower performance scores without manually editing each phone. 

This is one of the most important characteristics of the FweezyTech ranking system. 

# **45. WHAT THE SYSTEM MUST NOT DO** 

Do NOT: 

- Create separate flagship/midrange/budget benchmarks 

- Compare phones only against phones in their price category 

- Include price 

- Include value for money 

- Use launch-era rankings 

- Give old flagships permanent advantages 

- Require FweezyTech to physically benchmark every phone 

- Use random benchmark results 

- Cherry-pick unusually high benchmark scores 

- Treat digital zoom as optical zoom 

- Reward camera count 

- Reward megapixels alone 

- Treat unknown specifications as absent hardware 

- Apply double penalties 

- Add extra ranking categories 

- Add extra components without changing this specification 

- Automatically publish imported information 

- Use Draft information in the public ranking 

- Hardcode processor scores permanently 

- Hardcode global benchmarks permanently 

# **46. FINAL CALCULATION** 

The final score must always be: 

```
FweezyTech Score =
Build Quality
+
Display
+
Performance
+
Cameras
+
Battery & Charging
```

Maximum: 

```
100
```

Minimum: 

```
0
```

The maximum category values are: 

```
Build Quality       10
Display             20
Performance         25
Cameras             25
Battery & Charging  20
TOTAL               100
```

# **47. OVERALL SYSTEM ARCHITECTURE** 

#### The final implementation should behave like this: 

```
                    EXTERNAL SOURCES
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
     Manufacturer       GSMArena       Benchmark Sources
          │                │          Geekbench / NanoReview
          │                │                 │
          └────────────────┼─────────────────┘
                           ↓
                    DATA IMPORTER
                           ↓
                         DRAFT
                           ↓
                 ADMIN VERIFICATION
                  / correction / images
                           ↓
                       PUBLISHED
                           ↓
                ┌──────────┴──────────┐
                │                     │
         DEVICE DATABASE        BENCHMARK DATABASE
                │                     │
                └──────────┬──────────┘
                           ↓
                    RANKING ENGINE
                           ↓
             ┌─────────────┼─────────────┐
             ↓             ↓             ↓
        Build Quality   Display      Performance
             ↓             ↓             ↓
             └─────────────┼─────────────┘
                           ↓
                    Cameras / Battery
                           ↓
                 FWEezyTECH SCORE
                           ↓
                       XX / 100
```

# **48. MOST IMPORTANT DEVELOPMENT PRINCIPLE** 

The **device database is the source of truth** . 

The ranking engine should never become another manually maintained specification database. 

If an administrator changes: 

```
Battery:
5000mAh → 5500mAh
```

the ranking engine should automatically use 5500mAh after the change is published. 

If: `Charging: 67W → 100W` the ranking should update. If: `Processor: SoC A → SoC B` the ranking should use the benchmark data associated with SoC B. If: `RAM: 8GB → 12GB` the performance score should update. Therefore: **One verified device database → One ranking engine.** Do not duplicate hardware data. 

# **49. FUTURE-PROOFING** 

The developer must build the scoring engine so that formulas and benchmark thresholds can be modified through configuration rather than requiring major code changes. 

For example: 

```
ranking_config
category
component
maximum_points
formula_version
benchmark_reference
factor_values
active
```

This allows FweezyTech to change: 

`Current best battery: 7500mAh` to: 

```
Current best battery:
8500mAh
```

without rewriting the entire application. 

Likewise: 

```
150W
```

can eventually become: 

```
240W
```

if charging technology advances. 

New glass technologies, RAM generations, storage generations, display technologies and other improvements should be able to be added to the hierarchy. 

# **50. ADMINISTRATOR CONTROL** 

The administrator must ultimately be able to control: 

- Approved data sources 

- Source priority 

- Benchmark sources 

- Benchmark versions 

- Benchmark reference values 

- Scoring formula versions 

- Technology hierarchies 

- Component factor values 

- Device verification 

- Data conflicts 

- Device publication 

- Recalculation 

- Ranking activation/deactivation 

However, normal device entry should remain simple. 

The administrator should primarily need to: 

**Import → Review → Correct → Add images → Publish** 

The system should handle the ranking calculations automatically. 

# **51. FINAL PRODUCT GOAL** 

The end result should be a FweezyTech phone database where: 

1. Phones are imported from approved sources. 

2. Imported information goes into Draft. 

3. Administrators verify and correct the information. 

4. Verified information is published. 

5. Processor benchmark information comes from external benchmark sources rather than FweezyTech testing every phone. 

6. The ranking engine reads the published specifications. 

7. The engine calculates the five categories. 

8. The five categories produce one final score out of 100. 

9. The score is absolute rather than price-relative. 

10. Global benchmarks evolve as technology improves. 

11. Old devices can automatically decline relative to modern hardware. 

12. New devices can automatically enter the ranking. 

13. Updating a device specification automatically updates its ranking. 

14. Updating benchmark standards can automatically recalculate affected devices. 

15. The public sees only the final FweezyTech Score. 

16. Administrators can see the detailed calculation and source information. 

17. Raw specifications, benchmark data, formulas and final scores remain logically separated. 

18. Every score is traceable to the underlying verified data and scoring/benchmark versions. 

The system should therefore function as a **living, continuously updated hardware database and ranking engine** , rather than a manually maintained list of phone scores. 

# **DYNAMIC GLOBAL BENCHMARK PRINCIPLE — CRITICAL** 

The FweezyTech Score is designed to measure a phone's **absolute hardware capability relative to the best technology available at the time the score is being calculated** . 

It is NOT a historical score that permanently reflects how good a phone was when it launched. 

### **Core principle** 

**A 2019 flagship can therefore score below a 2026 midrange phone if the 2026 phone genuinely offers greater absolute capability.** 

The system must never assume: 

"This was a flagship, therefore it must always score higher than a midrange phone." 

The ranking is based on **actual hardware capability** , not the phone's original market position, launch price, branding, or reputation. 

For example, if a 2026 midrange phone has: 

- A significantly faster processor 

- A better display 

- Higher brightness 

- More capable charging 

- More advanced storage 

- Better battery capacity 

- Or other objectively superior hardware within the defined scoring components 

then it is completely acceptable for that 2026 midrange phone to receive a higher FweezyTech Score than a 2019 flagship. 

### **The score must naturally move downward over time** 

The score should naturally move downward over time as smartphone technology advances. 

This is accomplished through the **dynamic global benchmark system** . 

The benchmark for each scalable component represents the best relevant technology currently available. 

When substantially better technology becomes available, the global benchmark can move upward. 

As the benchmark moves upward, older devices automatically become relatively less capable and their scores can decrease. 

For example: 

```
2026:
```

```
Current best processor = Processor A
```

```
Processor A → 18/18
Processor B → 16/18
Processor C → 13/18
```

If a substantially faster Processor D launches: 

```
Later:
```

```
Current best processor = Processor D
```

```
Processor D → 18/18
Processor A → lower score
Processor B → lower score
Processor C → lower score
```

The administrator should NOT have to manually downgrade every older phone. 

The ranking engine should calculate this automatically from the updated global benchmarks. 

### **No artificial preservation of old scores** 

Do NOT freeze a phone's score at its launch score. 

Do NOT preserve a phone's historical ranking merely because it was once considered a flagship. 

Do NOT give older devices a permanent advantage because they were expensive when released. 

Do NOT create separate historical benchmark standards for different years. 

The same current scoring methodology should be applied consistently across devices. 

### **Long-term usefulness** 

The goal is for the **FweezyTech Score to remain useful years after a phone's launch, while requiring minimal manual maintenance** . 

A user looking at a phone in 2029 should be able to understand its FweezyTech Score as an indication of how capable that phone is **by the standards relevant at that time** , rather than how impressive its hardware was when it originally launched. 

### **Important distinction** 

The score is therefore: 

**Current absolute capability** 

NOT: 

**Historical performance** 

NOT: 

**Value for money** 

NOT: 

#### **Launch-era quality** 

NOT: 

#### **Flagship status** 

NOT: 

#### **Price-to-performance** 

### **Implementation requirement** 

The developer must design the scoring engine around this principle from the beginning. 

The global benchmarks, technology hierarchies and scoring formulas must be configurable and versioned. 

When new technology changes what "best available hardware" means, the benchmark configuration can be updated and the affected device scores recalculated automatically. 

This principle is fundamental to the FweezyTech ranking system and must not be changed without explicitly redesigning the ranking methodology. 

