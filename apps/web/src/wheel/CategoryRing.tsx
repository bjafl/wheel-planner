import type { Activity, Ring } from '../types';
import { ActivitySegment } from './ActivitySegment';
import { MilestoneMarker } from './MilestoneMarker';
import { expandRecurrence } from '../geometry/recurrence';
import { CATEGORY_RING_START_RADIUS, CATEGORY_RING_WIDTH, LANE_WIDTH } from './constants';

function occurrencesFor(activity: Activity, year: number): Activity[] {
  if (!activity.recurrenceRule) return [activity];
  const anchor = new Date(activity.startDate);
  const rule = {
    type: activity.recurrenceRule.type,
    interval: activity.recurrenceRule.interval,
    until: activity.recurrenceRule.until ? new Date(activity.recurrenceRule.until) : null,
  };
  return expandRecurrence(anchor, rule, year).map((date) => ({
    ...activity,
    startDate: date.toISOString().slice(0, 10),
  }));
}

export function CategoryRing({
  ring,
  ringIndex,
  activities,
  year,
}: {
  ring: Ring;
  ringIndex: number;
  activities: Activity[];
  year: number;
}) {
  const ringInner = CATEGORY_RING_START_RADIUS + ringIndex * CATEGORY_RING_WIDTH;
  const expanded = activities.flatMap((activity) => occurrencesFor(activity, year));

  return (
    <g>
      {expanded.map((occurrence, i) => {
        const laneInner = ringInner + occurrence.lane * LANE_WIDTH;
        const laneOuter = laneInner + LANE_WIDTH;
        return occurrence.kind === 'range' ? (
          <ActivitySegment
            key={`${occurrence.id}-${i}`}
            activity={occurrence}
            innerRadius={laneInner}
            outerRadius={laneOuter}
            year={year}
            color={ring.color}
          />
        ) : (
          <MilestoneMarker
            key={`${occurrence.id}-${i}`}
            activity={occurrence}
            radius={(laneInner + laneOuter) / 2}
            year={year}
            color={ring.color}
          />
        );
      })}
    </g>
  );
}
