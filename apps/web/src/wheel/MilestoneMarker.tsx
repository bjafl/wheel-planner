import { useEffect, useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { addDays, format } from 'date-fns';
import { dateToAngle } from '../geometry/dateAngle';
import { angleDeltaToDayDelta } from './useSegmentDrag';
import { useWheelStore } from '../store/wheelStore';
import { screenToLocalPoint } from './pointerMath';
import type { Activity } from '../types';

type SetTooltip = (tooltip: { el: Element; label: string } | null) => void;

function pointerAngle(x: number, y: number): number {
  return Math.atan2(x, -y);
}

export function MilestoneMarker({
  activity,
  radius,
  year,
  color,
  setTooltip,
}: {
  activity: Activity;
  radius: number;
  year: number;
  color: string;
  setTooltip: SetTooltip;
}) {
  const updateActivity = useWheelStore((s) => s.updateActivity);
  const circleRef = useRef<SVGCircleElement>(null);
  const [hovered, setHovered] = useState(false);
  const [previewDayDelta, setPreviewDayDelta] = useState<number | null>(null);

  const bind = useDrag(({ first, last, xy: [x, y], event, memo }) => {
    const { x: localX, y: localY } = screenToLocalPoint(event.target as SVGGraphicsElement, x, y);
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

  const isActive = hovered || previewDayDelta !== null;
  const label = format(effectiveDate, 'd. MMM');

  useEffect(() => {
    if (isActive && circleRef.current) {
      setTooltip({ el: circleRef.current, label });
    } else {
      setTooltip(null);
    }
  }, [isActive, label, setTooltip]);

  useEffect(() => {
    // Clear the shared tooltip if this marker unmounts (e.g. activity deleted) while active.
    return () => setTooltip(null);
  }, [setTooltip]);

  return (
    <circle
      ref={circleRef}
      {...(bind() as any)}
      data-milestone-id={activity.id}
      cx={x}
      cy={y}
      r={6}
      fill={activity.color ?? color}
      opacity={previewDayDelta !== null ? 0.6 : 1}
      style={{ touchAction: 'none', cursor: 'grab' }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    />
  );
}
