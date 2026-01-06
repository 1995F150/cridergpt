-- Create chapter_requests table for users to request new chapters
CREATE TABLE public.chapter_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chapter_name TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT,
  school_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraints
ALTER TABLE public.chapter_requests
ADD CONSTRAINT chapter_requests_name_not_empty CHECK (chapter_name <> ''),
ADD CONSTRAINT chapter_requests_state_not_empty CHECK (state <> '');

-- Enable RLS
ALTER TABLE public.chapter_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own requests
CREATE POLICY "Users can create chapter requests"
ON public.chapter_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view their own chapter requests"
ON public.chapter_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all requests (check profiles.role = 'admin')
CREATE POLICY "Admins can view all chapter requests"
ON public.chapter_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Admins can update requests
CREATE POLICY "Admins can update chapter requests"
ON public.chapter_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_chapter_requests_updated_at
BEFORE UPDATE ON public.chapter_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_chapter_requests_status ON public.chapter_requests(status);
CREATE INDEX idx_chapter_requests_user_id ON public.chapter_requests(user_id);