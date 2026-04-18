-- Widen the status check to include 'programmed' and 'retired'
ALTER TABLE public.livestock_tag_pool
DROP CONSTRAINT IF EXISTS livestock_tag_pool_status_check;

ALTER TABLE public.livestock_tag_pool
ADD CONSTRAINT livestock_tag_pool_status_check
CHECK (status IN ('available', 'programmed', 'assigned', 'retired'));

-- Now mark the first 78 (oldest, alphabetical tiebreak) as programmed
WITH top_78 AS (
  SELECT id
  FROM public.livestock_tag_pool
  WHERE status = 'available'
  ORDER BY created_at ASC, tag_id ASC
  LIMIT 78
)
UPDATE public.livestock_tag_pool
SET status = 'programmed',
    nfc_written_at = COALESCE(nfc_written_at, now()),
    nfc_written_by = COALESCE(nfc_written_by, 'ba770d78-4428-4cda-aca6-97d928a462fc'::uuid)
WHERE id IN (SELECT id FROM top_78);