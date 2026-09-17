import type { Activity, Ring } from '../types';
import { ActivitySegment } from './ActivitySegment';
import { MilestoneMarker } from './MilestoneMarker';
import { expandRecurrence } from '../geometry/recurrence';
import { toIsoDate } from '../geometry/dateAngle';
import { LANE_WIDTH } from './constants';
import { ringBandHeight } from './ringLayout';

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
    startDate: toIsoDate(date),
  }));
}

type SetTooltip = (tooltip: { el: Element; label: string } | null) => void;

export function CategoryRing({
  ring,
  innerRadius,
  activities,
  year,
  setTooltip,
}: {
  ring: Ring;
  innerRadius: number;
  activities: Activity[];
  year: number;
  setTooltip: SetTooltip;
}) {
  const ringInner = innerRadius;
  const bandHeight = ringBandHeight(activities);
  const labelRadius = ringInner + bandHeight / 2;
  const expanded = activities.flatMap((activity) => occurrencesFor(activity, year));

  return (
    <g>
      <text
        data-ring-label={ring.id}
        x={0}
        y={-labelRadius}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fill="#374151"
      >
        {ring.name}
      </text>
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
            setTooltip={setTooltip}
          />
        ) : (
          <MilestoneMarker
            key={`${occurrence.id}-${i}`}
            activity={occurrence}
            radius={(laneInner + laneOuter) / 2}
            year={year}
            color={ring.color}
            setTooltip={setTooltip}
          />
        );
      })}
    </g>
  );
}
