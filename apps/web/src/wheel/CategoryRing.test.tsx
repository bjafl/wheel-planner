import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CategoryRing } from './CategoryRing';
import { CATEGORY_RING_START_RADIUS } from './constants';
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
        <CategoryRing ring={ring} innerRadius={CATEGORY_RING_START_RADIUS} activities={activities} year={2026} setTooltip={() => {}} />
      </svg>
    );
    expect(container.querySelectorAll('path[data-activity-id="a1"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-milestone-id="a2"]')).toHaveLength(1);
  });

  it('renders one marker per occurrence for a recurring milestone', () => {
    const recurringActivity: Activity = {
      id: 'a3', ringId: 'r1', title: 'Månedsmøte', notes: null, kind: 'milestone',
      startDate: '2026-01-15', endDate: null,
      recurrenceRule: { type: 'monthly', interval: 1, until: null },
      lane: 1, color: null,
    };
    const { container } = render(
      <svg>
        <CategoryRing ring={ring} innerRadius={CATEGORY_RING_START_RADIUS} activities={[recurringActivity]} year={2026} setTooltip={() => {}} />
      </svg>
    );
    expect(container.querySelectorAll('[data-milestone-id="a3"]')).toHaveLength(12);
  });

  it('renders a text label with the ring name', () => {
    const { container } = render(
      <svg>
        <CategoryRing ring={ring} innerRadius={CATEGORY_RING_START_RADIUS} activities={activities} year={2026} setTooltip={() => {}} />
      </svg>
    );
    const label = container.querySelector('[data-ring-label="r1"]');
    expect(label?.textContent).toBe('Kampanjer');
  });
});
