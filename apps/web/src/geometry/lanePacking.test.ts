import { describe, it, expect } from 'vitest';
import { assignLanes, type Laneable } from './lanePacking';

function item(id: string, start: string, end: string): Laneable {
  return { id, startDate: new Date(start), endDate: new Date(end) };
}

describe('assignLanes', () => {
  it('puts non-overlapping items in lane 0', () => {
    const result = assignLanes([
      item('a', '2026-01-01', '2026-01-10'),
      item('b', '2026-01-11', '2026-01-20'),
    ]);
    expect(result.find((r) => r.id === 'a')?.lane).toBe(0);
    expect(result.find((r) => r.id === 'b')?.lane).toBe(0);
  });

  it('pushes an overlapping item to the next lane', () => {
    const result = assignLanes([
      item('a', '2026-01-01', '2026-01-20'),
      item('b', '2026-01-10', '2026-01-15'),
    ]);
    expect(result.find((r) => r.id === 'a')?.lane).toBe(0);
    expect(result.find((r) => r.id === 'b')?.lane).toBe(1);
  });

  it('reuses a freed lane once its occupant has ended', () => {
    const result = assignLanes([
      item('a', '2026-01-01', '2026-01-05'),
      item('b', '2026-01-01', '2026-01-31'),
      item('c', '2026-01-06', '2026-01-10'),
    ]);
    // b overlaps both a and c, so it must occupy its own lane throughout;
    // c starts after a ends, so c reuses a's lane (0).
    expect(result.find((r) => r.id === 'a')?.lane).toBe(0);
    expect(result.find((r) => r.id === 'b')?.lane).toBe(1);
    expect(result.find((r) => r.id === 'c')?.lane).toBe(0);
  });

  it('treats a milestone (startDate === endDate) as a zero-length interval', () => {
    const result = assignLanes([
      item('a', '2026-03-01', '2026-03-01'),
      item('b', '2026-03-01', '2026-03-01'),
    ]);
    expect(result.find((r) => r.id === 'a')?.lane).toBe(0);
    expect(result.find((r) => r.id === 'b')?.lane).toBe(1);
  });
});
