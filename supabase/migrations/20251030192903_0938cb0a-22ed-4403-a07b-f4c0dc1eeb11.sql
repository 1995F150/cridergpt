-- Create vision_memory table for tracking analyzed images
CREATE TABLE public.vision_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  ai_response TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vision_memory ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own vision memory"
ON public.vision_memory
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vision memory"
ON public.vision_memory
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vision memory"
ON public.vision_memory
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vision memory"
ON public.vision_memory
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_vision_memory_user_id ON public.vision_memory(user_id);
CREATE INDEX idx_vision_memory_category ON public.vision_memory(category);
CREATE INDEX idx_vision_memory_created_at ON public.vision_memory(created_at DESC);

-- Create function to update timestamps
CREATE TRIGGER update_vision_memory_updated_at
BEFORE UPDATE ON public.vision_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();