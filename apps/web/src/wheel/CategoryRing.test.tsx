import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CategoryRing } from './CategoryRing';
import type { Activity, Ring } from '../types';

const ring: Ring = { id: 'r1', wheelId: 'w1', name: 'Kampanjer', orderIndex: 0, color: '#3b82f6' };
const activities: Activity[] = [
  { id: 'a1', ringId: 'r1', title: 'Vår', notes: null, kind: 'range', startDate: '2026-03-01', endDate: '2026-05-01', recurrenceRule: null, lane: 0, color: null },
  { id: 'a2', ringId: 'r1', title: 'Lansering', notes: null, kind: 'milestone', startDate: '2026-06-15', endDate: null, recurrenceRule: null, lane: 0, color: null },
];

describe('CategoryRing', () => {
  it('renders one arc per range activity and one marker per milestone', () => {
    const { container } = render(
      <svg>
        <CategoryRing ring={ring} ringIndex={0} activities={activities} year={2026} />
      </svg>
    );
    expect(container.querySelectorAll('path[data-activity-id="a1"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-milestone-id="a2"]')).toHaveLength(1);
  });
});
