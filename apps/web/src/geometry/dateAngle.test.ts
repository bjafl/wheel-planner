import { describe, it, expect } from 'vitest';
import { dateToAngle, angleToDate } from './dateAngle';

describe('dateToAngle', () => {
  it('maps Jan 1 to angle 0', () => {
    expect(dateToAngle(new Date(2026, 0, 1), 2026)).toBeCloseTo(0, 10);
  });

  it('maps July 2 (day 182, non-leap year) to half the circle', () => {
    // 2026 is not a leap year (365 days); day index 182 of 365
    const angle = dateToAngle(new Date(2026, 6, 2), 2026);
    expect(angle).toBeCloseTo((182 / 365) * 2 * Math.PI, 10);
  });

  it('accounts for leap years', () => {
    // 2028 is a leap year (366 days); Dec 31 is day index 365
    const angle = dateToAngle(new Date(2028, 11, 31), 2028);
    expect(angle).toBeCloseTo((365 / 366) * 2 * Math.PI, 10);
  });
});

describe('angleToDate', () => {
  it('is the inverse of dateToAngle for day-aligned dates', () => {
    const original = new Date(2026, 4, 17);
    const angle = dateToAngle(original, 2026);
    const roundTripped = angleToDate(angle, 2026);
    expect(roundTripped.getFullYear()).toBe(2026);
    expect(roundTripped.getMonth()).toBe(4);
    expect(roundTripped.getDate()).toBe(17);
  });

  it('normalizes angles outside [0, 2π)', () => {
    const angle = dateToAngle(new Date(2026, 0, 10), 2026);
    const roundTripped = angleToDate(angle + 2 * Math.PI, 2026);
    expect(roundTripped.getDate()).toBe(10);
  });

  it('rounds to the nearest day when snapToDay is true (default)', () => {
    const halfDayAngle = ((0.5) / 365) * 2 * Math.PI;
    const result = angleToDate(halfDayAngle, 2026, true);
    expect(result.getDate()).toBe(1); // rounds down to Jan 1
  });
});
