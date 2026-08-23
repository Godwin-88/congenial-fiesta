-- 018: add specs_network section, remove synthetic benchmarks entirely
ALTER TABLE devices ADD COLUMN IF NOT EXISTS specs_network JSONB DEFAULT '{}'::jsonb;

ALTER TABLE devices
  DROP COLUMN IF EXISTS benchmark_geekbench_single,
  DROP COLUMN IF EXISTS benchmark_geekbench_multi,
  DROP COLUMN IF EXISTS benchmark_antutu,
  DROP COLUMN IF EXISTS benchmark_pcmark;
