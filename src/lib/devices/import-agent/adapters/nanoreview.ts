// Source adapter: NanoReview (chipset identification + benchmarks).
// ============================================================================
// Spec §10c + Ranking §12a/§15: NanoReview provides processor performance
// data. Results are stored in `chipset_benchmarks` — SEPARATELY from raw
// device specs — and aggregated by median, never cherry-picked.
//
// NanoReview has no public documented API; this adapter uses their public
// search page's embedded JSON (best-effort, replaceable). Seeded INACTIVE.
//
// KNOWN BLOCKER (2026-09-19): nanoreview.net returns HTTP 403 to every
// server-side fetch (both a bot and a plain browser UA) — same class of
// protection as GSMArena's search endpoint. Until an API key / allowed UA is
// arranged, `chipset_benchmarks` stays empty and processorScore correctly
// reports 0 known points (see formula.ts). The chipset ROWS still seed from
// device data so matching works the moment benchmarks arrive.


const BASE_URL = 'https://nanoreview.net'
const UA = 'Mozilla/5.0 (compatible; FweezyTechImportBot/1.0; +https://fweezytech.com/bot)'

export interface ChipsetBenchmarkInput {
  chipset_name: string
  benchmark_name: string // 'geekbench6' | 'antutu10'
  single_core: number | null
  multi_core: number | null
  gpu_score: number | null
  source_label: string
  source_url: string
  date_collected: string | null
}

async function getPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

/** Best-effort extraction of Geekbench6 scores from a NanoReview SoC page. */
export function extractScores(html: string): {
  single_core: number | null
  multi_core: number | null
  gpu_score: number | null
} {
  const num = (s: string | undefined): number | null => {
    if (!s) return null
    const m = s.replace(/[,\s]/g, '').match(/\d+(?:\.\d+)?/)
    return m ? Number(m[0]) : null
  }
  return {
    single_core: num(html.match(/single[- ]core[^0-9]{0,40}(\d[\d,\s]*)/i)?.[1]),
    multi_core: num(html.match(/multi[- ]core[^0-9]{0,40}(\d[\d,\s]*)/i)?.[1]),
    gpu_score: null,
  }
}


export function createNanoReviewAdapter() {
  return {
    slug: 'nanoreview',
    label: 'NanoReview (chipset benchmarks)',
    isConfigured: () => process.env.NANOREVIEW_IMPORT_ENABLED === 'true',

    async fetchChipsetBenchmarks(chipsetName: string): Promise<ChipsetBenchmarkInput[]> {
      const searchHtml = await getPage(
        `${BASE_URL}/search?query=${encodeURIComponent(chipsetName)}`,
      )
      if (!searchHtml) return []
      // First plausible SoC detail link, e.g. /cpu-soc/qualcomm-snapdragon-8-elite-gen-5
      const link = searchHtml.match(/href="(\/cpu-soc\/[^"]+)"/)?.[1]
      if (!link) return []
      const pageHtml = await getPage(`${BASE_URL}${link}`)
      if (!pageHtml) return []
      const scores = extractScores(pageHtml)
      const today = new Date().toISOString().slice(0, 10)
      const out: ChipsetBenchmarkInput[] = []
      if (scores.single_core != null || scores.multi_core != null) {
        out.push({
          chipset_name: chipsetName,
          benchmark_name: 'geekbench6',
          single_core: scores.single_core,
          multi_core: scores.multi_core,
          gpu_score: scores.gpu_score,
          source_label: 'NanoReview',
          source_url: `${BASE_URL}${link}`,
          date_collected: today,
        })
      }
      return out
    },
  }
}
