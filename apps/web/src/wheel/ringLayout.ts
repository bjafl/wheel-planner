import type { Activity } from '../types';
import { CATEGORY_RING_START_RADIUS, CATEGORY_RING_WIDTH, LANE_WIDTH } from './constants';

export function ringBandHeight(activities: Activity[]): number {
  const maxLane = activities.reduce((max, a) => Math.max(max, a.lane), -1);
  return Math.max(CATEGORY_RING_WIDTH, (maxLane + 1) * LANE_WIDTH);
}

export function ringInnerRadii(
  rings: Array<{ id: string }>,
  activitiesByRing: Map<string, Activity[]>
): Map<string, number> {
  let radius = CATEGORY_RING_START_RADIUS;
  const result = new Map<string, number>();
  for (const ring of rings) {
    result.set(ring.id, radius);
    radius += ringBandHeight(activitiesByRing.get(ring.id) ?? []);
  }
  return result;
}
