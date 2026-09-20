'use client'
import { useEffect, useState } from 'react'

export interface ScoreWeights {
  display: number
  performance: number
  camera: number
  battery: number
  value: number
}

const FALLBACK_WEIGHTS: ScoreWeights = {
  display: 0.2, performance: 0.25, camera: 0.25, battery: 0.15, value: 0.15,
}

/**
 * Live manual-score weights — same `site_settings` rows the admin API reads
 * (`getScoreWeights`), so the form's Overall Score is computed with identical
 * inputs to the stored `scores_overall` (§48: admin vs agent discrepancy is
 * not hidden by two different weight sources).
 */
export default function useScoreWeights(): ScoreWeights {
  const [weights, setWeights] = useState<ScoreWeights>(FALLBACK_WEIGHTS)
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled || !body) return
        // GET /api/admin/settings returns { data: site_settings row }.
        const s = (body?.data ?? {}) as Record<string, number | null>
        if (s.score_weight_display == null && s.score_weight_performance == null) return
        setWeights({
          display: s.score_weight_display ?? 0.2,
          performance: s.score_weight_performance ?? 0.25,
          camera: s.score_weight_camera ?? 0.25,
          battery: s.score_weight_battery ?? 0.15,
          value: s.score_weight_value ?? 0.15,
        })
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  return weights
}
