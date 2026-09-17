import { describe, it, expect } from 'vitest';
import { clampEdgeDate } from './ResizeHandle';

describe('clampEdgeDate', () => {
  it('does not let the start date pass the end date', () => {
    const clamped = clampEdgeDate('start', new Date('2026-05-10'), new Date('2026-05-01'), new Date('2026-05-05'));
    expect(clamped.getTime()).toBeLessThanOrEqual(new Date('2026-05-05').getTime());
  });

  it('does not let the end date precede the start date', () => {
    const clamped = clampEdgeDate('end', new Date('2026-04-01'), new Date('2026-05-01'), new Date('2026-05-05'));
    expect(clamped.getTime()).toBeGreaterThanOrEqual(new Date('2026-05-01').getTime());
  });

  it('passes through valid dates unchanged', () => {
    const clamped = clampEdgeDate('start', new Date('2026-04-20'), new Date('2026-05-01'), new Date('2026-05-05'));
    expect(clamped).toEqual(new Date('2026-04-20'));
  });
});
