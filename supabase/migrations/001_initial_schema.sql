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
  big_score DECIMAL(3,2) DEFAULT 3.0,
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
  current_user_score DECIMAL;
BEGIN
  -- Get user's current score to apply relative friction
  SELECT big_score INTO current_user_score FROM users WHERE id = target_user_id;
  current_user_score := COALESCE(current_user_score, 0);

  WITH weighted_ratings AS (
    SELECT 
      r.score,
      CASE ip.type
        WHEN 'meet' THEN 1.0
        WHEN 'gps_proximity' THEN 1.0
        WHEN 'call' THEN 0.7
        WHEN 'chat' THEN 0.4
        ELSE 0.4
      END AS type_weight,
      -- Recency: Ratings older than 30 days lose 70% of impact
      GREATEST(0.3, 1 - (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / (30 * 24 * 3600))) AS recency_weight,
      -- Rater Gravity (Nosedive): High-index users have exponentially more power
      -- Cold-start: If rater has 0.0, we treat them as 2.5 (neutral influence)
      POWER(4.0, (CASE WHEN COALESCE(rater.big_score, 0) = 0 THEN 2.5 ELSE rater.big_score END) - 3.5) AS rater_weight,
      -- Friction: Low scores from high users pull harder than high scores push up
      CASE 
        WHEN r.score < current_user_score AND current_user_score > 4.0 THEN 1.8 -- Downward drag for high-tier users
        WHEN r.score > current_user_score AND current_user_score > 4.5 THEN 0.4 -- Harder to climb above 4.5
        ELSE 1.0
      END AS friction_multiplier
    FROM ratings r
    JOIN interaction_passes ip ON r.pass_id = ip.id
    JOIN users rater ON r.rater_id = rater.id
    WHERE r.ratee_id = target_user_id
      AND r.revealed = TRUE
    ORDER BY r.created_at DESC
    LIMIT 200
  )
  SELECT 
    COALESCE(
      SUM(score * type_weight * recency_weight * rater_weight * friction_multiplier) / 
      NULLIF(SUM(type_weight * recency_weight * rater_weight * friction_multiplier), 0),
      0
    )
  INTO final_score
  FROM weighted_ratings;
  
  -- Final score normalization (ensure it stays between 0 and 5)
  RETURN ROUND(GREATEST(0, LEAST(COALESCE(final_score, 0), 5.0)), 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_reveal_ratings()
RETURNS TRIGGER AS $$
DECLARE
  ratee_ids UUID[];
  target_id UUID;
BEGIN
  -- Check if both parties have rated the same pass
  IF (
    SELECT COUNT(DISTINCT rater_id) 
    FROM ratings 
    WHERE pass_id = NEW.pass_id
  ) >= 2 THEN
    -- Reveal both ratings
    UPDATE ratings SET revealed = TRUE WHERE pass_id = NEW.pass_id;
    
    -- Identify the users who need score updates (both participants in the pass)
    SELECT ARRAY_AGG(DISTINCT ratee_id) INTO ratee_ids 
    FROM ratings 
    WHERE pass_id = NEW.pass_id;

    -- Update each user's score ensuring it reflects the newly revealed ratings
    FOREACH target_id IN ARRAY ratee_ids
    LOOP
      UPDATE users SET 
        big_score = calculate_user_score(target_id),
        total_ratings = (SELECT COUNT(*) FROM ratings WHERE ratee_id = target_id AND revealed = TRUE),
        updated_at = NOW()
      WHERE id = target_id;
    END LOOP;
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

-- ENABLE REALTIME FOR KEY TABLES
-- Note: This is required for payload filters in client-side listeners
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE connections, interaction_passes, ratings, users;
COMMIT;
