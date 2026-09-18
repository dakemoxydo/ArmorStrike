-- ArmorStrike: Cloud profiles, authentication & user data
-- Migration: 20260918000000_create_profiles_and_auth.sql

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) >= 3 and char_length(username) <= 20),
  credits integer not null default 0 check (credits >= 0),
  unlocked_hulls text[] not null default array['hunter'],
  unlocked_turrets text[] not null default array['railgun'],
  current_hull text not null default 'hunter',
  current_turret text not null default 'railgun',
  starter_pack_claimed boolean not null default false,
  quests jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{"kills": 0, "deaths": 0, "score": 0, "matches": 0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive unique index on username
create unique index if not exists idx_profiles_username_lower on public.profiles (lower(username));

-- Enable RLS
alter table public.profiles enable row level security;

-- Drop old policies if exist
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "profiles_insert_policy" on public.profiles;

-- RLS Policies
create policy "profiles_select_policy"
  on public.profiles
  for select
  to authenticated, anon
  using (true);

create policy "profiles_update_policy"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_insert_policy"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- 2. Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_credits integer;
  v_unlocked_hulls text[];
  v_unlocked_turrets text[];
  v_current_hull text;
  v_current_turret text;
  v_starter_pack_claimed boolean;
  v_quests jsonb;
begin
  v_username := coalesce(new.raw_user_meta_data->>'username', 'Player_' || substr(new.id::text, 1, 8));
  
  v_credits := coalesce((new.raw_user_meta_data->>'credits')::integer, 0);
  v_current_hull := coalesce(new.raw_user_meta_data->>'current_hull', 'hunter');
  v_current_turret := coalesce(new.raw_user_meta_data->>'current_turret', 'railgun');
  v_starter_pack_claimed := coalesce((new.raw_user_meta_data->>'starter_pack_claimed')::boolean, false);
  
  if new.raw_user_meta_data ? 'unlocked_hulls' then
    select array_agg(x::text) into v_unlocked_hulls from jsonb_array_elements_text(new.raw_user_meta_data->'unlocked_hulls') as x;
  end if;
  if v_unlocked_hulls is null or array_length(v_unlocked_hulls, 1) is null then
    v_unlocked_hulls := array['hunter'];
  end if;

  if new.raw_user_meta_data ? 'unlocked_turrets' then
    select array_agg(x::text) into v_unlocked_turrets from jsonb_array_elements_text(new.raw_user_meta_data->'unlocked_turrets') as x;
  end if;
  if v_unlocked_turrets is null or array_length(v_unlocked_turrets, 1) is null then
    v_unlocked_turrets := array['railgun'];
  end if;

  if new.raw_user_meta_data ? 'quests' then
    v_quests := new.raw_user_meta_data->'quests';
  else
    v_quests := '[]'::jsonb;
  end if;

  insert into public.profiles (
    id,
    username,
    credits,
    unlocked_hulls,
    unlocked_turrets,
    current_hull,
    current_turret,
    starter_pack_claimed,
    quests
  ) values (
    new.id,
    v_username,
    v_credits,
    v_unlocked_hulls,
    v_unlocked_turrets,
    v_current_hull,
    v_current_turret,
    v_starter_pack_claimed,
    v_quests
  )
  on conflict (id) do update set
    username = excluded.username,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- 3. Function to get email by username for login
create or replace function public.get_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  select u.email into v_email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(p_username)
  limit 1;
  
  return v_email;
end;
$$;

revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- 4. Auto confirm email trigger on auth.users
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row execute function public.auto_confirm_user();

revoke all on function public.auto_confirm_user() from public, anon, authenticated;

-- 5. Permissions
grant usage on schema public to anon, authenticated;
grant all on public.profiles to authenticated;
grant select on public.profiles to anon;
