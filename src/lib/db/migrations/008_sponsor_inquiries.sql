CREATE TABLE IF NOT EXISTS sponsor_inquiries (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  company         TEXT NOT NULL,
  website         TEXT,
  budget_range    TEXT NOT NULL,
  message         TEXT NOT NULL,
  email           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacted','declined','closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only service role can read (no public access)
ALTER TABLE sponsor_inquiries ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = no public reads
-- INSERT via service role key only (API route uses service role)

CREATE INDEX IF NOT EXISTS inquiries_status_idx    ON sponsor_inquiries(status);
CREATE INDEX IF NOT EXISTS inquiries_created_idx   ON sponsor_inquiries(created_at);