-- ============================================
-- 用户资料系统
-- ============================================

-- 用户资料表
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio          TEXT DEFAULT '',
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles (display_name);

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(SPLIT_PART(NEW.email, '@', 1), 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果触发器已存在则替换
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 为已有用户补建 profile
INSERT INTO public.profiles (user_id, display_name)
SELECT id, COALESCE(SPLIT_PART(email, '@', 1), 'User')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 好友系统
-- ============================================

CREATE TABLE IF NOT EXISTS public.friendships (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships (user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships (friend_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
  ON public.friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
