
create table if not exists public.pc_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  agent_url text not null,
  agent_token text not null,
  label text,
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pc_links enable row level security;

create policy "pc_links_owner_select" on public.pc_links
  for select to authenticated using (auth.uid() = user_id);
create policy "pc_links_owner_insert" on public.pc_links
  for insert to authenticated with check (auth.uid() = user_id);
create policy "pc_links_owner_update" on public.pc_links
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pc_links_owner_delete" on public.pc_links
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.touch_pc_links_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_touch_pc_links on public.pc_links;
create trigger trg_touch_pc_links before update on public.pc_links
  for each row execute function public.touch_pc_links_updated_at();
