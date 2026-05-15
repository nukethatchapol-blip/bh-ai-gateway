-- BEARHOUSE AI Gateway — Phase 1
-- Gateway-only tables. No changes to existing production tables.
-- public.branches is a VIEW over public.branch (the real master, 85 rows).

create extension if not exists pgcrypto;

-- enums
do $$ begin create type public.user_role   as enum ('admin','manager','staff'); exception when duplicate_object then null; end $$;
do $$ begin create type public.user_status as enum ('pending','active','disabled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.provider_id as enum ('openai','anthropic','google','mistral','groq','openrouter'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null unique,
  full_name     text,
  role          public.user_role   not null default 'staff',
  status        public.user_status not null default 'pending',
  requested_role  public.user_role   default 'staff',
  requested_branch text,
  request_note   text,
  monthly_token_cap  bigint default 2000000,
  monthly_spend_cap_usd numeric(10,2) default 50,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_role_idx   on public.profiles (role);

create or replace view public.branches as
select
  branch_ref      as id,
  branch_name     as name,
  coalesce(restaurant_name, 'BEARHOUSE') as region,
  true            as active
from public.branch
where branch_ref is not null;

create table if not exists public.branch_access (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  branch_id  text not null,                                   -- = public.branch.branch_ref
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles (id),
  primary key (user_id, branch_id)
);
create index if not exists branch_access_user_idx   on public.branch_access (user_id);
create index if not exists branch_access_branch_idx on public.branch_access (branch_id);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.authorized_branches(p_user uuid default auth.uid())
returns setof text language sql stable security definer set search_path = public as $$
  select case
    when (select role from public.profiles where id = p_user) = 'admin'
      then (select branch_ref from public.branch where branch_ref is not null)
    else
      (select branch_id from public.branch_access where user_id = p_user)
  end;
$$;

create table if not exists public.skills (
  id           text primary key,
  name         text not null,
  description  text,
  system_prompt text not null,
  tools         text[] not null default '{}',
  visible_to    public.user_role,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.skill_access (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  skill_id text not null references public.skills (id) on delete cascade,
  primary key (user_id, skill_id)
);

-- enc_* are AES-256-GCM ciphertext/iv/tag, base64-encoded. We use text
-- columns (not bytea) because Supabase REST/JSON cannot round-trip bytea
-- cleanly when the JS client sends Node Buffer values.
create table if not exists public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  provider    public.provider_id not null,
  last4       text,
  enc_payload text not null,
  enc_iv      text not null,
  enc_tag     text not null,
  monthly_cap_usd numeric(10,2) default 250,
  spend_usd   numeric(10,2) not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.chats (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text,
  skill_id   text references public.skills (id),
  model_id   text,
  branch_scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chats_user_updated_idx on public.chats (user_id, updated_at desc);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('user','assistant','system','tool','blocked')),
  content    jsonb not null,
  model      text,
  tokens_in  int default 0,
  tokens_out int default 0,
  created_at timestamptz not null default now()
);
create index if not exists messages_chat_created_idx on public.messages (chat_id, created_at);

create table if not exists public.audit_log (
  id         bigserial primary key,
  user_id    uuid references public.profiles (id) on delete set null,
  action     text not null,
  scope      text,
  model      text,
  tokens     int default 0,
  status     text not null default 'ok',
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_user_idx    on public.audit_log (user_id);

alter table public.profiles       enable row level security;
alter table public.branch_access  enable row level security;
alter table public.skills         enable row level security;
alter table public.skill_access   enable row level security;
alter table public.api_keys       enable row level security;
alter table public.chats          enable row level security;
alter table public.messages       enable row level security;
alter table public.audit_log      enable row level security;

create policy "profiles self read"    on public.profiles for select using (auth.uid() = id);
create policy "profiles admin read"   on public.profiles for select using (public.is_admin());
create policy "profiles self update"  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles admin update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());
create policy "profiles insert own"   on public.profiles for insert with check (auth.uid() = id);

create policy "branch_access self read"   on public.branch_access for select using (user_id = auth.uid() or public.is_admin());
create policy "branch_access admin write" on public.branch_access for all using (public.is_admin()) with check (public.is_admin());

create policy "skills authed read" on public.skills for select using (auth.uid() is not null and active);
create policy "skills admin write" on public.skills for all using (public.is_admin()) with check (public.is_admin());

create policy "skill_access self read"   on public.skill_access for select using (user_id = auth.uid() or public.is_admin());
create policy "skill_access admin write" on public.skill_access for all using (public.is_admin()) with check (public.is_admin());

create policy "api_keys self read"  on public.api_keys for select using (user_id = auth.uid());
create policy "api_keys self write" on public.api_keys for all   using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "chats self read"     on public.chats   for select using (user_id = auth.uid() or public.is_admin());
create policy "chats self write"    on public.chats   for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "messages self read"  on public.messages for select using (user_id = auth.uid() or public.is_admin());
create policy "messages self write" on public.messages for insert with check (user_id = auth.uid());

create policy "audit self read"  on public.audit_log for select using (user_id = auth.uid() or public.is_admin());
create policy "audit any insert" on public.audit_log for insert with check (auth.uid() is not null);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, status, role, requested_role, requested_branch, request_note)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    'pending', 'staff',
    coalesce((new.raw_user_meta_data->>'requested_role')::public.user_role, 'staff'),
    new.raw_user_meta_data->>'requested_branch',
    new.raw_user_meta_data->>'request_note'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.skills (id, name, description, system_prompt, tools) values
  ('data-analyst', 'Data Analyst',
   'Query branch sales, run SQL on Supabase, surface insights with charts.',
   'You are a senior analyst for BEARHOUSE. Always query the connected branch dataset before answering. Quote exact numbers, cite branch IDs, and flag anomalies. Never include data from branches outside the user''s authorization scope.',
   array['supabase.query','chart.render','csv.export']),
  ('strategy', 'Strategy Advisor',
   'Pricing, expansion, product mix, promo strategy — grounded in branch data.',
   'You are a strategy advisor. Reason step-by-step from the data the analyst pulls. Frame recommendations as Hypothesis → Evidence → Recommendation. Be specific about which branches, products, and timeframes.',
   array['supabase.query','market.search'])
on conflict (id) do nothing;
