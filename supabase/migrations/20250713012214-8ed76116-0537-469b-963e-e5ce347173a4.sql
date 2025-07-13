-- Enable Row Level Security on uploaded_files table
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Create policies for uploaded_files table
CREATE POLICY "Users can view their own files" 
ON public.uploaded_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" 
ON public.uploaded_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" 
ON public.uploaded_files 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" 
ON public.uploaded_files 
FOR DELETE 
USING (auth.uid() = user_id);