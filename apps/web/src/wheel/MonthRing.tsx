import { arc } from 'd3-shape';
import { dateToAngle } from '../geometry/dateAngle';
import { MONTH_RING_INNER_RADIUS, MONTH_RING_OUTER_RADIUS } from './constants';

const arcGenerator = arc();

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const LABEL_RADIUS = (MONTH_RING_INNER_RADIUS + MONTH_RING_OUTER_RADIUS) / 2;

export function MonthRing({ year }: { year: number }) {
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <g>
      {months.map((month) => {
        const start = dateToAngle(new Date(year, month, 1), year);
        const end = dateToAngle(new Date(year, month + 1, 1), year);
        const endAngle = month === 11 ? 2 * Math.PI : end;
        const path = arcGenerator({
          innerRadius: MONTH_RING_INNER_RADIUS,
          outerRadius: MONTH_RING_OUTER_RADIUS,
          startAngle: start,
          endAngle,
        } as any);
        const midAngle = (start + endAngle) / 2 - Math.PI / 2;
        const labelX = LABEL_RADIUS * Math.cos(midAngle);
        const labelY = LABEL_RADIUS * Math.sin(midAngle);
        return (
          <g key={month}>
            <path
              data-month={month}
              d={path ?? undefined}
              fill={month % 2 === 0 ? '#e5e7eb' : '#f3f4f6'}
              stroke="#9ca3af"
            />
            <text
              data-month-label={month}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fill="#374151"
            >
              {MONTH_NAMES[month]}
            </text>
          </g>
        );
      })}
    </g>
  );
}
