CREATE TABLE IF NOT EXISTS knowledge_cards (
  key TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  chapter TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'saved')),
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_cards_updated_at
  ON knowledge_cards(updated_at DESC);

PRAGMA user_version = 3;
