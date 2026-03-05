-- Agent swarm sessions: each "run" of the swarm
CREATE TABLE public.agent_swarm_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Swarm Session',
  status text NOT NULL DEFAULT 'pending',
  max_agents integer NOT NULL DEFAULT 18,
  active_agents integer NOT NULL DEFAULT 0,
  completed_agents integer NOT NULL DEFAULT 0,
  objective text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Individual agent tasks within a swarm session
CREATE TABLE public.agent_swarm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.agent_swarm_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_index integer NOT NULL,
  role text NOT NULL DEFAULT 'general',
  role_label text NOT NULL DEFAULT 'General Agent',
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  result text,
  tokens_used integer DEFAULT 0,
  model text DEFAULT 'google/gemini-3-flash-preview',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_swarm_sessions_user ON public.agent_swarm_sessions(user_id);
CREATE INDEX idx_swarm_tasks_session ON public.agent_swarm_tasks(session_id);
CREATE INDEX idx_swarm_tasks_status ON public.agent_swarm_tasks(status);

ALTER TABLE public.agent_swarm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_swarm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own swarm sessions" ON public.agent_swarm_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own swarm tasks" ON public.agent_swarm_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_swarm_sessions_updated_at
  BEFORE UPDATE ON public.agent_swarm_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();