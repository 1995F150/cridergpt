-- Add policies for chapters table (using existing has_role function)
-- Allow admins to insert new chapters
CREATE POLICY "Admins can insert chapters"
ON public.chapters FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update chapters
CREATE POLICY "Admins can update chapters"
ON public.chapters FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete chapters
CREATE POLICY "Admins can delete chapters"
ON public.chapters FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));