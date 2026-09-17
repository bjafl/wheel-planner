import { dateToAngle } from '../geometry/dateAngle';
import { MONTH_RING_OUTER_RADIUS, CATEGORY_RING_START_RADIUS } from './constants';

export function TodayMarker({ year }: { year: number }) {
  const today = new Date();
  if (today.getFullYear() !== year) return null;

  const angle = dateToAngle(today, year) - Math.PI / 2; // shift so 0 rad = 12 o'clock in x/y math
  const x1 = CATEGORY_RING_START_RADIUS * Math.cos(angle);
  const y1 = CATEGORY_RING_START_RADIUS * Math.sin(angle);
  const x2 = MONTH_RING_OUTER_RADIUS * Math.cos(angle);
  const y2 = MONTH_RING_OUTER_RADIUS * Math.sin(angle);

  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ef4444" strokeWidth={2} />;
}
