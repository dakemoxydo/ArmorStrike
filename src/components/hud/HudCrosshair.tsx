import type { RefObject } from 'react';

interface HudCrosshairProps {
  crossRef: RefObject<HTMLDivElement | null>;
  hitmark: { kill: boolean; key: number } | null;
}

export default function HudCrosshair({ crossRef, hitmark }: HudCrosshairProps) {
  return (
    <div ref={crossRef} className="crosshair" style={{ left: '50%', top: '50%' }} aria-hidden>
      <div
        className="cross-core"
        onAnimationEnd={(e) => {
          // Drop the shot pulse so the next shot can restart it. Doing this
          // here (instead of a forced reflow in useGameHud) keeps layout out
          // of the fire path; under prefers-reduced-motion the animation never
          // runs, so the class simply stays and stays invisible.
          if (e.animationName === 'ch-pulse') {
            e.currentTarget.classList.remove('shot-pulse');
          }
        }}
      >
        <span className="ch-dot" />
        <span className="ch-ring" />
        <span className="ch-tick t" /><span className="ch-tick b" />
        <span className="ch-tick l" /><span className="ch-tick r" />
      </div>
      {hitmark && (
        <div key={hitmark.key} className={`hitmarker ${hitmark.kill ? 'kill' : ''}`}>
          <span /><span /><span /><span />
        </div>
      )}
    </div>
  );
}
