import { useDrag } from '@use-gesture/react';
import { addDays } from 'date-fns';
import { dateToAngle } from '../geometry/dateAngle';
import { angleDeltaToDayDelta } from './useSegmentDrag';
import { useWheelStore } from '../store/wheelStore';
import { screenToLocalPoint } from './pointerMath';
import type { Activity } from '../types';

export function clampEdgeDate(edge: 'start' | 'end', candidate: Date, currentStart: Date, currentEnd: Date): Date {
  if (edge === 'start') {
    return candidate > currentEnd ? currentEnd : candidate;
  }
  return candidate < currentStart ? currentStart : candidate;
}

function pointerAngle(x: number, y: number): number {
  return Math.atan2(x, -y);
}

export function ResizeHandle({
  edge,
  activity,
  radius,
  year,
  onPreviewChange,
}: {
  edge: 'start' | 'end';
  activity: Activity;
  radius: number;
  year: number;
  onPreviewChange: (edge: 'start' | 'end', dayDelta: number | null) => void;
}) {
  const updateActivity = useWheelStore((s) => s.updateActivity);
  const anchorDate = edge === 'start' ? new Date(activity.startDate) : new Date(activity.endDate!);
  const anchorAngle = dateToAngle(anchorDate, year) - Math.PI / 2;

  const bind = useDrag(({ first, last, xy: [x, y], event, memo }) => {
    // Stop this pointer event from bubbling to the canvas's own pan/zoom gesture (WheelCanvas),
    // which would otherwise also fire on every tick of this drag. Must be called unconditionally
    // (not just on `first`) since the underlying native listener needs to see it stopped each tick.
    event.stopPropagation();
    const { x: localX, y: localY } = screenToLocalPoint(event.target as SVGGraphicsElement, x, y);
    const currentAngle = pointerAngle(localX, localY);

    const startAngle = first ? currentAngle : memo;
    const dayDelta = Math.round(angleDeltaToDayDelta(currentAngle - startAngle, year));

    if (last) {
      onPreviewChange(edge, null);
      const currentStart = new Date(activity.startDate);
      const currentEnd = new Date(activity.endDate!);
      const candidate = addDays(anchorDate, dayDelta);
      const clamped = clampEdgeDate(edge, candidate, currentStart, currentEnd);
      const iso = clamped.toISOString().slice(0, 10);
      updateActivity(activity.id, edge === 'start' ? { startDate: iso } : { endDate: iso });
    } else {
      onPreviewChange(edge, dayDelta);
    }

    return startAngle;
  });

  return (
    <circle
      {...(bind() as any)}
      cx={radius * Math.cos(anchorAngle)}
      cy={radius * Math.sin(anchorAngle)}
      r={5}
      fill="white"
      stroke="#374151"
      strokeWidth={1.5}
      style={{ touchAction: 'none', cursor: 'ew-resize' }}
    />
  );
}
