-- Add NOT NULL and non-empty constraints to chapters table
-- Ensure id cannot be null (already UUID NOT NULL by default)
-- Ensure name cannot be empty
-- Ensure state cannot be empty

-- Add check constraints to prevent empty strings
ALTER TABLE public.chapters
ADD CONSTRAINT chapters_name_not_empty CHECK (name <> ''),
ADD CONSTRAINT chapters_state_not_empty CHECK (state <> '');

-- Add NOT NULL constraints if not already present
ALTER TABLE public.chapters
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN state SET NOT NULL;