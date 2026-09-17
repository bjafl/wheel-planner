import { useState } from 'react';
import { arc } from 'd3-shape';
import { addDays } from 'date-fns';
import { dateToAngle } from '../geometry/dateAngle';
import { useSegmentDrag } from './useSegmentDrag';
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
  const [previewDayDelta, setPreviewDayDelta] = useState<number | null>(null);
  const { bind } = useSegmentDrag({ activity, year, onPreviewChange: setPreviewDayDelta });

  const effectiveStart = previewDayDelta ? addDays(new Date(activity.startDate), previewDayDelta) : new Date(activity.startDate);
  const effectiveEnd = previewDayDelta ? addDays(new Date(activity.endDate!), previewDayDelta) : new Date(activity.endDate!);

  const startAngle = dateToAngle(effectiveStart, year);
  const endAngle = dateToAngle(effectiveEnd, year);
  const path = arcGenerator({ innerRadius, outerRadius, startAngle, endAngle } as any);

  return (
    <path
      {...(bind() as any)}
      data-activity-id={activity.id}
      d={path ?? undefined}
      fill={activity.color ?? color}
      opacity={previewDayDelta !== null ? 0.6 : 1}
      style={{ touchAction: 'none', cursor: 'grab' }}
    />
  );
}
