import { useState } from 'react';
import { arc } from 'd3-shape';
import { addDays } from 'date-fns';
import { dateToAngle } from '../geometry/dateAngle';
import { useSegmentDrag } from './useSegmentDrag';
import { ResizeHandle } from './ResizeHandle';
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
  const [previewEdgeDeltas, setPreviewEdgeDeltas] = useState<{ start: number | null; end: number | null }>({
    start: null,
    end: null,
  });
  const { bind } = useSegmentDrag({ activity, year, onPreviewChange: setPreviewDayDelta });

  const handleEdgePreviewChange = (edge: 'start' | 'end', dayDelta: number | null) => {
    setPreviewEdgeDeltas((prev) => ({ ...prev, [edge]: dayDelta }));
  };

  const effectiveStart = previewDayDelta
    ? addDays(new Date(activity.startDate), previewDayDelta)
    : previewEdgeDeltas.start !== null
      ? addDays(new Date(activity.startDate), previewEdgeDeltas.start)
      : new Date(activity.startDate);
  const effectiveEnd = previewDayDelta
    ? addDays(new Date(activity.endDate!), previewDayDelta)
    : previewEdgeDeltas.end !== null
      ? addDays(new Date(activity.endDate!), previewEdgeDeltas.end)
      : new Date(activity.endDate!);

  const startAngle = dateToAngle(effectiveStart, year);
  const endAngle = dateToAngle(effectiveEnd, year);
  const path = arcGenerator({ innerRadius, outerRadius, startAngle, endAngle } as any);

  const isResizing = previewEdgeDeltas.start !== null || previewEdgeDeltas.end !== null;

  return (
    <>
      <path
        {...(bind() as any)}
        data-activity-id={activity.id}
        d={path ?? undefined}
        fill={activity.color ?? color}
        opacity={previewDayDelta !== null || isResizing ? 0.6 : 1}
        style={{ touchAction: 'none', cursor: 'grab' }}
      />
      {activity.kind === 'range' && activity.endDate && (
        <>
          <ResizeHandle edge="start" activity={activity} radius={outerRadius} year={year} onPreviewChange={handleEdgePreviewChange} />
          <ResizeHandle edge="end" activity={activity} radius={outerRadius} year={year} onPreviewChange={handleEdgePreviewChange} />
        </>
      )}
    </>
  );
}
