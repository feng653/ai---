PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  supplemental_note TEXT NOT NULL,
  solution TEXT NOT NULL,
  error_location TEXT NOT NULL,
  error_reason TEXT NOT NULL,
  error_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'organized')),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS card_assets (
  id TEXT PRIMARY KEY,
  card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sha256 TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  chapter TEXT,
  name TEXT NOT NULL,
  normalized_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS card_knowledge_points (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  knowledge_point_id TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  PRIMARY KEY (card_id, knowledge_point_id)
);

CREATE TABLE IF NOT EXISTS draft_sessions (
  id TEXT PRIMARY KEY,
  card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
  base_revision INTEGER,
  form_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_runs (
  id TEXT PRIMARY KEY,
  card_id TEXT REFERENCES cards(id) ON DELETE SET NULL,
  state TEXT NOT NULL,
  base_revision INTEGER,
  provider TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  input_snapshot_json TEXT NOT NULL,
  proposal_json TEXT,
  proposal_state TEXT,
  accepted_fields_json TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_updated_at ON cards(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_assets_card_id ON card_assets(card_id);
CREATE INDEX IF NOT EXISTS idx_card_kp_card_id ON card_knowledge_points(card_id);
CREATE INDEX IF NOT EXISTS idx_card_kp_kp_id ON card_knowledge_points(knowledge_point_id);

PRAGMA user_version = 1;
