WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.livestock_tag_pool
)
UPDATE public.livestock_tag_pool p
SET status = CASE WHEN o.rn BETWEEN 79 AND 100 THEN 'available' ELSE 'programmed' END,
    assigned_to_animal = CASE WHEN o.rn BETWEEN 79 AND 100 THEN NULL ELSE p.assigned_to_animal END,
    assigned_by        = CASE WHEN o.rn BETWEEN 79 AND 100 THEN NULL ELSE p.assigned_by END,
    assigned_at        = CASE WHEN o.rn BETWEEN 79 AND 100 THEN NULL ELSE p.assigned_at END
FROM ordered o
WHERE p.id = o.id
  AND p.status <> 'assigned';