alter table public.ai_infrastructure_settings
  add column if not exists engine_base_url text not null default 'https://cridergpt.com/engine/api',
  add column if not exists engine_enabled boolean not null default true,
  add column if not exists engine_request_timeout_ms integer not null default 120000 check (engine_request_timeout_ms between 1000 and 3600000),
  add column if not exists config_version bigint not null default 1,
  add column if not exists config_updated_at timestamptz not null default now();

update public.ai_infrastructure_settings
set engine_base_url = 'https://cridergpt.com/engine/api',
    engine_enabled = true,
    config_updated_at = now()
where engine_base_url is distinct from 'https://cridergpt.com/engine/api'
   or engine_enabled is distinct from true;

create or replace function public.bump_ai_infrastructure_config_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if row(
    new.kill_switch, new.default_model, new.fallback_model, new.temperature,
    new.max_tokens, new.rag_enabled, new.rag_top_k, new.use_writing_style,
    new.use_ai_memory, new.safety_level, new.blocked_keywords,
    new.system_prompt_override, new.fine_tune_enabled, new.advanced_addons,
    new.engine_base_url, new.engine_enabled, new.engine_request_timeout_ms
  ) is distinct from row(
    old.kill_switch, old.default_model, old.fallback_model, old.temperature,
    old.max_tokens, old.rag_enabled, old.rag_top_k, old.use_writing_style,
    old.use_ai_memory, old.safety_level, old.blocked_keywords,
    old.system_prompt_override, old.fine_tune_enabled, old.advanced_addons,
    old.engine_base_url, old.engine_enabled, old.engine_request_timeout_ms
  ) then
    new.config_version := greatest(coalesce(old.config_version, 0) + 1, coalesce(new.config_version, 1));
    new.config_updated_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bump_ai_infrastructure_config_version on public.ai_infrastructure_settings;
create trigger bump_ai_infrastructure_config_version
before update on public.ai_infrastructure_settings
for each row execute function public.bump_ai_infrastructure_config_version();

create table if not exists public.engine_runtime_status (
  engine_id text primary key default 'primary',
  online boolean not null default false,
  status text not null default 'unknown' check (status in ('unknown','online','degraded','offline','maintenance')),
  base_url text not null default 'https://cridergpt.com/engine/api',
  engine_version text,
  git_sha text,
  hostname text,
  started_at timestamptz,
  last_heartbeat timestamptz,
  last_health_check timestamptz,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  active_model text,
  config_version bigint not null default 0,
  ack_config_version bigint not null default 0,
  config_synced boolean generated always as (config_version = ack_config_version and ack_config_version > 0) stored,
  capabilities jsonb not null default '{}'::jsonb,
  services jsonb not null default '{}'::jsonb,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.engine_runtime_status enable row level security;

drop policy if exists "Authenticated users read engine status" on public.engine_runtime_status;
create policy "Authenticated users read engine status"
on public.engine_runtime_status for select
to authenticated
using (true);

revoke insert, update, delete on public.engine_runtime_status from anon, authenticated;
grant select on public.engine_runtime_status to authenticated;
grant all on public.engine_runtime_status to service_role;

insert into public.engine_runtime_status (
  engine_id, online, status, base_url, config_version, ack_config_version, capabilities, services, metadata
)
select
  'primary', false, 'unknown', engine_base_url, config_version, 0,
  jsonb_build_object('chat', true, 'image_generation', true, 'image_analysis', true, 'video_generation', true, 'rag', true),
  '{}'::jsonb,
  jsonb_build_object('created_by', 'connect_ai_infrastructure_to_engine')
from public.ai_infrastructure_settings
order by updated_at desc
limit 1
on conflict (engine_id) do update
set base_url = excluded.base_url,
    config_version = excluded.config_version,
    updated_at = now();

create index if not exists engine_runtime_status_heartbeat_idx
  on public.engine_runtime_status (last_heartbeat desc);

comment on column public.ai_infrastructure_settings.engine_base_url is
  'Public engine API base URL. API credentials remain in Edge Function secrets.';
comment on table public.engine_runtime_status is
  'Heartbeat, health, version, capability, and configuration acknowledgement reported by CriderGPT Engine.';
