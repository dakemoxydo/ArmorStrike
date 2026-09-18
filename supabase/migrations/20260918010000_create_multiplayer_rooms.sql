-- ArmorStrike: Multiplayer Rooms, Server Browser & Matchmaking
-- Migration: 20260918010000_create_multiplayer_rooms.sql

-- 1. Create rooms table
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) >= 1 and char_length(name) <= 32),
  host_id text not null,
  host_name text not null check (char_length(host_name) >= 1 and char_length(host_name) <= 32),
  mode text not null check (mode in ('deathmatch', 'team_deathmatch', 'capture_point')),
  map_id text not null check (map_id in ('factory', 'city', 'village')),
  max_players integer not null default 8 check (max_players >= 2 and max_players <= 10),
  player_count integer not null default 1 check (player_count >= 0 and player_count <= max_players),
  has_password boolean not null default false,
  password_hash text null,
  bots_enabled boolean not null default true,
  status text not null default 'waiting' check (status in ('waiting', 'in_progress', 'ended')),
  created_at timestamptz not null default now(),
  last_heartbeat timestamptz not null default now()
);

-- Index for searching rooms in browser (mode, map, status, has_password, player_count)
create index if not exists idx_rooms_browser on public.rooms (status, has_password, mode, map_id, created_at desc);
create index if not exists idx_rooms_heartbeat on public.rooms (last_heartbeat);

-- 2. Create room_players table
create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id text not null,
  username text not null,
  hull_id text not null,
  turret_id text not null,
  team text null check (team is null or team in ('alpha', 'bravo')),
  is_host boolean not null default false,
  ping integer not null default 0,
  joined_at timestamptz not null default now(),
  constraint uq_room_player unique (room_id, user_id)
);

-- FK index
create index if not exists idx_room_players_room_id on public.room_players (room_id);
create index if not exists idx_room_players_user_id on public.room_players (user_id);

-- Enable RLS
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- Drop existing policies if any
drop policy if exists "rooms_select_policy" on public.rooms;
drop policy if exists "rooms_insert_policy" on public.rooms;
drop policy if exists "rooms_update_policy" on public.rooms;
drop policy if exists "rooms_delete_policy" on public.rooms;

drop policy if exists "room_players_select_policy" on public.room_players;
drop policy if exists "room_players_insert_policy" on public.room_players;
drop policy if exists "room_players_update_policy" on public.room_players;
drop policy if exists "room_players_delete_policy" on public.room_players;

-- RLS policies
create policy "rooms_select_policy"
  on public.rooms
  for select
  to anon, authenticated
  using (true);

create policy "rooms_insert_policy"
  on public.rooms
  for insert
  to anon, authenticated
  with check (true);

create policy "rooms_update_policy"
  on public.rooms
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "rooms_delete_policy"
  on public.rooms
  for delete
  to anon, authenticated
  using (true);

create policy "room_players_select_policy"
  on public.room_players
  for select
  to anon, authenticated
  using (true);

create policy "room_players_insert_policy"
  on public.room_players
  for insert
  to anon, authenticated
  with check (true);

create policy "room_players_update_policy"
  on public.room_players
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "room_players_delete_policy"
  on public.room_players
  for delete
  to anon, authenticated
  using (true);

-- 3. Stored RPC Functions

-- 3.1 find_quick_match: Find best available open room without password
create or replace function public.find_quick_match(
  p_mode text default null,
  p_map_id text default null
)
returns table (
  id uuid,
  name text,
  host_id text,
  host_name text,
  mode text,
  map_id text,
  max_players integer,
  player_count integer,
  has_password boolean,
  bots_enabled boolean,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Clean up abandoned rooms first
  delete from public.rooms
  where last_heartbeat < now() - interval '45 seconds';

  return query
  select
    r.id,
    r.name,
    r.host_id,
    r.host_name,
    r.mode,
    r.map_id,
    r.max_players,
    r.player_count,
    r.has_password,
    r.bots_enabled,
    r.status
  from public.rooms r
  where r.has_password = false
    and r.status in ('waiting', 'in_progress')
    and r.player_count < r.max_players
    and (p_mode is null or r.mode = p_mode)
    and (p_map_id is null or r.map_id = p_map_id)
  order by
    r.player_count desc,
    r.created_at desc
  limit 1;
end;
$$;

-- 3.2 join_room_with_password: Validate password and join atomically
create or replace function public.join_room_with_password(
  p_room_id uuid,
  p_user_id text,
  p_username text,
  p_hull_id text,
  p_turret_id text,
  p_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room record;
  v_new_count integer;
  v_team text := null;
  v_alpha_count integer;
  v_bravo_count integer;
begin
  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Комната не найдена');
  end if;

  if v_room.has_password and (v_room.password_hash is not null and v_room.password_hash <> '') then
    if p_password is null or p_password <> v_room.password_hash then
      return jsonb_build_object('success', false, 'error', 'Неверный пароль комнаты');
    end if;
  end if;

  if v_room.player_count >= v_room.max_players then
    return jsonb_build_object('success', false, 'error', 'Комната заполнена');
  end if;

  if v_room.mode in ('team_deathmatch', 'capture_point') then
    select count(*) into v_alpha_count from public.room_players where room_id = p_room_id and team = 'alpha';
    select count(*) into v_bravo_count from public.room_players where room_id = p_room_id and team = 'bravo';
    if v_alpha_count <= v_bravo_count then
      v_team := 'alpha';
    else
      v_team := 'bravo';
    end if;
  end if;

  insert into public.room_players (
    room_id, user_id, username, hull_id, turret_id, team, is_host
  ) values (
    p_room_id, p_user_id, p_username, p_hull_id, p_turret_id, v_team, (v_room.host_id = p_user_id)
  )
  on conflict (room_id, user_id) do update set
    username = excluded.username,
    hull_id = excluded.hull_id,
    turret_id = excluded.turret_id,
    team = coalesce(public.room_players.team, excluded.team);

  select count(*) into v_new_count from public.room_players where room_id = p_room_id;
  update public.rooms
  set player_count = v_new_count,
      status = case when v_new_count >= 1 then 'in_progress' else status end,
      last_heartbeat = now()
  where id = p_room_id;

  return jsonb_build_object(
    'success', true,
    'room', row_to_json(v_room),
    'team', v_team
  );
end;
$$;

-- 3.3 leave_room: Leave room and handle host migration / cleanup
create or replace function public.leave_room(
  p_room_id uuid,
  p_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining_count integer;
  v_new_host record;
begin
  delete from public.room_players
  where room_id = p_room_id and user_id = p_user_id;

  select count(*) into v_remaining_count from public.room_players where room_id = p_room_id;

  if v_remaining_count = 0 then
    delete from public.rooms where id = p_room_id;
    return jsonb_build_object('success', true, 'room_deleted', true);
  else
    update public.rooms
    set player_count = v_remaining_count,
        last_heartbeat = now()
    where id = p_room_id;

    select * into v_new_host
    from public.room_players
    where room_id = p_room_id
    order by joined_at asc
    limit 1;

    if found then
      update public.room_players set is_host = true where id = v_new_host.id;
      update public.rooms set host_id = v_new_host.user_id, host_name = v_new_host.username where id = p_room_id;
    end if;

    return jsonb_build_object('success', true, 'room_deleted', false, 'remaining', v_remaining_count);
  end if;
end;
$$;

-- 3.4 heartbeat_room: Keep room alive
create or replace function public.heartbeat_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rooms
  set last_heartbeat = now()
  where id = p_room_id;
end;
$$;

-- 3.5 cleanup_stale_rooms: Clean up abandoned rooms
create or replace function public.cleanup_stale_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rooms
  where last_heartbeat < now() - interval '45 seconds';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- 4. Enable Realtime Publications
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_players'
  ) then
    alter publication supabase_realtime add table public.room_players;
  end if;
exception when others then
  null;
end;
$$;

-- 5. Permissions
grant usage on schema public to anon, authenticated;
grant all on public.rooms to anon, authenticated;
grant all on public.room_players to anon, authenticated;
grant execute on function public.find_quick_match(text, text) to anon, authenticated;
grant execute on function public.join_room_with_password(uuid, text, text, text, text, text) to anon, authenticated;
grant execute on function public.leave_room(uuid, text) to anon, authenticated;
grant execute on function public.heartbeat_room(uuid) to anon, authenticated;
grant execute on function public.cleanup_stale_rooms() to anon, authenticated;
