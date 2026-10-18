-- REVIEW REQUIRED: not applied to production by the v6 development task.
-- Existing permissive policies check message.user_id; additionally require an
-- owned parent conversation for ALL direct Data API operations. No data deletion.
CREATE POLICY "v6_messages_require_owned_conversation"
ON public.chat_messages AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
);

-- Read pagination in the same order as the owner-scoped API queries.
CREATE INDEX IF NOT EXISTS idx_chat_messages_owner_conversation_page
  ON public.chat_messages (user_id, conversation_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_owner_page
  ON public.chat_conversations (user_id, updated_at DESC, id DESC);

-- Code-only rollback must not restore/delete conversations.
-- Policy rollback (only after access-control review):
-- DROP POLICY "v6_messages_require_owned_conversation" ON public.chat_messages;
-- Indexes can remain safely; remove these specifically only if necessary.
