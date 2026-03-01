-- CriderGPT API System schema (training corpus, keywords, keys, logs, settings)
-- Safe-guards: use IF NOT EXISTS where possible

-- Central training data table (writeable)
create table if not exists public.cridergpt_training_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  title text,
  content text not null,
  tags text[] default '{}',
  metadata jsonb default '{}',
  source text default 'manual',
  created_at timestamptz not null default now()
);

-- Keywords/triggers configuration
create table if not exists public.api_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  action text not null, -- e.g. 'agent_mode', 'convert_app_code', 'open_github', 'generate_photo'
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- API settings (kill switch, per-endpoint toggles)
create table if not exists public.cridergpt_api_settings (
  id uuid primary key default gen_random_uuid(),
  kill_switch boolean not null default false,
  endpoint_overrides jsonb default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- API keys (for external/partner use)
create table if not exists public.cridergpt_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text,
  key_hash text not null unique,
  permissions jsonb not null default '{"read_training": true, "write_training": false, "endpoints": ["pc_agent", "cloned_apps", "roblox" ]}',
  rate_limit_per_minute integer default 60,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- API usage logs
create table if not exists public.cridergpt_api_logs (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  api_key_id uuid references public.cridergpt_api_keys(id) on delete set null,
  endpoint text,
  command text,
  flags jsonb default '{}',
  context jsonb,
  response jsonb,
  status text,
  created_at timestamptz not null default now(),
  training_updates jsonb
);

-- Aggregated training view across knowledge tables
create or replace view public.cridergpt_training_corpus as
  select 
    'training_data'::text as source,
    t.id,
    t.user_id,
    coalesce(t.user_email, p.email) as user_email,
    t.title,
    t.content,
    t.tags,
    t.metadata,
    t.created_at
  from public.cridergpt_training_data t
  left join public.profiles p on p.user_id = t.user_id

  union all
  select 
    'ai_feedback'::text as source,
    f.id,
    f.user_id,
    p.email as user_email,
    null as title,
    coalesce(f.comments, f.feedback_text, f.category)::text as content,
    array[coalesce(f.category,'feedback')]::text[] as tags,
    jsonb_build_object('rating', f.rating) as metadata,
    f.created_at
  from public.ai_feedback f
  left join public.profiles p on p.user_id = f.user_id

  union all
  select 
    'ai_memory'::text as source,
    m.id,
    m.user_id,
    p.email as user_email,
    null as title,
    m.content,
    array[coalesce(m.category,'memory'), coalesce(m.topic,'') ]::text[] as tags,
    m.metadata,
    m.created_at
  from public.ai_memory m
  left join public.profiles p on p.user_id = m.user_id

  union all
  select 
    'ai_interactions'::text as source,
    i.id,
    i.user_id,
    p.email as user_email,
    null as title,
    i.prompt || ' -> ' || coalesce(i.response,'') as content,
    array['interaction']::text[] as tags,
    jsonb_build_object('model', i.model) as metadata,
    i.created_at
  from public.ai_interactions i
  left join public.profiles p on p.user_id = i.user_id

  union all
  select 
    'writing_samples'::text as source,
    w.id,
    w.user_id,
    p.email as user_email,
    coalesce(w.title, 'writing_sample') as title,
    w.content,
    array['writing_sample']::text[] as tags,
    w.metadata,
    w.created_at
  from public.writing_samples w
  left join public.profiles p on p.user_id = w.user_id

  union all
  select 
    'chat_messages'::text as source,
    cm.id,
    cm.user_id,
    p.email as user_email,
    null as title,
    cm.content,
    array['chat_message']::text[] as tags,
    jsonb_build_object('conversation_id', cm.conversation_id, 'role', cm.role) as metadata,
    cm.created_at
  from public.chat_messages cm
  left join public.profiles p on p.user_id = cm.user_id

  union all
  select 
    'chat_conversations'::text as source,
    cc.id,
    cc.user_id,
    p.email as user_email,
    coalesce(cc.title, 'conversation') as title,
    coalesce(cc.title, 'conversation') as content,
    array['conversation']::text[] as tags,
    '{}'::jsonb as metadata,
    cc.created_at
  from public.chat_conversations cc
  left join public.profiles p on p.user_id = cc.user_id
;

-- Indexes for quick search
create index if not exists idx_cridergpt_training_data_created_at on public.cridergpt_training_data(created_at desc);
create index if not exists idx_cridergpt_training_corpus_gin on public.cridergpt_training_data using gin(to_tsvector('english', coalesce(content,'')));
create index if not exists idx_api_keywords_active on public.api_keywords(active);
create index if not exists idx_api_logs_created_at on public.cridergpt_api_logs(created_at desc);

-- Enable RLS and add admin-centric policies
alter table public.cridergpt_training_data enable row level security;
alter table public.api_keywords enable row level security;
alter table public.cridergpt_api_settings enable row level security;
alter table public.cridergpt_api_keys enable row level security;
alter table public.cridergpt_api_logs enable row level security;

-- Helper: assume existing has_role(text) returns boolean

-- Training data: read for authenticated; write for admin
create policy if not exists training_read_all on public.cridergpt_training_data
  for select using (auth.role() = 'authenticated');
create policy if not exists training_write_admin on public.cridergpt_training_data
  for insert with check ( coalesce( (select public.has_role('admin')), false) );

-- Keywords: admin only full access
create policy if not exists keywords_admin_read on public.api_keywords
  for select using ( coalesce( (select public.has_role('admin')), false) );
create policy if not exists keywords_admin_write on public.api_keywords
  for all using ( coalesce( (select public.has_role('admin')), false) ) with check ( coalesce( (select public.has_role('admin')), false) );

-- API settings: admin only
create policy if not exists settings_admin_all on public.cridergpt_api_settings
  for all using ( coalesce( (select public.has_role('admin')), false) ) with check ( coalesce( (select public.has_role('admin')), false) );

-- API keys: admin only
create policy if not exists keys_admin_all on public.cridergpt_api_keys
  for all using ( coalesce( (select public.has_role('admin')), false) ) with check ( coalesce( (select public.has_role('admin')), false) );

-- API logs: readable by admin, insertable by authenticated (for function logging on behalf of user)
create policy if not exists logs_admin_read on public.cridergpt_api_logs
  for select using ( coalesce( (select public.has_role('admin')), false) );
create policy if not exists logs_insert_auth on public.cridergpt_api_logs
  for insert with check (auth.role() = 'authenticated');

-- Seed defaults: insert a settings row if none exists
insert into public.cridergpt_api_settings (id, kill_switch, endpoint_overrides)
select gen_random_uuid(), false, '{}'::jsonb
where not exists (select 1 from public.cridergpt_api_settings);

-- Seed initial keywords if empty
insert into public.api_keywords (keyword, action, description)
select * from (values
  ('run agent mode', 'agent_mode', 'Trigger PC autonomous agent'),
  ('convert app code', 'convert_app_code', 'Convert or refactor application code'),
  ('open github repository', 'open_github', 'Open the GitHub repository link'),
  ('generate photo', 'generate_photo', 'Generate an AI image')
) as v(keyword, action, description)
where not exists (select 1 from public.api_keywords);
