-- REVIEW REQUIRED: changes retention and increases potential chat storage growth.
-- NOT applied to production by the development task. Existing user deletion and
-- ON DELETE CASCADE remain available. No history/data is deleted or restored here.
-- Preserve the existing scheduled function/signature and unrelated cleanup.
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Chats persist until authorized deletion; never purge chat_messages or
  -- chat_conversations just because their records are older than 24 hours.
  DELETE FROM public.ai_interactions WHERE created_at < now() - interval '24 hours';
  DELETE FROM public.imported_messages WHERE created_at < now() - interval '24 hours';
END;
$function$;
-- Do not restore the old chat-purge function as an automatic rollback: that
-- would resume deleting user history. Any future retention change needs review.
