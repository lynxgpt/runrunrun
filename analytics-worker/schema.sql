CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event TEXT NOT NULL,
  session_id TEXT NOT NULL,
  path TEXT,
  referrer TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  ip TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  latitude TEXT,
  longitude TEXT,
  timezone TEXT,
  user_agent TEXT,
  device_json TEXT,
  origin TEXT
);

CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits (created_at);
CREATE INDEX IF NOT EXISTS idx_visits_session_id ON visits (session_id);
CREATE INDEX IF NOT EXISTS idx_visits_event ON visits (event);
