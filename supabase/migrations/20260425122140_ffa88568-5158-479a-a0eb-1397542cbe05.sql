-- Saved SSH servers (Termius-style)
CREATE TABLE public.saved_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 22,
  username text NOT NULL,
  notes text,
  agent_installed boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select" ON public.saved_servers FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "owner_insert" ON public.saved_servers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner_update" ON public.saved_servers FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "owner_delete" ON public.saved_servers FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER saved_servers_updated BEFORE UPDATE ON public.saved_servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Encrypted SSH password — NO client read access. Edge function (service role) only.
CREATE TABLE public.saved_server_secrets (
  server_id uuid PRIMARY KEY REFERENCES public.saved_servers(id) ON DELETE CASCADE,
  encrypted_password text NOT NULL,
  iv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_server_secrets ENABLE ROW LEVEL SECURITY;
-- intentionally no policies — only service role can touch this table

-- One-time pairing codes for the install script
CREATE TABLE public.server_pairing_codes (
  code text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed boolean NOT NULL DEFAULT false,
  redeemed_server_id uuid REFERENCES public.saved_servers(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.server_pairing_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select_codes" ON public.server_pairing_codes FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "owner_insert_codes" ON public.server_pairing_codes FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner_delete_codes" ON public.server_pairing_codes FOR DELETE USING (auth.uid() = owner_id);

-- Per-user custom command buttons
CREATE TABLE public.server_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  command text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.server_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_cmds" ON public.server_commands FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Link queued commands to a saved server (agent_execution_queue already exists)
ALTER TABLE public.agent_execution_queue
  ADD COLUMN IF NOT EXISTS server_id uuid REFERENCES public.saved_servers(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_agent_queue_server_status ON public.agent_execution_queue(server_id, status);