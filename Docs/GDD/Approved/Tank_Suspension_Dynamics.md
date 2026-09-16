# Tank Suspension Dynamics — Динамика подвески и отдача корпуса

**Статус:** Approved  
**Слой:** Presentation / Animation  
**Связано:** [[Tank_Movement]], [[Tank_Aim]], [[Vertical_Auto_Aim]], [[Damage_System]], [[Weapon_Cannon]], [[Weapon_Railgun]]

## Назначение

Физическая динамика подвески, продольного и поперечного крена корпуса танка. Устраняет эффект «пластиковой коробки на льду» и обеспечивает ощущение многотонной массы, торсионной подвески и отдачи орудий крупного калибра.
Применяется **строго к визуальному слою** (`visual.hull.rotation.x` и `visual.hull.rotation.z`): 2D-физика движения и хитбоксы не затронуты. Направление выстрела `aimDir` (азимут `aimYaw` + тангаж `barrelPitch`, [[Tank_Aim]] / [[Vertical_Auto_Aim]]) **не компенсирует качание корпуса** — ствол едет вместе с ним, а вертикальная автонаводка доворачивает тангаж относительно текущего положения корпуса (стабилизации орудия нет).

## Источник истины в коде

- Константы: `SUSPENSION_TUNING` в `src/game/tuning.ts`
- Симуляция подвески: `TankAnimationSystem.ts`
- Импульс отдачи орудий: `Tank.ts` (`onFired`)
- Порядок вращения меша: `hullGroup.rotation.order = 'YXZ'` в `TankFactory.ts`
- Состояние FX: `TankFxState` в `src/game/tank/types.ts` и `components.ts`
- Юнит-тесты: `src/__tests__/tankSuspension.test.ts`

## Константы (`SUSPENSION_TUNING`)

| Константа | Значение | Описание |
|-----------|----------|----------|
| `omega` | 14.0 рад/с | Собственная угловая частота пружин подвески ($\omega_n$) |
| `zeta` | 0.68 | Коэффициент затухания ($\zeta$) — слабозатухающие колебания с 1–2 полуволнами |
| `pitchAccel` | 0.0035 | Чувствительность наклона носа/кормы к продольному ускорению |
| `rollCentrif` | 0.0030 | Чувствительность бокового крена к центробежной силе в повороте |
| `maxPitch` | 0.066 рад (≈3.8°) | Ограничение максимального угла дифферента (клевка/приседания) |
| `maxRoll` | 0.056 рад (≈3.2°) | Ограничение максимального угла бокового крена |
| `recoilPitchScale` | 0.0040 | Передача импульса выстрела в угловую скорость питча корпуса |
| `recoilRollScale` | 0.0040 | Передача импульса выстрела в угловую скорость бокового крена |
| `flinchScale` | 0.0025 | Масштаб сотрясения шасси от внешнего импульса `knockback` |

## Математическая модель (Spring-Damper)

Динамика наклонов корпуса по осям Pitch ($\theta_p$) и Roll ($\theta_r$) рассчитывается через уравнение затухающего гармонического осциллятора второго порядка:

$$\ddot{\theta} + 2\zeta\omega_n \dot{\theta} + \omega_n^2 (\theta - \theta_{\text{target}}) = 0$$

В дискретном времени на каждом кадре ($\Delta t$):
```
accel = -omega² * (angle - targetAngle) - 2 * zeta * omega * angleVel
angleVel += accel * dt
angle += angleVel * dt
```

### 1. Продольный крен (Pitch)
- **Ускорение:** $a = (\text{speed} - \text{prevSpeed}) / \Delta t$.
- **Целевой угол:** $\theta_{\text{targetPitch}} = \text{clamp}(-a \cdot K_{\text{pitchAccel}}, -\theta_{\max}, \theta_{\max})$.
  - При ускорении вперёд ($a > 0$): $\theta < 0$ (нос приподнимается, корма приседает).
  - При торможении ($a < 0$): $\theta > 0$ (нос клюёт землю).
  - При остановке ($a = 0$): подвеска плавно совершает затухающие колебания вокруг 0.

### 2. Поперечный крен (Roll)
- **Центробежная сила:** $F_{\text{cf}} = \text{steer} \cdot \omega_{\text{turn}} \cdot \text{speed}$.
- **Целевой угол:** $\theta_{\text{targetRoll}} = \text{clamp}(F_{\text{cf}} \cdot K_{\text{rollCentrif}}, -\phi_{\max}, \phi_{\max})$.
  - При повороте вправо ($\text{steer} > 0$) на скорости: корпус кренится наружу поворота (влево, $\theta_r > 0$).
  - При развороте на месте ($\text{speed} = 0$): крен отсутствует.

### 3. Отдача корпуса при выстреле (Chassis Recoil)
В момент выстрела (`onFired(recoil)`) башня направлена под углом `turretYaw` относительно продольной оси корпуса:

$$\Delta \dot{\theta}_{\text{pitch}} = -\cos(\text{turretYaw}) \cdot \text{recoil} \cdot K_{\text{recoilPitch}}$$
$$\Delta \dot{\theta}_{\text{roll}} = \sin(\text{turretYaw}) \cdot \text{recoil} \cdot K_{\text{recoilRoll}}$$

- **Выстрел вперёд** (`turretYaw = 0`): $\Delta \dot{\theta}_{\text{pitch}} < 0$ — нос подбрасывает вверх, крен нулевой.
- **Выстрел назад** (`turretYaw = \pi`): $\Delta \dot{\theta}_{\text{pitch}} > 0$ — корма подбрасывается вверх, нос опускается.
- **Бортовой выстрел вправо** (`turretYaw = \pi / 2`): $\Delta \dot{\theta}_{\text{roll}} > 0$ — корпус кренится влево (в противоположный борт).
- **Бортовой выстрел влево** (`turretYaw = -\pi / 2`): $\Delta \dot{\theta}_{\text{roll}} < 0$ — корпус кренится вправо.

### 4. Сотрясение от попаданий (Hit Flinch)
При наличии вектора `knockback` от взрывов или снарядов он проецируется в локальные оси танка $(Z_{\text{local}}, X_{\text{local}})$:

$$\Delta \dot{\theta}_{\text{pitch}} = -Z_{\text{local}} \cdot K_{\text{flinch}}$$
$$\Delta \dot{\theta}_{\text{roll}} = -X_{\text{local}} \cdot K_{\text{flinch}}$$

Корпус мгновенно сотрясается в направлении удара и плавно возвращается в исходное состояние.

## Эйлеров порядок вращения

Корпус использует Three.js порядок `rotation.order = 'YXZ'`:
- `rotation.y`: курс танка в мире (`yaw`).
- `rotation.x`: локальный тангаж/дифферент (`pitch`).
- `rotation.z`: локальный крен (`roll`).
Оси наклонов строго привязаны к геометрии машины независимо от её курса на арене.
