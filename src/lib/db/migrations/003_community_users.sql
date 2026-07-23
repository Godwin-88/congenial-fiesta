-- Community user profiles (mirrors Supabase Auth users)
-- Supabase Auth handles passwords/OAuth — this stores public profile data only
CREATE TABLE IF NOT EXISTS community_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL DEFAULT 'FweezyFan',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on new Supabase Auth user signup
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.community_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'FweezyFan'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- RLS
ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON community_profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON community_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update their own profile" ON community_profiles;
CREATE POLICY "Users can update their own profile"
  ON community_profiles FOR UPDATE USING (auth.uid() = id);