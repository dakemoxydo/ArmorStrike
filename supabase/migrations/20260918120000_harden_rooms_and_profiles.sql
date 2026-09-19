-- Harden profiles exposure, hash room passwords, close open table writes.
-- Follow-up to 20260918000000 / 20260918010000.

create extension if not exists pgcrypto;

-- 1. Profiles: anon may only read id + username (signup uniqueness).
revoke select on public.profiles from anon;
grant select (id, username) on public.profiles to anon;
grant select on public.profiles to authenticated;

drop policy if exists "profiles_select_policy" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_select_usernames"
  on public.profiles
  for select
  to anon
  using (true);

-- Clamp credits copied from user_metadata (client-editable).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
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
  v_credits := least(greatest(coalesce((new.raw_user_meta_data->>'credits')::integer, 0), 0), 100000);
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
    id, username, credits, unlocked_hulls, unlocked_turrets,
    current_hull, current_turret, starter_pack_claimed, quests
  ) values (
    new.id, v_username, v_credits, v_unlocked_hulls, v_unlocked_turrets,
    v_current_hull, v_current_turret, v_starter_pack_claimed, v_quests
  )
  on conflict (id) do update set
    username = excluded.username,
    updated_at = now();

  return new;
end;
$$;

-- 2. Rooms / room_players: no direct writes from the Data API.
drop policy if exists "rooms_insert_policy" on public.rooms;
drop policy if exists "rooms_update_policy" on public.rooms;
drop policy if exists "rooms_delete_policy" on public.rooms;
drop policy if exists "room_players_insert_policy" on public.room_players;
drop policy if exists "room_players_update_policy" on public.room_players;
drop policy if exists "room_players_delete_policy" on public.room_players;

revoke all on public.rooms from anon, authenticated;
grant select (
  id, name, host_id, host_name, mode, map_id, max_players, player_count,
  has_password, bots_enabled, status, created_at, last_heartbeat
) on public.rooms to anon, authenticated;

revoke all on public.room_players from anon, authenticated;
grant select on public.room_players to anon, authenticated;

-- Hash any leftover plaintext passwords (bcrypt hashes start with $2).
update public.rooms
set password_hash = extensions.crypt(password_hash, extensions.gen_salt('bf'))
where password_hash is not null
  and password_hash <> ''
  and password_hash not like '$2%';

-- 3. create_room: hash password server-side, never return the hash.
create or replace function public.create_room(
  p_name text,
  p_host_id text,
  p_host_name text,
  p_mode text,
  p_map_id text,
  p_max_players integer,
  p_password text default null,
  p_bots_enabled boolean default true,
  p_hull_id text default 'hunter',
  p_turret_id text default 'railgun'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_host text;
  v_hash text := null;
  v_has_password boolean := false;
  v_team text := null;
  v_room public.rooms;
begin
  v_host := coalesce((select auth.uid())::text, p_host_id);
  if p_password is not null and length(trim(p_password)) > 0 then
    v_hash := crypt(trim(p_password), gen_salt('bf'));
    v_has_password := true;
  end if;
  if p_mode in ('team_deathmatch', 'capture_point') then
    v_team := 'alpha';
  end if;

  insert into public.rooms (
    name, host_id, host_name, mode, map_id, max_players, player_count,
    has_password, password_hash, bots_enabled, status
  ) values (
    left(trim(p_name), 32),
    v_host,
    left(trim(p_host_name), 32),
    p_mode,
    p_map_id,
    least(greatest(coalesce(p_max_players, 8), 2), 10),
    1,
    v_has_password,
    v_hash,
    coalesce(p_bots_enabled, true),
    'waiting'
  )
  returning * into v_room;

  insert into public.room_players (
    room_id, user_id, username, hull_id, turret_id, team, is_host
  ) values (
    v_room.id, v_host, left(trim(p_host_name), 32), p_hull_id, p_turret_id, v_team, true
  );

  return jsonb_build_object(
    'success', true,
    'room', jsonb_build_object(
      'id', v_room.id,
      'name', v_room.name,
      'host_id', v_room.host_id,
      'host_name', v_room.host_name,
      'mode', v_room.mode,
      'map_id', v_room.map_id,
      'max_players', v_room.max_players,
      'player_count', v_room.player_count,
      'has_password', v_room.has_password,
      'bots_enabled', v_room.bots_enabled,
      'status', v_room.status,
      'created_at', v_room.created_at,
      'last_heartbeat', v_room.last_heartbeat
    )
  );
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.create_room(text, text, text, text, text, integer, text, boolean, text, text) from public;
grant execute on function public.create_room(text, text, text, text, text, integer, text, boolean, text, text) to anon, authenticated;

-- 4. join_room: bcrypt compare; return fresh room without password_hash.
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
set search_path = public, extensions
as $$
declare
  v_room public.rooms;
  v_user text;
  v_new_count integer;
  v_team text := null;
  v_alpha_count integer;
  v_bravo_count integer;
begin
  v_user := coalesce((select auth.uid())::text, p_user_id);

  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Комната не найдена');
  end if;

  if v_room.has_password and v_room.password_hash is not null and v_room.password_hash <> '' then
    if p_password is null or v_room.password_hash <> crypt(p_password, v_room.password_hash) then
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
    p_room_id, v_user, p_username, p_hull_id, p_turret_id, v_team, (v_room.host_id = v_user)
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
  where id = p_room_id
  returning * into v_room;

  return jsonb_build_object(
    'success', true,
    'room', jsonb_build_object(
      'id', v_room.id,
      'name', v_room.name,
      'host_id', v_room.host_id,
      'host_name', v_room.host_name,
      'mode', v_room.mode,
      'map_id', v_room.map_id,
      'max_players', v_room.max_players,
      'player_count', v_room.player_count,
      'has_password', v_room.has_password,
      'bots_enabled', v_room.bots_enabled,
      'status', v_room.status,
      'created_at', v_room.created_at,
      'last_heartbeat', v_room.last_heartbeat
    ),
    'team', v_team
  );
end;
$$;

revoke all on function public.join_room_with_password(uuid, text, text, text, text, text) from public;
grant execute on function public.join_room_with_password(uuid, text, text, text, text, text) to anon, authenticated;

-- 5. leave_room: logged-in callers can only leave as themselves.
create or replace function public.leave_room(
  p_room_id uuid,
  p_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user text;
  v_remaining_count integer;
  v_new_host record;
begin
  v_user := coalesce((select auth.uid())::text, p_user_id);

  delete from public.room_players
  where room_id = p_room_id and user_id = v_user;

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
      update public.room_players set is_host = (id = v_new_host.id) where room_id = p_room_id;
      update public.rooms set host_id = v_new_host.user_id, host_name = v_new_host.username where id = p_room_id;
    end if;

    return jsonb_build_object('success', true, 'room_deleted', false, 'remaining', v_remaining_count);
  end if;
end;
$$;

revoke all on function public.leave_room(uuid, text) from public;
grant execute on function public.leave_room(uuid, text) to anon, authenticated;

-- 6. heartbeat: authenticated users must be in the room.
create or replace function public.heartbeat_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
begin
  v_uid := (select auth.uid());
  if v_uid is not null then
    if not exists (
      select 1 from public.room_players
      where room_id = p_room_id and user_id = v_uid::text
    ) then
      return;
    end if;
  end if;

  update public.rooms
  set last_heartbeat = now()
  where id = p_room_id;
end;
$$;

revoke all on function public.heartbeat_room(uuid) from public;
grant execute on function public.heartbeat_room(uuid) to anon, authenticated;
