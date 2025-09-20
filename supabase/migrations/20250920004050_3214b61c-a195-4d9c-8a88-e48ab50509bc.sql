-- Create table for CriderGPT training data
CREATE TABLE public.cridergpt_training_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  data_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cridergpt_training_data ENABLE ROW LEVEL SECURITY;

-- Allow service role full access for system operations
CREATE POLICY "Service role can manage training data" 
ON public.cridergpt_training_data 
FOR ALL 
USING (true);

-- Allow authenticated users to view training data
CREATE POLICY "Users can view training data" 
ON public.cridergpt_training_data 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_cridergpt_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cridergpt_training_updated_at
  BEFORE UPDATE ON public.cridergpt_training_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cridergpt_training_updated_at();