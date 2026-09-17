import { useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { addDays } from 'date-fns';
import { dateToAngle } from '../geometry/dateAngle';
import { angleDeltaToDayDelta } from './useSegmentDrag';
import { useWheelStore } from '../store/wheelStore';
import { CENTER } from './constants';
import type { Activity } from '../types';

function pointerAngle(x: number, y: number): number {
  return Math.atan2(x, -y);
}

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
  const updateActivity = useWheelStore((s) => s.updateActivity);
  const [previewDayDelta, setPreviewDayDelta] = useState<number | null>(null);

  const bind = useDrag(({ first, last, xy: [x, y], event, memo }) => {
    const svg = (event.target as SVGElement).ownerSVGElement;
    const rect = svg!.getBoundingClientRect();
    const localX = x - rect.left - CENTER;
    const localY = y - rect.top - CENTER;
    const currentAngle = pointerAngle(localX, localY);

    const startAngle = first ? currentAngle : memo;
    const dayDelta = Math.round(angleDeltaToDayDelta(currentAngle - startAngle, year));

    if (last) {
      setPreviewDayDelta(null);
      if (dayDelta !== 0) {
        const newDate = addDays(new Date(activity.startDate), dayDelta);
        updateActivity(activity.id, { startDate: newDate.toISOString().slice(0, 10) });
      }
    } else {
      setPreviewDayDelta(dayDelta);
    }

    return startAngle;
  });

  const effectiveDate = previewDayDelta ? addDays(new Date(activity.startDate), previewDayDelta) : new Date(activity.startDate);
  const angle = dateToAngle(effectiveDate, year) - Math.PI / 2;
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  return (
    <circle
      {...(bind() as any)}
      data-milestone-id={activity.id}
      cx={x}
      cy={y}
      r={6}
      fill={activity.color ?? color}
      opacity={previewDayDelta !== null ? 0.6 : 1}
      style={{ touchAction: 'none', cursor: 'grab' }}
    />
  );
}
