import { useDrag } from '@use-gesture/react';
import { isLeapYear } from 'date-fns';
import { addDays } from 'date-fns';
import type { Activity } from '../types';
import { useWheelStore } from '../store/wheelStore';
import { screenToLocalPoint } from './pointerMath';

function yearLength(year: number): number {
  return isLeapYear(new Date(year, 0, 1)) ? 366 : 365;
}

export function angleDeltaToDayDelta(angleDelta: number, year: number): number {
  return (angleDelta / (2 * Math.PI)) * yearLength(year);
}

function pointerAngle(x: number, y: number): number {
  // atan2 returns 0 at 3 o'clock, increasing counter-clockwise; shift so 0 = 12 o'clock, clockwise-positive
  return Math.atan2(x, -y);
}

export function useSegmentDrag({
  activity,
  year,
  onPreviewChange,
}: {
  activity: Activity;
  year: number;
  onPreviewChange: (dayDelta: number | null) => void;
}) {
  const updateActivity = useWheelStore((s) => s.updateActivity);

  const bind = useDrag(({ first, last, xy: [x, y], event, memo }) => {
    const { x: localX, y: localY } = screenToLocalPoint(event.target as SVGGraphicsElement, x, y);
    const currentAngle = pointerAngle(localX, localY);

    const startAngle = first ? currentAngle : memo;
    const dayDelta = Math.round(angleDeltaToDayDelta(currentAngle - startAngle, year));

    if (last) {
      onPreviewChange(null);
      if (dayDelta !== 0) {
        const newStart = addDays(new Date(activity.startDate), dayDelta);
        const newEnd = activity.endDate ? addDays(new Date(activity.endDate), dayDelta) : null;
        updateActivity(activity.id, {
          startDate: newStart.toISOString().slice(0, 10),
          endDate: newEnd ? newEnd.toISOString().slice(0, 10) : null,
        });
      }
    } else {
      onPreviewChange(dayDelta);
    }

    return startAngle;
  });

  return { bind };
}
