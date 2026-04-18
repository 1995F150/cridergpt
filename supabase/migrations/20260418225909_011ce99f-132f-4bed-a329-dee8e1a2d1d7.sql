UPDATE livestock_tag_pool 
SET status='available', nfc_written_by=NULL, nfc_written_at=NULL
WHERE status='programmed' 
  AND nfc_written_at IS NULL 
  AND assigned_to_animal IS NULL;