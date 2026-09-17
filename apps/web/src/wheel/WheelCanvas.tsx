import { useState, type ReactNode } from 'react';
import { useGesture } from '@use-gesture/react';
import { WHEEL_SIZE, CENTER } from './constants';

export function WheelCanvas({ children }: { children: ReactNode }) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  const bind = useGesture({
    onDrag: ({ event, offset: [x, y], pinching }) => {
      if ((event.target as Element)?.closest?.('[data-wheel-draggable]')) return;
      if (pinching) return;
      setTransform((t) => ({ ...t, x, y }));
    },
    onPinch: ({ event, offset: [scale] }) => {
      if ((event.target as Element)?.closest?.('[data-wheel-draggable]')) return;
      setTransform((t) => ({ ...t, scale: Math.min(Math.max(scale, 0.5), 3) }));
    },
    onWheel: ({ event, delta: [, dy] }) => {
      if ((event.target as Element)?.closest?.('[data-wheel-draggable]')) return;
      setTransform((t) => ({ ...t, scale: Math.min(Math.max(t.scale - dy * 0.001, 0.5), 3) }));
    },
  });

  return (
    <svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`} {...(bind() as any)} style={{ touchAction: 'none' }}>
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
        <g transform={`translate(${CENTER}, ${CENTER})`}>{children}</g>
      </g>
    </svg>
  );
}
