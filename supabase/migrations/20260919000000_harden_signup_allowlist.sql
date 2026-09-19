-- Follow-up к 20260918120000: allowlist разблокировок при регистрации.
-- `raw_user_meta_data` перезаписывается клиентом: без allowlist регистрация
-- с unlocked_hulls/turrets=[все] дарила бесплатный арсенал (credits уже
-- clamp'ятся, см. handle_new_user). Канон id — src/core/catalogData.ts:
-- корпуса hunter/viking/mammoth/speedy/titan, башни
-- railgun/flamethrower/cannon/gauss/isida.

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
  v_credits := least(greatest(coalesce((new.raw_user_meta_data->>'credits')::integer, 0), 0), 100000);

  -- Только известные id, чужие/пустые — в дефолт (стартовый набор).
  if new.raw_user_meta_data ? 'unlocked_hulls' then
    select array_agg(x::text) into v_unlocked_hulls
    from jsonb_array_elements_text(new.raw_user_meta_data->'unlocked_hulls') as x
    where x::text = any (array['hunter', 'viking', 'mammoth', 'speedy', 'titan']);
  end if;
  if v_unlocked_hulls is null or array_length(v_unlocked_hulls, 1) is null then
    v_unlocked_hulls := array['hunter'];
  end if;

  if new.raw_user_meta_data ? 'unlocked_turrets' then
    select array_agg(x::text) into v_unlocked_turrets
    from jsonb_array_elements_text(new.raw_user_meta_data->'unlocked_turrets') as x
    where x::text = any (array['railgun', 'flamethrower', 'cannon', 'gauss', 'isida']);
  end if;
  if v_unlocked_turrets is null or array_length(v_unlocked_turrets, 1) is null then
    v_unlocked_turrets := array['railgun'];
  end if;

  v_current_hull := coalesce(new.raw_user_meta_data->>'current_hull', 'hunter');
  if not (v_current_hull = any (v_unlocked_hulls)) then
    v_current_hull := v_unlocked_hulls[1];
  end if;
  v_current_turret := coalesce(new.raw_user_meta_data->>'current_turret', 'railgun');
  if not (v_current_turret = any (v_unlocked_turrets)) then
    v_current_turret := v_unlocked_turrets[1];
  end if;

  v_starter_pack_claimed := coalesce((new.raw_user_meta_data->>'starter_pack_claimed')::boolean, false);

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

notify pgrst, 'reload schema';
