import { arc } from 'd3-shape';
import { dateToAngle } from '../geometry/dateAngle';
import type { Activity } from '../types';

const arcGenerator = arc();

export function ActivitySegment({
  activity,
  innerRadius,
  outerRadius,
  year,
  color,
}: {
  activity: Activity;
  innerRadius: number;
  outerRadius: number;
  year: number;
  color: string;
}) {
  const startAngle = dateToAngle(new Date(activity.startDate), year);
  const endAngle = dateToAngle(new Date(activity.endDate!), year);
  const path = arcGenerator({ innerRadius, outerRadius, startAngle, endAngle } as any);

  return <path data-activity-id={activity.id} d={path ?? undefined} fill={activity.color ?? color} />;
}
