import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWheelStore } from './wheelStore';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    getWheel: vi.fn(),
    createRing: vi.fn(),
    updateRing: vi.fn(),
    deleteRing: vi.fn(),
    createActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
  },
}));

beforeEach(() => {
  useWheelStore.setState({ wheel: null });
  vi.clearAllMocks();
});

describe('wheelStore', () => {
  it('loadWheel populates state from the API', async () => {
    const wheel = { id: 'w1', title: 'T', year: 2026, rings: [], activities: [] };
    (api.getWheel as any).mockResolvedValue(wheel);

    await useWheelStore.getState().loadWheel('w1');

    expect(useWheelStore.getState().wheel).toEqual(wheel);
  });

  it('addActivity appends the created activity to state', async () => {
    useWheelStore.setState({ wheel: { id: 'w1', title: 'T', year: 2026, rings: [], activities: [] } });
    const created = { id: 'a1', ringId: 'r1', title: 'New', notes: null, kind: 'milestone', startDate: '2026-01-01', endDate: null, recurrenceRule: null, lane: 0, color: null };
    (api.createActivity as any).mockResolvedValue(created);

    await useWheelStore.getState().addActivity({
      ringId: 'r1', title: 'New', notes: null, kind: 'milestone', startDate: '2026-01-01', endDate: null, recurrenceRule: null, lane: 0, color: null,
    });

    expect(useWheelStore.getState().wheel?.activities).toEqual([created]);
  });

  it('removeActivity removes it from state', async () => {
    const activity = { id: 'a1', ringId: 'r1', title: 'New', notes: null, kind: 'milestone' as const, startDate: '2026-01-01', endDate: null, recurrenceRule: null, lane: 0, color: null };
    useWheelStore.setState({ wheel: { id: 'w1', title: 'T', year: 2026, rings: [], activities: [activity] } });

    await useWheelStore.getState().removeActivity('a1');

    expect(useWheelStore.getState().wheel?.activities).toEqual([]);
  });
});
