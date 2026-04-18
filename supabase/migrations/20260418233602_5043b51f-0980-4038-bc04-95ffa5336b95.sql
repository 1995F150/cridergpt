-- Sync livestock_tag_pool: only the listed tags are available, all others are programmed
WITH available_tags AS (
  SELECT unnest(ARRAY[
    'CriderGPT-LL1L81','CriderGPT-K22TJK','CriderGPT-M64HGN','CriderGPT-OFB053',
    'CriderGPT-K5O13F','CriderGPT-30HWAZ','CriderGPT-WAV79B','CriderGPT-5Z91JM',
    'CriderGPT-MCL4M1','CriderGPT-V1GAXA','CriderGPT-W5GK75','CriderGPT-3NSQ67',
    'CriderGPT-KIMKZ6','CriderGPT-I6135F','CriderGPT-05V6BA','CriderGPT-7349D9',
    'CriderGPT-082RAZ','CriderGPT-STU9WX','CriderGPT-UPZOGQ','CriderGPT-OOTBB2',
    'CriderGPT-ETNIC6','CriderGPT-DCVQWL','CriderGPT-KSUAB0'
  ]) AS tag_id
)
UPDATE public.livestock_tag_pool p
SET status = CASE WHEN a.tag_id IS NOT NULL THEN 'available' ELSE 'programmed' END,
    assigned_to_animal = CASE WHEN a.tag_id IS NOT NULL THEN NULL ELSE p.assigned_to_animal END,
    assigned_by        = CASE WHEN a.tag_id IS NOT NULL THEN NULL ELSE p.assigned_by END,
    assigned_at        = CASE WHEN a.tag_id IS NOT NULL THEN NULL ELSE p.assigned_at END
FROM (SELECT tag_id FROM available_tags) a
RIGHT JOIN public.livestock_tag_pool p2 ON p2.tag_id = a.tag_id
WHERE p.id = p2.id
  AND p.status <> 'assigned';