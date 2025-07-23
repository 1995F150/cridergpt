-- Create tables for autonomous operations
CREATE TABLE IF NOT EXISTS public.autonomous_tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  priority TEXT NOT NULL,
  description TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.autonomous_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  fix_applied TEXT NOT NULL,
  fix_result JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.autonomous_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_type TEXT NOT NULL,
  description TEXT NOT NULL,
  result JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monitoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  health_status BOOLEAN DEFAULT true,
  issues_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  performance_metrics JSONB
);

CREATE TABLE IF NOT EXISTS public.function_error_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_count INTEGER NOT NULL,
  error_details JSONB,
  analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  auto_fix_attempted BOOLEAN DEFAULT false
);

-- Enable RLS for security
ALTER TABLE public.autonomous_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_error_analysis ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage autonomous operations
CREATE POLICY "Service role full access on autonomous_tasks" 
ON public.autonomous_tasks FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on autonomous_fixes" 
ON public.autonomous_fixes FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on autonomous_updates" 
ON public.autonomous_updates FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on monitoring_logs" 
ON public.monitoring_logs FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on function_error_analysis" 
ON public.function_error_analysis FOR ALL 
USING (true) WITH CHECK (true);

-- Allow authenticated users to view their autonomous operations
CREATE POLICY "Users can view autonomous operations" 
ON public.autonomous_tasks FOR SELECT 
USING (true);

CREATE POLICY "Users can view autonomous fixes" 
ON public.autonomous_fixes FOR SELECT 
USING (true);

CREATE POLICY "Users can view autonomous updates" 
ON public.autonomous_updates FOR SELECT 
USING (true);

CREATE POLICY "Users can view monitoring logs" 
ON public.monitoring_logs FOR SELECT 
USING (true);