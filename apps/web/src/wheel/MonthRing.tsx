import { arc } from 'd3-shape';
import { dateToAngle } from '../geometry/dateAngle';
import { MONTH_RING_INNER_RADIUS, MONTH_RING_OUTER_RADIUS } from './constants';

const arcGenerator = arc();

export function MonthRing({ year }: { year: number }) {
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <g>
      {months.map((month) => {
        const start = dateToAngle(new Date(year, month, 1), year);
        const end = dateToAngle(new Date(year, month + 1, 1), year);
        const path = arcGenerator({
          innerRadius: MONTH_RING_INNER_RADIUS,
          outerRadius: MONTH_RING_OUTER_RADIUS,
          startAngle: start,
          endAngle: month === 11 ? 2 * Math.PI : end,
        } as any);
        return (
          <path
            key={month}
            data-month={month}
            d={path ?? undefined}
            fill={month % 2 === 0 ? '#e5e7eb' : '#f3f4f6'}
            stroke="#9ca3af"
          />
        );
      })}
    </g>
  );
}
