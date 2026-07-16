import type { RefObject } from 'react';

interface HudCrosshairProps {
  crossRef: RefObject<HTMLDivElement | null>;
  hitmark: { kill: boolean; key: number } | null;
}

export default function HudCrosshair({ crossRef, hitmark }: HudCrosshairProps) {
  return (
    <div ref={crossRef} className="crosshair" style={{ left: '50%', top: '50%' }} aria-hidden>
      <div className="cross-core">
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
