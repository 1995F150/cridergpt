
UPDATE public.snapchat_lens_analytics
SET total_views = 3109, total_plays = 3088,
    notes = 'Updated with accurate Lens Insights data. Total Reach (Plays+Views): 3,109. Plays Only: 3,088. Major spike ~March 8-9 (~750 reach/day). Activity started around 3/8 and sustained through 3/15. Strong US audience (75%+), heavy gamer demographic.',
    metadata = '{"reach_spike_date": "2026-03-09", "spike_peak_daily": 750, "activity_start": "2026-03-08", "data_range": "Last 28 Days"}'::jsonb,
    updated_at = now()
WHERE lens_name = 'Vibe Check Bot (CriderGPT)';
