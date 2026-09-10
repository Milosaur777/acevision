-- Supabase SQL Schema for AceVision Tennis Dashboard
-- Run this in Supabase SQL Editor

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT DEFAULT '',
  hand TEXT DEFAULT 'R' CHECK (hand IN ('L', 'R')),
  birth_date DATE,
  height_cm INTEGER,
  play_style TEXT,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  best_surfaces TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tourney_name TEXT DEFAULT '',
  surface TEXT DEFAULT '',
  tourney_date TEXT DEFAULT '',
  round TEXT DEFAULT '',
  player1_id TEXT REFERENCES players(id),
  player2_id TEXT REFERENCES players(id),
  winner_id TEXT REFERENCES players(id),
  score TEXT DEFAULT '',
  minutes INTEGER,

  p1_ace INTEGER DEFAULT 0,
  p1_df INTEGER DEFAULT 0,
  p1_svpt INTEGER DEFAULT 0,
  p1_1stIn INTEGER DEFAULT 0,
  p1_1stWon INTEGER DEFAULT 0,
  p1_2ndWon INTEGER DEFAULT 0,
  p1_SvGms INTEGER DEFAULT 0,
  p1_bpSaved INTEGER DEFAULT 0,
  p1_bpFaced INTEGER DEFAULT 0,

  p2_ace INTEGER DEFAULT 0,
  p2_df INTEGER DEFAULT 0,
  p2_svpt INTEGER DEFAULT 0,
  p2_1stIn INTEGER DEFAULT 0,
  p2_1stWon INTEGER DEFAULT 0,
  p2_2ndWon INTEGER DEFAULT 0,
  p2_SvGms INTEGER DEFAULT 0,
  p2_bpSaved INTEGER DEFAULT 0,
  p2_bpFaced INTEGER DEFAULT 0
);

-- Player notes (private insights)
CREATE TABLE IF NOT EXISTS player_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('strength', 'weakness', 'tactic', 'surface')),
  content TEXT NOT NULL,
  confidence INTEGER DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI predictions
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT,
  player1_id TEXT REFERENCES players(id),
  player2_id TEXT REFERENCES players(id),
  predicted_winner_id TEXT REFERENCES players(id),
  confidence DECIMAL(5,4),
  reasoning TEXT DEFAULT '',
  tactics_player1 TEXT DEFAULT '',
  tactics_player2 TEXT DEFAULT '',
  surface TEXT,
  tournament TEXT,
  ai_model TEXT DEFAULT 'gemini-flash',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player images (fas 2)
CREATE TABLE IF NOT EXISTS player_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source TEXT CHECK (source IN ('atp', 'wta')),
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(tourney_date);
CREATE INDEX IF NOT EXISTS idx_player_notes_player ON player_notes(player_id);
CREATE INDEX IF NOT EXISTS idx_predictions_player1 ON predictions(player1_id);
CREATE INDEX IF NOT EXISTS idx_predictions_player2 ON predictions(player2_id);
CREATE INDEX IF NOT EXISTS idx_player_images_player ON player_images(player_id);

-- Row Level Security (RLS) — Enable per-table
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_images ENABLE ROW LEVEL SECURITY;

-- Allow anon read access (dashboard is public for now)
CREATE POLICY "Allow public read on players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public read on matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public read on player_notes" ON player_notes FOR SELECT USING (true);
CREATE POLICY "Allow public read on predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Allow public read on player_images" ON player_images FOR SELECT USING (true);

-- Allow anon write access (no auth in Phase 1)
CREATE POLICY "Allow anon insert on players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on players" ON players FOR UPDATE USING (true);
CREATE POLICY "Allow anon insert on matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on matches" ON matches FOR UPDATE USING (true);
CREATE POLICY "Allow anon insert on player_notes" ON player_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on player_notes" ON player_notes FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete on player_notes" ON player_notes FOR DELETE USING (true);
CREATE POLICY "Allow anon insert on predictions" ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert on player_images" ON player_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on player_images" ON player_images FOR UPDATE USING (true);
