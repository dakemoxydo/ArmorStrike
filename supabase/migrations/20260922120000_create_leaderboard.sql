-- ArmorStrike L3: Global leaderboard (best score per authenticated player).
-- Write path: SECURITY DEFINER RPC only (no direct Data API writes).
-- Read path: public SELECT for anon + authenticated.

-- 1. One row per user: personal best + context of that match.
create table if not exists public.leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) >= 3 and char_length(username) <= 20),
  best_score integer not null default 0 check (best_score >= 0 and best_score <= 1000000),
  kills integer not null default 0 check (kills >= 0 and kills <= 1000),
  deaths integer not null default 0 check (deaths >= 0 and deaths <= 1000),
  best_streak integer not null default 0 check (best_streak >= 0 and best_streak <= 1000),
  mode text not null default 'deathmatch'
    check (mode in ('deathmatch', 'team_deathmatch', 'capture_point')),
  match_time_sec integer not null default 0 check (match_time_sec >= 0 and match_time_sec <= 7200),
  matches_played integer not null default 1 check (matches_played >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Top-N ranking scan: score desc, earlier achievement first on ties.
create index if not exists idx_leaderboard_best_score
  on public.leaderboard (best_score desc, updated_at asc, user_id asc);

alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard_select_policy" on public.leaderboard;
create policy "leaderboard_select_policy"
  on public.leaderboard
  for select
  to anon, authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies: clients cannot write the table directly.
revoke all on public.leaderboard from anon, authenticated;
grant select on public.leaderboard to anon, authenticated;

-- 2. Submit one match result. Username always comes from profiles (not client).
--    Upsert keeps only the personal best; detail columns follow the best run.
create or replace function public.submit_leaderboard_entry(
  p_score integer,
  p_kills integer,
  p_deaths integer,
  p_mode text,
  p_match_time_sec integer,
  p_best_streak integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := (select auth.uid());
  v_username text;
  v_prev_score integer;
  v_best integer;
  v_improved boolean;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'auth_required');
  end if;

  -- Clamp hostile/buggy client numbers before CHECK constraints fire.
  p_score := least(greatest(coalesce(p_score, 0), 0), 1000000);
  p_kills := least(greatest(coalesce(p_kills, 0), 0), 1000);
  p_deaths := least(greatest(coalesce(p_deaths, 0), 0), 1000);
  p_match_time_sec := least(greatest(coalesce(p_match_time_sec, 0), 0), 7200);
  p_best_streak := least(greatest(coalesce(p_best_streak, 0), 0), 1000);
  if p_mode is null or p_mode not in ('deathmatch', 'team_deathmatch', 'capture_point') then
    p_mode := 'deathmatch';
  end if;
  if p_best_streak > p_kills then
    p_best_streak := p_kills;
  end if;

  select username into v_username
  from public.profiles
  where id = v_uid;

  if v_username is null then
    return jsonb_build_object('success', false, 'error', 'profile_missing');
  end if;

  select best_score into v_prev_score
  from public.leaderboard
  where user_id = v_uid;

  insert into public.leaderboard (
    user_id, username, best_score, kills, deaths, best_streak,
    mode, match_time_sec, matches_played
  ) values (
    v_uid, v_username, p_score, p_kills, p_deaths, p_best_streak,
    p_mode, p_match_time_sec, 1
  )
  on conflict (user_id) do update set
    username = excluded.username,
    matches_played = public.leaderboard.matches_played + 1,
    best_score = greatest(public.leaderboard.best_score, excluded.best_score),
    kills = case when excluded.best_score > public.leaderboard.best_score
                 then excluded.kills else public.leaderboard.kills end,
    deaths = case when excluded.best_score > public.leaderboard.best_score
                  then excluded.deaths else public.leaderboard.deaths end,
    best_streak = case when excluded.best_score > public.leaderboard.best_score
                       then excluded.best_streak else public.leaderboard.best_streak end,
    mode = case when excluded.best_score > public.leaderboard.best_score
                then excluded.mode else public.leaderboard.mode end,
    match_time_sec = case when excluded.best_score > public.leaderboard.best_score
                          then excluded.match_time_sec else public.leaderboard.match_time_sec end,
    updated_at = case when excluded.best_score > public.leaderboard.best_score
                      then now() else public.leaderboard.updated_at end;

  select best_score into v_best
  from public.leaderboard
  where user_id = v_uid;

  v_improved := v_prev_score is null or p_score > v_prev_score;

  return jsonb_build_object(
    'success', true,
    'improved', v_improved,
    'best_score', coalesce(v_best, p_score),
    'matches_played', (
      select matches_played from public.leaderboard where user_id = v_uid
    )
  );
exception
  when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.submit_leaderboard_entry(integer, integer, integer, text, integer, integer) from public;
grant execute on function public.submit_leaderboard_entry(integer, integer, integer, text, integer, integer) to authenticated;

-- 3. 1-based rank of the caller's personal best (ties: earlier updated_at, then user_id).
create or replace function public.leaderboard_my_rank()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := (select auth.uid());
  v_rank integer;
begin
  if v_uid is null then
    return null;
  end if;

  select rank into v_rank
  from (
    select user_id,
           dense_rank() over (
             order by best_score desc, updated_at asc, user_id asc
           ) as rank
    from public.leaderboard
  ) ranked
  where user_id = v_uid;

  return v_rank;
end;
$$;

revoke all on function public.leaderboard_my_rank() from public;
grant execute on function public.leaderboard_my_rank() to authenticated;

-- 4. Expose schema to PostgREST and refresh catalog.
notify pgrst, 'reload schema';
