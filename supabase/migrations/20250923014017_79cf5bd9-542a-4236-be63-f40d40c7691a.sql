-- Create training_inputs table
CREATE TABLE public.training_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'agriculture',
  content TEXT NOT NULL,
  category TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calculator_records table
CREATE TABLE public.calculator_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  calculator_type TEXT NOT NULL,
  input_data JSONB NOT NULL,
  result_data JSONB NOT NULL,
  ffa_project_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL DEFAULT 'correction',
  original_data JSONB,
  corrected_data JSONB,
  calculator_record_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ffa_projects table if not exists
CREATE TABLE IF NOT EXISTS public.ffa_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL DEFAULT 'sae',
  description TEXT,
  start_date DATE,
  end_date DATE,
  hours_logged DECIMAL DEFAULT 0,
  expenses DECIMAL DEFAULT 0,
  income DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table if not exists
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  related_project_id UUID,
  related_calculator_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table if not exists
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_name TEXT,
  total_amount DECIMAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  ffa_project_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ffa_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_inputs
CREATE POLICY "Users can manage their own training inputs" ON public.training_inputs
FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for calculator_records
CREATE POLICY "Users can manage their own calculator records" ON public.calculator_records
FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for feedback
CREATE POLICY "Users can manage their own feedback" ON public.feedback
FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for ffa_projects
CREATE POLICY "Users can manage their own FFA projects" ON public.ffa_projects
FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for documents
CREATE POLICY "Users can manage their own documents" ON public.documents
FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for invoices
CREATE POLICY "Users can manage their own invoices" ON public.invoices
FOR ALL USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.calculator_records 
ADD CONSTRAINT fk_calculator_ffa_project 
FOREIGN KEY (ffa_project_id) REFERENCES public.ffa_projects(id) ON DELETE SET NULL;

ALTER TABLE public.feedback 
ADD CONSTRAINT fk_feedback_calculator 
FOREIGN KEY (calculator_record_id) REFERENCES public.calculator_records(id) ON DELETE SET NULL;

ALTER TABLE public.documents 
ADD CONSTRAINT fk_documents_project 
FOREIGN KEY (related_project_id) REFERENCES public.ffa_projects(id) ON DELETE SET NULL;

ALTER TABLE public.documents 
ADD CONSTRAINT fk_documents_calculator 
FOREIGN KEY (related_calculator_id) REFERENCES public.calculator_records(id) ON DELETE SET NULL;

ALTER TABLE public.invoices 
ADD CONSTRAINT fk_invoices_project 
FOREIGN KEY (ffa_project_id) REFERENCES public.ffa_projects(id) ON DELETE SET NULL;

-- Add calculator and document limits to usage_controls
ALTER TABLE public.usage_controls 
ADD COLUMN IF NOT EXISTS daily_calculator_limit INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS daily_calculator_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_document_limit INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS daily_document_used INTEGER DEFAULT 0;

-- Create function to check and record calculator usage
CREATE OR REPLACE FUNCTION public.can_use_calculator(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  usage_data public.usage_controls%ROWTYPE;
  user_plan text;
BEGIN
  -- Get or create usage controls
  SELECT * INTO usage_data FROM public.usage_controls WHERE user_id = user_uuid;
  
  IF usage_data.id IS NULL THEN
    SELECT COALESCE(tier, 'free') INTO user_plan FROM public.profiles WHERE user_id = user_uuid;
    
    INSERT INTO public.usage_controls (
      user_id, plan_name, daily_calculator_limit, daily_document_limit
    ) VALUES (
      user_uuid,
      COALESCE(user_plan, 'free'),
      CASE COALESCE(user_plan, 'free') WHEN 'free' THEN 5 WHEN 'plus' THEN 25 WHEN 'pro' THEN 10000 ELSE 5 END,
      CASE COALESCE(user_plan, 'free') WHEN 'free' THEN 2 WHEN 'plus' THEN 10 WHEN 'pro' THEN 10000 ELSE 2 END
    )
    RETURNING * INTO usage_data;
  END IF;
  
  -- Reset daily usage if new day
  IF usage_data.last_reset_date < CURRENT_DATE THEN
    UPDATE public.usage_controls
    SET daily_calculator_used = 0, daily_document_used = 0, last_reset_date = CURRENT_DATE
    WHERE user_id = user_uuid;
    usage_data.daily_calculator_used := 0;
  END IF;
  
  -- Check limit
  IF usage_data.daily_calculator_used >= usage_data.daily_calculator_limit THEN
    RETURN jsonb_build_object(
      'can_proceed', false,
      'reason', 'You''ve reached your current plan''s calculator limit. Upgrade to Plus or Pro for more access.',
      'current_usage', usage_data.daily_calculator_used,
      'daily_limit', usage_data.daily_calculator_limit
    );
  END IF;
  
  RETURN jsonb_build_object(
    'can_proceed', true,
    'current_usage', usage_data.daily_calculator_used,
    'daily_limit', usage_data.daily_calculator_limit
  );
END;
$$;

-- Create function to record calculator usage
CREATE OR REPLACE FUNCTION public.record_calculator_usage(
  user_uuid uuid,
  calc_type text,
  input_data jsonb,
  result_data jsonb,
  project_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  record_id uuid;
BEGIN
  -- Insert calculator record
  INSERT INTO public.calculator_records (
    user_id, calculator_type, input_data, result_data, ffa_project_id
  ) VALUES (
    user_uuid, calc_type, input_data, result_data, project_id
  ) RETURNING id INTO record_id;
  
  -- Update usage counter
  UPDATE public.usage_controls 
  SET daily_calculator_used = daily_calculator_used + 1
  WHERE user_id = user_uuid;
  
  RETURN record_id;
END;
$$;

-- Create function to get relevant training inputs
CREATE OR REPLACE FUNCTION public.get_training_inputs(
  user_uuid uuid,
  input_category text DEFAULT NULL,
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  content text,
  category text,
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT ti.id, ti.content, ti.category, ti.metadata, ti.created_at
  FROM public.training_inputs ti
  WHERE ti.user_id = user_uuid 
    AND ti.is_active = true
    AND (input_category IS NULL OR ti.category = input_category)
  ORDER BY ti.created_at DESC
  LIMIT limit_count;
END;
$$;