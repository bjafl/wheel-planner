import { describe, it, expect } from 'vitest';
import { ringBandHeight, ringInnerRadii } from './ringLayout';
import { CATEGORY_RING_START_RADIUS, CATEGORY_RING_WIDTH, LANE_WIDTH } from './constants';
import type { Activity } from '../types';

function activity(id: string, lane: number): Activity {
  return {
    id,
    ringId: 'r1',
    title: id,
    notes: null,
    kind: 'milestone',
    startDate: '2026-01-01',
    endDate: null,
    recurrenceRule: null,
    lane,
    color: null,
  };
}

describe('ringBandHeight', () => {
  it('returns the default CATEGORY_RING_WIDTH when there are no activities', () => {
    expect(ringBandHeight([])).toBe(CATEGORY_RING_WIDTH);
  });

  it('returns the default width when the highest lane still fits inside it', () => {
    // lanes 0 and 1 take 2*LANE_WIDTH = 36px, which fits inside the 40px default
    expect(ringBandHeight([activity('a', 0), activity('b', 1)])).toBe(CATEGORY_RING_WIDTH);
  });

  it('grows beyond the default width when a lane would overflow it', () => {
    // lane 2 needs 3*LANE_WIDTH = 54px, which exceeds the 40px default
    expect(ringBandHeight([activity('a', 0), activity('b', 1), activity('c', 2)])).toBe(3 * LANE_WIDTH);
  });
});

describe('ringInnerRadii', () => {
  it('stacks ring bands cumulatively so a wide ring pushes the next ring outward', () => {
    const rings = [{ id: 'r1' }, { id: 'r2' }];
    const activitiesByRing = new Map([
      ['r1', [activity('a', 0), activity('b', 1), activity('c', 2)]], // needs 54px, not the 40px default
      ['r2', []],
    ]);

    const radii = ringInnerRadii(rings, activitiesByRing);

    expect(radii.get('r1')).toBe(CATEGORY_RING_START_RADIUS);
    expect(radii.get('r2')).toBe(CATEGORY_RING_START_RADIUS + 3 * LANE_WIDTH);
  });
});
