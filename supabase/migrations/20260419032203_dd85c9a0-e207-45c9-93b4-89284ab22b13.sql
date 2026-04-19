-- Launch Planner table
CREATE TABLE public.launch_planner_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  task_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.launch_planner_tasks ENABLE ROW LEVEL SECURITY;

-- Owner-only access (Jessie)
CREATE POLICY "Owner can view planner tasks"
ON public.launch_planner_tasks FOR SELECT
USING (auth.jwt() ->> 'email' = 'jessiecrider3@gmail.com');

CREATE POLICY "Owner can insert planner tasks"
ON public.launch_planner_tasks FOR INSERT
WITH CHECK (auth.jwt() ->> 'email' = 'jessiecrider3@gmail.com');

CREATE POLICY "Owner can update planner tasks"
ON public.launch_planner_tasks FOR UPDATE
USING (auth.jwt() ->> 'email' = 'jessiecrider3@gmail.com');

CREATE POLICY "Owner can delete planner tasks"
ON public.launch_planner_tasks FOR DELETE
USING (auth.jwt() ->> 'email' = 'jessiecrider3@gmail.com');

-- Auto-update updated_at
CREATE TRIGGER update_launch_planner_tasks_updated_at
BEFORE UPDATE ON public.launch_planner_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 4-phase launch plan
INSERT INTO public.launch_planner_tasks (phase, phase_order, task_order, title, description) VALUES
('Pre-Launch', 1, 1, 'Mint 200-500 more tags', 'Only 22 in the pool right now — generate more before launch'),
('Pre-Launch', 1, 2, 'Take 3 product photos', 'Tag in hand, on a cow''s ear, phone scanning it'),
('Pre-Launch', 1, 3, 'Write product page copy', '"Scan with any phone. No $300 reader needed."'),
('Pre-Launch', 1, 4, 'Create early-adopter discount code', 'e.g. FFA20 for 20% off first 100 buyers'),

('Soft Launch', 2, 1, 'Email blast to FFA chapters', '346 chapters in DB — build a Chapter Pilot email'),
('Soft Launch', 2, 2, 'Post first TikTok', '"POV you scan your show steer with your iPhone" 📱🐂'),
('Soft Launch', 2, 3, 'DM 10 county extension offices', 'Offer 50 free tags in exchange for testimonial'),
('Soft Launch', 2, 4, 'Post in r/FFA, r/cattle, r/livestock', 'Soft pitch + link to store'),

('Scale', 3, 1, 'Add bulk pricing tier', '50+ tags = $2.75/each for chapter orders'),
('Scale', 3, 2, 'Capture 1 chapter testimonial video', 'Real student/advisor using it'),
('Scale', 3, 3, 'Run $50 Snapchat ad', 'Target rural ZIP codes, ages 14-25'),
('Scale', 3, 4, 'Add free sample tag to Farm Bureau form', 'Lead magnet for the leads table'),

('Track & Iterate', 4, 1, 'Review weekly metrics', 'Tags sold, new leads, conversion rate'),
('Track & Iterate', 4, 2, 'Survey first 10 buyers', 'What worked, what didn''t, would they reorder'),
('Track & Iterate', 4, 3, 'Adjust pricing based on data', 'Test $4 vs $3.50 vs bulk discounts'),
('Track & Iterate', 4, 4, 'Plan v2 features', 'GPS tags? Bigger NFC range? Health sensors?');