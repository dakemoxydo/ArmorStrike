# Standard Cel-Shaded Rendering (Комиксный конвейер рендеринга)

**Статус:** Standard Pattern  
**Код:** `src/game/shaders/celShading.ts`, `src/game/tank/comicInkOutline.ts`, `src/game/tank/TankFactory.ts`, `src/game/ArenaBuilder.ts`, `src/game/Arena.ts`, `src/game/atmospherePresets.ts`

---

## 1. Концепция и архитектурная мотивация

В игре с процедурной геометрией танков (`partKit.ts`) стандартный PBR-конвейер с непрерывным распределением микрофасеток (GGX) подчёркивает стыки и угловатость примитивов. Перевод рендеринга в **стилизованный Cel-Shaded Low-Poly / Комикс** решает эту задачу аппаратно, объединяя:
1. **Ступенчатое квантование рассеянного света (Cel-Shading)** на стандартных материалах танков и архитектуры уровней.
2. **Чернильный силуэтный контур (Inverted-Hull Ink Outline)** без оверхеда пост-процессинга.
3. **Солнечную дневную атмосферу (High-Key Comic Atmospheres)** взамен туманной ночи.

---

## 2. Квантование освещения (`applyCelShading`)

### Архитектурный выбор: патчинг `MeshStandardMaterial` против отдельных шейдеров
В Three.js r185 переход на кастомный `ShaderMaterial` сломал бы:
- Интеграцию с каскадными тенями `DirectionalLight` (`PCFShadowMap`).
- Систему динамического тонирования корпуса при уроне (`TankAnimationSystem` масштабирует `bodyMats[i].color`).
- Тесты на тип материалов (`instanceof THREE.MeshStandardMaterial`).

Поэтому квантование реализовано через функцию-декоратор `applyCelShading(material)` с инжекцией в хук `material.onBeforeCompile`:

```glsl
#include <lights_physical_fragment>

// Квантование диффузной освещенности на 3 дискретных уровня
float _cel_dLum = length(reflectedLight.directDiffuse);
if (_cel_dLum > 0.0005) {
  float _cel_stepped = floor(_cel_dLum * 3.0 + 0.45) / 3.0;
  _cel_stepped = max(_cel_stepped, 0.30); // защита от проваливания теней в черное
  reflectedLight.directDiffuse *= (_cel_stepped / _cel_dLum);
}

// Графичный ступенчатый блик
float _cel_sLum = length(reflectedLight.directSpecular);
if (_cel_sLum > 0.0005) {
  float _cel_specCut = step(0.16, _cel_sLum);
  reflectedLight.directSpecular *= (_cel_specCut / _cel_sLum);
}
```

Ключ кэширования программ:
`material.customProgramCacheKey = () => 'cel-shaded-std-v1';`
гарантирует, что WebGLRenderer переиспользует единую скомпилированную программу для всех стилизованных материалов танка и геометрии карты.

---

## 3. Расширение Cel-Shading на геометрию уровней

Для устранения визуального контраста между стилизованной техникой и фотореалистичным окружением `applyCelShading` применяется ко всем стандартным материалам арены (`ArenaBuilder.ts` и `Arena.ts`):
- Периметр стен, пилоны и перекрытия (`shell.ts`).
- Здания, цистерны, краны и трубы Завода (`factoryMap.ts`).
- Небоскрёбы, эстакады и ограждения Города (`cityMap.ts`).
- Дома, амбары, часовня и мельницы Деревни (`villageMap.ts`).
- Разрушаемые и статические блоки препятствий (`Arena.addColliderBlock`).

---

## 4. Чернильный контур (`comicInkOutline`)

Силуэт формируется методом **Inverted Hull**:
1. Для каждой твёрдой детали корпуса, башни и ствола создаётся дочерний меш с той же геометрией и материалом `side: THREE.BackSide`.
2. Материал контура (`comicInk`) выталкивает вершины наружу вдоль нормали с экранной компенсацией дистанции:
   $$\Delta \mathbf{v} = \mathbf{n} \cdot \left[ w \cdot \text{mix}\left(1.0, \frac{\|\mathbf{p}_{\text{cam}}\|}{d_{\text{ref}}}, k_{\text{mix}}\right) \right]$$
   - Базовая толщина: $w = 0.024$ м.
   - Опорная дистанция: $d_{\text{ref}} = 40.0$ м.
   - Коэффициент сглаживания: $k_{\text{mix}} = 0.45$.
3. Меши контура являются прямыми детьми деталей — они автоматически наследуют вращение башни, тангаж орудия и динамику подвески без покадровых вычислений матриц в JS.
4. Контур рендерится в opaque-очереди (`renderOrder: (src.renderOrder || 0) - 1`) и не конфликтует со stencil-системой целеуказания `modelOutline.ts`.

---

## 5. Бюджет и инварианты производительности

| Параметр | Значение | Обоснование |
|---|---|---|
| Дополнительные Render Passes | **0** | Рендерится в основном forward-проходе сцены |
| Пост-процессинг оверхед | **0** | Не требует полноэкранных Sobel/Depth буферов |
| Стабильность FPS | **60+ FPS** | Полная поддержка мобильных GPU и тира `low` |
| Поддержка теней | **Полная** | PCF shadow maps учитываются в прямом свете |
