import { describe, it, expect } from 'vitest';
import { angleDeltaToDayDelta } from './useSegmentDrag';

describe('angleDeltaToDayDelta', () => {
  it('converts a full-circle angle delta to a full year of days', () => {
    const days = angleDeltaToDayDelta(2 * Math.PI, 2026);
    expect(days).toBeCloseTo(365, 5);
  });

  it('converts a zero angle delta to zero days', () => {
    expect(angleDeltaToDayDelta(0, 2026)).toBeCloseTo(0, 5);
  });

  it('handles negative deltas (dragging counter-clockwise)', () => {
    const days = angleDeltaToDayDelta(-Math.PI, 2026);
    expect(days).toBeCloseTo(-365 / 2, 5);
  });
});
