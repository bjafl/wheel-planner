import { describe, it, expect } from 'vitest';
import { expandRecurrence } from './recurrence';

describe('expandRecurrence', () => {
  it('expands a monthly rule anchored in the target year', () => {
    const dates = expandRecurrence(
      new Date(2026, 0, 15),
      { type: 'monthly', interval: 1, until: null },
      2026
    );
    expect(dates).toHaveLength(12);
    expect(dates[0]).toEqual(new Date(2026, 0, 15));
    expect(dates[1]).toEqual(new Date(2026, 1, 15));
    expect(dates[11]).toEqual(new Date(2026, 11, 15));
  });

  it('expands a weekly rule with interval 2, anchored before the target year', () => {
    const dates = expandRecurrence(
      new Date(2025, 11, 25), // Dec 25, 2025, a Thursday
      { type: 'weekly', interval: 2, until: null },
      2026
    );
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) {
      expect(d.getFullYear()).toBe(2026);
    }
  });

  it('stops at the until date even mid-year', () => {
    const dates = expandRecurrence(
      new Date(2026, 0, 1),
      { type: 'monthly', interval: 1, until: new Date(2026, 2, 1) },
      2026
    );
    expect(dates).toEqual([new Date(2026, 0, 1), new Date(2026, 1, 1), new Date(2026, 2, 1)]);
  });

  it('returns an empty array when the rule never reaches the target year', () => {
    const dates = expandRecurrence(
      new Date(2020, 0, 1),
      { type: 'yearly', interval: 1, until: new Date(2021, 0, 1) },
      2026
    );
    expect(dates).toEqual([]);
  });
});
