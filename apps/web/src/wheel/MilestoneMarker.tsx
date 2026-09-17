import { dateToAngle } from '../geometry/dateAngle';
import type { Activity } from '../types';

export function MilestoneMarker({
  activity,
  radius,
  year,
  color,
}: {
  activity: Activity;
  radius: number;
  year: number;
  color: string;
}) {
  const angle = dateToAngle(new Date(activity.startDate), year) - Math.PI / 2;
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  return <circle data-milestone-id={activity.id} cx={x} cy={y} r={6} fill={activity.color ?? color} />;
}
