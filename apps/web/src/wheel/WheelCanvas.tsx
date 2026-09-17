import type { ReactNode } from 'react';
import { WHEEL_SIZE, CENTER } from './constants';

export function WheelCanvas({ children }: { children: ReactNode }) {
  return (
    <svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
      <g transform={`translate(${CENTER}, ${CENTER})`}>{children}</g>
    </svg>
  );
}
