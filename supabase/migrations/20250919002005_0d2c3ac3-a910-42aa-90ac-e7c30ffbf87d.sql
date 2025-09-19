-- Fix Crider Chat social media platform tables

-- Users table for social features (fixed)
CREATE TABLE IF NOT EXISTS public.crider_chat_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    location JSONB,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
    is_synced BOOLEAN DEFAULT TRUE,
    sync_note TEXT DEFAULT 'Connected to Crider Chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table with ephemeral support
CREATE TABLE IF NOT EXISTS public.crider_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'video')),
    is_ephemeral BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.crider_chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crider_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crider_chat_users
CREATE POLICY "Users can view all crider chat users" ON public.crider_chat_users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own crider chat profile" ON public.crider_chat_users
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own crider chat profile" ON public.crider_chat_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for crider_chat_messages  
CREATE POLICY "Users can view all messages" ON public.crider_chat_messages
    FOR SELECT USING (true);

CREATE POLICY "Users can send messages" ON public.crider_chat_messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON public.crider_chat_messages
    FOR DELETE USING (user_id = auth.uid());