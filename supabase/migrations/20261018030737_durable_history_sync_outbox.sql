-- Review-only: apply only after retention policy review and a database backup.
CREATE SCHEMA IF NOT EXISTS history_sync_private;
REVOKE ALL ON SCHEMA history_sync_private FROM PUBLIC, anon, authenticated;
-- Enrollment is empty by default. Capture only explicitly approved accounts.
CREATE TABLE public.history_sync_accounts (user_id uuid PRIMARY KEY, enabled boolean NOT NULL DEFAULT false);
ALTER TABLE public.history_sync_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.history_sync_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.history_sync_accounts TO service_role;
CREATE TABLE public.history_sync_outbox (
 event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 revision bigint GENERATED ALWAYS AS IDENTITY,
 user_id uuid NOT NULL,
 entity text NOT NULL CHECK(entity IN ('conversation','message','memory')),
 entity_id uuid NOT NULL,
 operation text NOT NULL CHECK(operation IN ('upsert','delete')),
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 delivered_at timestamptz
);
ALTER TABLE public.history_sync_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.history_sync_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.history_sync_outbox TO service_role;
CREATE INDEX history_sync_pending_owner ON public.history_sync_outbox(user_id, revision) WHERE delivered_at IS NULL;

CREATE FUNCTION history_sync_private.capture_record() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r jsonb; kind text;
BEGIN
 r := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 kind := CASE TG_TABLE_NAME WHEN 'chat_conversations' THEN 'conversation' WHEN 'chat_messages' THEN 'message' ELSE 'memory' END;
 -- Remove original content from older delivery records when ownership changes
 -- or the source is deleted. The newer tombstone is still delivered separately.
 IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
  UPDATE public.history_sync_outbox SET operation='delete',payload=jsonb_build_object('id',OLD.id)
  WHERE user_id=OLD.user_id AND entity=kind AND entity_id=OLD.id;
 END IF;
 IF TG_OP='UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id AND EXISTS (SELECT 1 FROM public.history_sync_accounts a WHERE a.user_id=OLD.user_id AND a.enabled) THEN
  INSERT INTO public.history_sync_outbox(user_id,entity,entity_id,operation,payload)
  VALUES (OLD.user_id,kind,OLD.id,'delete',jsonb_build_object('id',OLD.id));
 END IF;
 IF EXISTS (SELECT 1 FROM public.history_sync_accounts a WHERE a.user_id=(r->>'user_id')::uuid AND a.enabled) THEN
 INSERT INTO public.history_sync_outbox(user_id,entity,entity_id,operation,payload)
 VALUES ((r->>'user_id')::uuid,kind,(r->>'id')::uuid,CASE WHEN TG_OP='DELETE' THEN 'delete' ELSE 'upsert' END,
 CASE WHEN TG_OP='DELETE' THEN jsonb_build_object('id',r->'id','conversation_id',r->'conversation_id')
 WHEN kind='conversation' THEN jsonb_build_object('id',r->'id','title',r->'title','created_at',r->'created_at','updated_at',r->'updated_at')
 WHEN kind='message' THEN jsonb_build_object('id',r->'id','conversation_id',r->'conversation_id','role',r->'role','content',r->'content','created_at',r->'created_at','tokens_used',r->'tokens_used','metadata',r->'metadata','image_url',r->'image_url')
 ELSE jsonb_build_object('id',r->'id','content',r->'content','details',r->'details','category',r->'category','topic',r->'topic','source',r->'source','created_at',r->'created_at','updated_at',r->'updated_at') END);
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;
REVOKE ALL ON FUNCTION history_sync_private.capture_record() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER history_sync_conversations AFTER INSERT OR UPDATE OR DELETE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION history_sync_private.capture_record();
CREATE TRIGGER history_sync_messages AFTER INSERT OR UPDATE OR DELETE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION history_sync_private.capture_record();
CREATE TRIGGER history_sync_memories AFTER INSERT OR UPDATE OR DELETE ON public.ai_memory FOR EACH ROW EXECUTE FUNCTION history_sync_private.capture_record();
-- Backfill is a separate, explicitly approved operation; do not silently copy
-- every account or lock large history tables during a schema migration.
-- An initial backfill must use the export protocol with revision=0, ensuring it
-- never overwrites later trigger events. Ordinary live events have revision>=1.
