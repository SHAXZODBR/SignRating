CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS interaction_passes CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  big_score DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_updated_at TIMESTAMPTZ,
  is_test BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

CREATE TABLE interaction_passes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('meet', 'call', 'chat', 'gps_proximity')),
  user_a UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pass_id UUID REFERENCES interaction_passes(id) ON DELETE CASCADE,
  rater_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ratee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  revealed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pass_id, rater_id)
);

CREATE TABLE blocks (
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE OR REPLACE FUNCTION calculate_user_score(target_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  final_score DECIMAL;
BEGIN
  WITH weighted_ratings AS (
    SELECT 
      r.score,
      CASE ip.type
        WHEN 'meet' THEN 1.0
        WHEN 'gps_proximity' THEN 1.0
        WHEN 'call' THEN 0.6
        WHEN 'chat' THEN 0.4
        ELSE 0.4
      END AS type_weight,
      GREATEST(0.3, 1 + (0.5 * (1 - EXTRACT(EPOCH FROM (NOW() - r.created_at)) / (30 * 24 * 3600)))) AS recency_weight,
      POWER(2.0, COALESCE(rater.big_score, 2.5) - 4.0) AS rater_weight
    FROM ratings r
    JOIN interaction_passes ip ON r.pass_id = ip.id
    JOIN users rater ON r.rater_id = rater.id
    WHERE r.ratee_id = target_user_id
      AND r.revealed = TRUE
    ORDER BY r.created_at DESC
    LIMIT 100
  )
  SELECT 
    COALESCE(
      SUM(score * type_weight * recency_weight * rater_weight) / 
      NULLIF(SUM(type_weight * recency_weight * rater_weight), 0),
      0
    )
  INTO final_score
  FROM weighted_ratings;
  
  RETURN ROUND(LEAST(COALESCE(final_score, 0), 5.0), 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_reveal_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(DISTINCT rater_id) 
    FROM ratings 
    WHERE pass_id = NEW.pass_id
  ) >= 2 THEN
    UPDATE ratings SET revealed = TRUE WHERE pass_id = NEW.pass_id;
    
    UPDATE users SET 
      big_score = calculate_user_score(id),
      total_ratings = (SELECT COUNT(*) FROM ratings WHERE ratee_id = users.id AND revealed = TRUE)
    WHERE id IN (
      SELECT ratee_id FROM ratings WHERE pass_id = NEW.pass_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_reveal
AFTER INSERT ON ratings
FOR EACH ROW
EXECUTE FUNCTION auto_reveal_ratings();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id OR is_test = true);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id OR is_test = true);

CREATE POLICY "Users can see own connections" ON connections FOR SELECT 
  USING (auth.uid() = user_a OR auth.uid() = user_b OR (SELECT is_test FROM users WHERE id = user_a) OR (SELECT is_test FROM users WHERE id = user_b));
CREATE POLICY "Users can create connections" ON connections FOR INSERT 
  WITH CHECK (auth.uid() = user_a OR (SELECT is_test FROM users WHERE id = user_a));
CREATE POLICY "Users can update own connections" ON connections FOR UPDATE 
  USING (auth.uid() = user_a OR auth.uid() = user_b OR (SELECT is_test FROM users WHERE id = user_a) OR (SELECT is_test FROM users WHERE id = user_b));

CREATE POLICY "Users can see own passes" ON interaction_passes FOR SELECT 
  USING (auth.uid() = user_a OR auth.uid() = user_b OR (SELECT is_test FROM users WHERE id = user_a) OR (SELECT is_test FROM users WHERE id = user_b));
CREATE POLICY "Users can create passes" ON interaction_passes FOR INSERT 
  WITH CHECK (auth.uid() = user_a OR (SELECT is_test FROM users WHERE id = user_a));

CREATE POLICY "Users can update own passes" ON interaction_passes FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b OR (SELECT is_test FROM users WHERE id = user_a) OR (SELECT is_test FROM users WHERE id = user_b));

CREATE POLICY "Users can see revealed ratings" ON ratings FOR SELECT 
  USING (revealed = TRUE OR rater_id = auth.uid() OR (SELECT is_test FROM users WHERE id = rater_id));
CREATE POLICY "Users can create ratings" ON ratings FOR INSERT 
  WITH CHECK (auth.uid() = rater_id OR (SELECT is_test FROM users WHERE id = rater_id));

CREATE POLICY "Users can manage own blocks" ON blocks FOR ALL 
  USING (auth.uid() = blocker_id OR (SELECT is_test FROM users WHERE id = blocker_id));

CREATE INDEX IF NOT EXISTS idx_connections_user_a ON connections(user_a);
CREATE INDEX IF NOT EXISTS idx_connections_user_b ON connections(user_b);
CREATE INDEX IF NOT EXISTS idx_passes_users ON interaction_passes(user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_ratings_ratee ON ratings(ratee_id);
CREATE INDEX IF NOT EXISTS idx_ratings_pass ON ratings(pass_id);
CREATE INDEX IF NOT EXISTS idx_users_score ON users(big_score DESC);
