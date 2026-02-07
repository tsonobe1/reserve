CREATE TABLE IF NOT EXISTS reserves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT,
  reserved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO reserves (name, contact)
VALUES
  ('Sample Guest', 'sample@example.com')
ON CONFLICT DO NOTHING;
