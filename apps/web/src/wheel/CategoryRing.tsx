import type { Activity, Ring } from '../types';
import { ActivitySegment } from './ActivitySegment';
import { MilestoneMarker } from './MilestoneMarker';
import { CATEGORY_RING_START_RADIUS, CATEGORY_RING_WIDTH, LANE_WIDTH } from './constants';

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

  return (
    <g>
      {activities.map((activity) => {
        const laneInner = ringInner + activity.lane * LANE_WIDTH;
        const laneOuter = laneInner + LANE_WIDTH;
        return activity.kind === 'range' ? (
          <ActivitySegment
            key={activity.id}
            activity={activity}
            innerRadius={laneInner}
            outerRadius={laneOuter}
            year={year}
            color={ring.color}
          />
        ) : (
          <MilestoneMarker key={activity.id} activity={activity} radius={(laneInner + laneOuter) / 2} year={year} color={ring.color} />
        );
      })}
    </g>
  );
}
