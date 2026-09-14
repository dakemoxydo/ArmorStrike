// ===== M20: бегущий фронт луча рельсотрона (unit-test without Three.js) =====
// Hitscan-урон остаётся мгновенным; BeamSweep раскладывает ПОКАЗ выстрела
// (impact-вспышки, debris, ионный трейл) по таймлайну: фронт луча бежит от
// дула с заданной скоростью, и каждое событие срабатывает, когда фронт его
// проходит. Визуально выстрел «прошивает» линию вместо вспышки целиком.

export interface BeamSweepEvent {
  /** Расстояние от дула вдоль луча, на котором событие срабатывает. */
  d: number;
  run: () => void;
}

export class BeamSweep {
  private front = 0;
  private idx = 0;

  /**
   * @param total  итоговая длина луча (wall.dist или полный range)
   * @param speed  скорость фронта, юнитов/с
   * @param events события по возрастанию d (будут отсортированы и зажаты в [0, total])
   */
  constructor(
    private readonly total: number,
    private readonly speed: number,
    private readonly events: BeamSweepEvent[],
  ) {
    for (const e of this.events) {
      // За пределами видимого луча событий быть не должно (wall — ровно на total).
      if (e.d > this.total) e.d = this.total;
      if (e.d < 0) e.d = 0;
    }
    this.events.sort((a, b) => a.d - b.d);
  }

  /**
   * Продвинуть фронт на dt, вызвать пройденные события, сообщить текущую
   * видимую длину луча через setLength (клампит RailgunBeamFx).
   * @returns true, когда фронт дошёл до total — свип завершён.
   */
  step(dt: number, setLength: (len: number) => void): boolean {
    this.front = Math.min(this.total, this.front + this.speed * dt);
    while (this.idx < this.events.length && this.events[this.idx].d <= this.front) {
      this.events[this.idx].run();
      this.idx += 1;
    }
    setLength(this.front);
    return this.front >= this.total;
  }
}
