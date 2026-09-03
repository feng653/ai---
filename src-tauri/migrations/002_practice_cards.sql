ALTER TABLE cards ADD COLUMN kind TEXT NOT NULL DEFAULT 'mistake'
  CHECK (kind IN ('mistake', 'practice'));

CREATE TABLE IF NOT EXISTS practice_card_sources (
  practice_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  source_card_id TEXT NOT NULL,
  source_revision INTEGER NOT NULL CHECK (source_revision >= 1),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (practice_card_id, source_card_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_sources_card_id
  ON practice_card_sources(practice_card_id);

PRAGMA user_version = 2;
