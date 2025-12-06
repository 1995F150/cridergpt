-- Create character_references table for storing character data with modular placeholders
CREATE TABLE public.character_references (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    pronouns TEXT DEFAULT 'they/them',
    era TEXT,
    description TEXT,
    traits TEXT,  -- Editable text placeholder for character traits
    context TEXT,  -- Editable text placeholder for additional context
    reference_photo_url TEXT NOT NULL,
    reference_photo_path TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,  -- System characters like Jessie and Dr. Harman
    generation_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create background_datasets table for future expansion
CREATE TABLE public.background_datasets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,  -- 'location', 'house', 'gang', etc.
    description TEXT,
    reference_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create media_generations table to track all generations
CREATE TABLE public.media_generations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    prompt TEXT NOT NULL,
    unified_prompt TEXT,
    output_type TEXT NOT NULL DEFAULT 'image',  -- 'image' or 'video'
    output_url TEXT,
    output_path TEXT,
    character_ids UUID[],
    style TEXT,
    visual_settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.character_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for character_references
CREATE POLICY "Users can view system characters and their own"
    ON public.character_references FOR SELECT
    USING (is_system = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own characters"
    ON public.character_references FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters"
    ON public.character_references FOR UPDATE
    USING (auth.uid() = user_id OR is_system = false);

-- RLS Policies for background_datasets (public read)
CREATE POLICY "Anyone can view backgrounds"
    ON public.background_datasets FOR SELECT
    USING (true);

-- RLS Policies for media_generations
CREATE POLICY "Users can view their own generations"
    ON public.media_generations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create generations"
    ON public.media_generations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Insert system characters
INSERT INTO public.character_references (name, slug, pronouns, era, description, traits, context, reference_photo_url, is_primary, is_system)
VALUES 
    ('Jessie Crider', 'jessie', 'he/him', 'Modern', 'Primary character - creator of CriderGPT', 
     'Rural high school student, FFA member, tech enthusiast, farmer', 
     'Creator and primary subject for all generations. Default character when none specified.',
     '/creator-reference.png', true, true),
    ('Dr. Harman', 'dr-harman', 'he/him', '1900s Western', '3rd great-grandfather - historical Western era',
     'Historical figure, Western era, bearded, period-appropriate clothing',
     'Reference photo is from early 1900s. Apply vintage texture, film grain, B&W unless color explicitly requested. Never modernize or smooth features.',
     '/dr-harman-reference.png', false, true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_character_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_character_references_timestamp
    BEFORE UPDATE ON public.character_references
    FOR EACH ROW
    EXECUTE FUNCTION update_character_references_updated_at();