# GDD Drafts

Черновики механик **ещё не реализованных** или design trail.

- Не ссылайтесь на Drafts из production-кода как на source of truth.
- После имплементации: `../Approved/` + обновить `00_Index.md`.
- Реализованные черновики после синхронизации в `../Approved/` **удаляются** —
  история остаётся в git, в этом файле не накапливается.

## Active / trail

- [[New_Turret_Proposals]] — концепты новых башен (Рикошет, Твинс, Изида, Молот, Гром) по мотивам Tanki Online. «Изида» реализована → [[../Approved/Weapon_Isida|Weapon_Isida]].
- [[Visual_Coherence_Pass]] — подогнать мир/свет/FX/UI-остатки под комикс/cel. Срез 1 shipped (циан, IBL/bloom, земля, трассер Смоки, неймплейты). Открыто: небо, город day/dusk, ink зданий, остовы, подиум гаража.


## Ideas backlog

- [[Tanki_Online_Alignment_Ideas]] — реестр предложений «как сделать игру похожей на Tanki
  Online» (22 пункта в 4 тира + «что не берём»). бенчмарк: tankionline.com.
- [[Tanki_Online_Combat_And_Style]] — то же, но про сам бой: gunplay (числа урона, криты,
  резисты, разброс, ассисты), вертикаль и трамплины, статусы/янки снабжения, миникарта,
  визуальный язык (палитра, фракционные цвета, трассеры), форматы боёв, настройки боя. 41 пункт.

Добавляйте `Mechanic_Name.md` (Intent / Open questions / Acceptance).
