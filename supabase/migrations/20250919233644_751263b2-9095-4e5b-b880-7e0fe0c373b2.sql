-- Create stories table for social media posts
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT DEFAULT 'text', -- text, image, video
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  views_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create blocked_users table for friendship management
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create story_views table to track who viewed stories
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Create user_follow table for follow/unfollow functionality
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS on new tables
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
CREATE POLICY "Users can create their own stories" 
ON public.stories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view stories from friends and public" 
ON public.stories 
FOR SELECT 
USING (
  is_active = true 
  AND expires_at > now() 
  AND (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.friendships 
      WHERE (user1_id = auth.uid() AND user2_id = stories.user_id) 
         OR (user2_id = auth.uid() AND user1_id = stories.user_id)
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.blocked_users 
      WHERE blocker_id = stories.user_id AND blocked_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own stories" 
ON public.stories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
ON public.stories 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for blocked_users
CREATE POLICY "Users can block others" 
ON public.blocked_users 
FOR INSERT 
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view their own blocks" 
ON public.blocked_users 
FOR SELECT 
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others" 
ON public.blocked_users 
FOR DELETE 
USING (auth.uid() = blocker_id);

-- RLS Policies for story_views
CREATE POLICY "Users can create story views" 
ON public.story_views 
FOR INSERT 
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Story owners can see who viewed their stories" 
ON public.story_views 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = story_views.story_id 
    AND stories.user_id = auth.uid()
  )
);

-- RLS Policies for user_follows
CREATE POLICY "Users can follow others" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can view follows they are involved in" 
ON public.user_follows 
FOR SELECT 
USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can unfollow others" 
ON public.user_follows 
FOR DELETE 
USING (auth.uid() = follower_id);

-- Add indexes for performance
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_active_expires ON public.stories(is_active, expires_at);
CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);
CREATE INDEX idx_story_views_story ON public.story_views(story_id);
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);

-- Function to automatically increment story view count
CREATE OR REPLACE FUNCTION public.increment_story_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stories 
  SET views_count = views_count + 1 
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment views when someone views a story
CREATE TRIGGER increment_story_views_trigger
AFTER INSERT ON public.story_views
FOR EACH ROW
EXECUTE FUNCTION public.increment_story_views();

-- Function to clean up expired stories
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  UPDATE public.stories 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;