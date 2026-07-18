// ===== Контроллер качества графики (low/medium/high) =====
import type { RenderWorld } from './RenderWorld';
import type { AudioPort } from './ports/AudioPort';
import {
  getQualityPreset, nextQuality, saveQuality, type QualityLevel,
} from './graphicsQuality';

/**
 * Инкапсулирует логику переключения/установки пресета качества графики.
 * Ранее жила в Game (getQuality/cycleQuality/setQuality).
 */
export class QualityController {
  constructor(
    private renderWorld: RenderWorld,
    private audio: AudioPort,
  ) {}

  getQuality(): QualityLevel {
    return this.renderWorld.getQuality();
  }

  /** Цикл low → medium → high, сохранение в localStorage. */
  cycleQuality(): QualityLevel {
    const next = nextQuality(this.renderWorld.getQuality());
    const preset = getQualityPreset(next);
    this.renderWorld.applyQuality(preset);
    saveQuality(next);
    this.audio.click();
    return next;
  }

  /** Явная установка качества (например, после load). */
  setQuality(level: QualityLevel): QualityLevel {
    const preset = getQualityPreset(level);
    this.renderWorld.applyQuality(preset);
    saveQuality(level);
    return level;
  }
}
