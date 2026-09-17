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

const activity1 = { id: 'a1', ringId: 'r1', title: 'Vår', notes: null, kind: 'milestone' as const, startDate: '2026-03-01', endDate: null, recurrenceRule: null, lane: 0, color: null };
const activity2 = { id: 'a2', ringId: 'r1', title: 'Høst', notes: null, kind: 'milestone' as const, startDate: '2026-09-01', endDate: null, recurrenceRule: null, lane: 0, color: null };

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

  it('removeRing removes the ring and cascade-removes its activities from state', async () => {
    const ring = { id: 'r1', wheelId: 'w1', name: 'Kampanjer', orderIndex: 0, color: '#3b82f6' };
    const otherRing = { id: 'r2', wheelId: 'w1', name: 'Ferier', orderIndex: 1, color: '#22c55e' };
    const activityOnRemovedRing = { id: 'a1', ringId: 'r1', title: 'Orphaned', notes: null, kind: 'milestone' as const, startDate: '2026-01-01', endDate: null, recurrenceRule: null, lane: 0, color: null };
    const activityOnOtherRing = { id: 'a2', ringId: 'r2', title: 'Kept', notes: null, kind: 'milestone' as const, startDate: '2026-02-01', endDate: null, recurrenceRule: null, lane: 0, color: null };
    useWheelStore.setState({
      wheel: { id: 'w1', title: 'T', year: 2026, rings: [ring, otherRing], activities: [activityOnRemovedRing, activityOnOtherRing] },
    });

    await useWheelStore.getState().removeRing('r1');

    const state = useWheelStore.getState().wheel;
    expect(state?.rings).toEqual([otherRing]);
    expect(state?.activities).toEqual([activityOnOtherRing]);
  });

  it('updateRing applies concurrent reorder updates without losing sibling changes', async () => {
    // Mirrors RingManager's drag-to-reorder flow, which fires one updateRing
    // call per affected ring via Promise.all. If updateRing's `set()` closes
    // over a `wheel` reference captured before either call's API request
    // resolves, whichever call resolves last will overwrite the other's
    // already-applied change (both compute their patched array from the
    // same stale base state).
    const ring1 = { id: 'r1', wheelId: 'w1', name: 'A', orderIndex: 0, color: '#111111' };
    const ring2 = { id: 'r2', wheelId: 'w1', name: 'B', orderIndex: 1, color: '#222222' };
    useWheelStore.setState({ wheel: { id: 'w1', title: 'T', year: 2026, rings: [ring1, ring2], activities: [] } });

    (api.updateRing as any).mockImplementation((_wheelId: string, ringId: string, patch: Partial<typeof ring1>) => {
      const base = ringId === 'r1' ? ring1 : ring2;
      const updated = { ...base, ...patch };
      // r2's request resolves first, r1's resolves later — the order a real
      // drag would not guarantee, which is exactly what makes this a race.
      const delay = ringId === 'r1' ? 10 : 0;
      return new Promise((resolve) => setTimeout(() => resolve(updated), delay));
    });

    await Promise.all([
      useWheelStore.getState().updateRing('r1', { orderIndex: 1 }),
      useWheelStore.getState().updateRing('r2', { orderIndex: 0 }),
    ]);

    const rings = useWheelStore.getState().wheel?.rings;
    expect(rings?.find((r) => r.id === 'r1')?.orderIndex).toBe(1);
    expect(rings?.find((r) => r.id === 'r2')?.orderIndex).toBe(0);
    expect(rings?.map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('removeRing applies concurrent deletions without losing sibling removals', async () => {
    // Tests the same stale-closure race as updateRing: if removeRing captures
    // a `wheel` reference before its API call resolves, concurrent removeRing
    // calls will both compute their filtered arrays from the same stale base
    // state, and whichever resolves last will clobber the other's removal.
    const ring1 = { id: 'r1', wheelId: 'w1', name: 'A', orderIndex: 0, color: '#111111' };
    const ring2 = { id: 'r2', wheelId: 'w1', name: 'B', orderIndex: 1, color: '#222222' };
    const ring3 = { id: 'r3', wheelId: 'w1', name: 'C', orderIndex: 2, color: '#333333' };
    const activityOnRing1 = { id: 'a1', ringId: 'r1', title: 'Act1', notes: null, kind: 'milestone' as const, startDate: '2026-01-01', endDate: null, recurrenceRule: null, lane: 0, color: null };
    const activityOnRing2 = { id: 'a2', ringId: 'r2', title: 'Act2', notes: null, kind: 'milestone' as const, startDate: '2026-02-01', endDate: null, recurrenceRule: null, lane: 0, color: null };
    const activityOnRing3 = { id: 'a3', ringId: 'r3', title: 'Act3', notes: null, kind: 'milestone' as const, startDate: '2026-03-01', endDate: null, recurrenceRule: null, lane: 0, color: null };
    useWheelStore.setState({
      wheel: {
        id: 'w1',
        title: 'T',
        year: 2026,
        rings: [ring1, ring2, ring3],
        activities: [activityOnRing1, activityOnRing2, activityOnRing3],
      },
    });

    (api.deleteRing as any).mockImplementation((_wheelId: string, ringId: string) => {
      // r2's request resolves first (delay 0), r1's resolves later (delay 10)
      // — the order concurrent calls don't guarantee, which is exactly what
      // exposes the stale-closure bug if present.
      const delay = ringId === 'r1' ? 10 : 0;
      return new Promise((resolve) => setTimeout(() => resolve(undefined), delay));
    });

    await Promise.all([
      useWheelStore.getState().removeRing('r1'),
      useWheelStore.getState().removeRing('r2'),
    ]);

    const wheel = useWheelStore.getState().wheel;
    // Both r1 and r2 should be gone; only r3 remains.
    expect(wheel?.rings.map((r) => r.id)).toEqual(['r3']);
    // Activities on r1 and r2 should be removed; only a3 remains.
    expect(wheel?.activities.map((a) => a.id)).toEqual(['a3']);
  });

  it('updateActivity applies concurrent drag-commit updates without losing sibling changes', async () => {
    // Mirrors the updateRing race test above: all three drag interactions
    // (segment move, resize, milestone move) commit through updateActivity,
    // so dragging two different activities before the first one's PUT
    // resolves must not silently drop one of the two updates.
    useWheelStore.setState({
      wheel: { id: 'w1', title: 'T', year: 2026, rings: [], activities: [activity1, activity2] },
    });

    (api.updateActivity as any).mockImplementation((activityId: string, patch: Partial<typeof activity1>) => {
      const base = activityId === 'a1' ? activity1 : activity2;
      const updated = { ...base, ...patch };
      // a2's request resolves first, a1's resolves later — the order a real
      // pair of concurrent drags would not guarantee.
      const delay = activityId === 'a1' ? 10 : 0;
      return new Promise((resolve) => setTimeout(() => resolve(updated), delay));
    });

    await Promise.all([
      useWheelStore.getState().updateActivity('a1', { startDate: '2026-04-01' }),
      useWheelStore.getState().updateActivity('a2', { startDate: '2026-10-01' }),
    ]);

    const activities = useWheelStore.getState().wheel?.activities;
    expect(activities?.find((a) => a.id === 'a1')?.startDate).toBe('2026-04-01');
    expect(activities?.find((a) => a.id === 'a2')?.startDate).toBe('2026-10-01');
  });

  it('addActivity applies concurrent creations without losing sibling additions', async () => {
    useWheelStore.setState({
      wheel: { id: 'w1', title: 'T', year: 2026, rings: [], activities: [] },
    });

    (api.createActivity as any).mockImplementation((_wheelId: string, input: Partial<typeof activity1>) => {
      const created = input.title === activity1.title ? activity1 : activity2;
      const delay = created.id === 'a1' ? 10 : 0;
      return new Promise((resolve) => setTimeout(() => resolve(created), delay));
    });

    await Promise.all([
      useWheelStore.getState().addActivity(activity1),
      useWheelStore.getState().addActivity(activity2),
    ]);

    const ids = useWheelStore.getState().wheel?.activities.map((a) => a.id).sort();
    expect(ids).toEqual(['a1', 'a2']);
  });

  it('removeActivity applies concurrent deletions without losing sibling removals', async () => {
    const activity3 = { ...activity1, id: 'a3' };
    useWheelStore.setState({
      wheel: { id: 'w1', title: 'T', year: 2026, rings: [], activities: [activity1, activity2, activity3] },
    });

    (api.deleteActivity as any).mockImplementation((activityId: string) => {
      const delay = activityId === 'a1' ? 10 : 0;
      return new Promise((resolve) => setTimeout(() => resolve(undefined), delay));
    });

    await Promise.all([
      useWheelStore.getState().removeActivity('a1'),
      useWheelStore.getState().removeActivity('a2'),
    ]);

    expect(useWheelStore.getState().wheel?.activities.map((a) => a.id)).toEqual(['a3']);
  });

  it('addActivity repacks overlapping lanes in the same ring after creating a new activity', async () => {
    const existing = {
      id: 'a1', ringId: 'r1', title: 'Eksisterende', notes: null, kind: 'range' as const,
      startDate: '2026-01-01', endDate: '2026-01-31', recurrenceRule: null, lane: 0, color: null,
    };
    useWheelStore.setState({ wheel: { id: 'w1', title: 'T', year: 2026, rings: [], activities: [existing] } });

    const newInput = {
      ringId: 'r1', title: 'Ny', notes: null, kind: 'range' as const,
      startDate: '2026-01-15', endDate: '2026-02-15', recurrenceRule: null, lane: 0, color: null,
    };
    // The form always submits new activities with lane: 0 (see ActivityForm) —
    // the backend persists whatever lane it's sent, without repacking itself.
    const created = { ...newInput, id: 'a2' };
    (api.createActivity as any).mockResolvedValue(created);
    (api.updateActivity as any).mockImplementation((id: string, patch: Partial<typeof created>) => {
      const base = id === 'a2' ? created : existing;
      return Promise.resolve({ ...base, ...patch });
    });

    await useWheelStore.getState().addActivity(newInput);

    // a1 (Jan1–31) and a2 (Jan15–Feb15) overlap, so the newly created a2 must
    // be repacked into a free lane rather than silently overlapping a1.
    expect(api.updateActivity).toHaveBeenCalledWith('a2', { lane: 1 });
    const activities = useWheelStore.getState().wheel?.activities;
    expect(activities?.find((a) => a.id === 'a2')?.lane).toBe(1);
    expect(activities?.find((a) => a.id === 'a1')?.lane).toBe(0);
  });

  it('addActivity does not trigger a repack when the new activity does not overlap any sibling', async () => {
    const existing = {
      id: 'a1', ringId: 'r1', title: 'Eksisterende', notes: null, kind: 'range' as const,
      startDate: '2026-01-01', endDate: '2026-01-10', recurrenceRule: null, lane: 0, color: null,
    };
    useWheelStore.setState({ wheel: { id: 'w1', title: 'T', year: 2026, rings: [], activities: [existing] } });

    const newInput = {
      ringId: 'r1', title: 'Ny', notes: null, kind: 'range' as const,
      startDate: '2026-02-01', endDate: '2026-02-10', recurrenceRule: null, lane: 0, color: null,
    };
    (api.createActivity as any).mockResolvedValue({ ...newInput, id: 'a2' });

    await useWheelStore.getState().addActivity(newInput);

    expect(api.updateActivity).not.toHaveBeenCalled();
  });

  it('addRing applies concurrent creations without losing sibling additions', async () => {
    const ring1 = { id: 'r1', wheelId: 'w1', name: 'A', orderIndex: 0, color: '#111111' };
    const ring2 = { id: 'r2', wheelId: 'w1', name: 'B', orderIndex: 1, color: '#222222' };
    useWheelStore.setState({ wheel: { id: 'w1', title: 'T', year: 2026, rings: [], activities: [] } });

    (api.createRing as any).mockImplementation((_wheelId: string, input: Partial<typeof ring1>) => {
      const created = input.name === ring1.name ? ring1 : ring2;
      const delay = created.id === 'r1' ? 10 : 0;
      return new Promise((resolve) => setTimeout(() => resolve(created), delay));
    });

    await Promise.all([
      useWheelStore.getState().addRing(ring1),
      useWheelStore.getState().addRing(ring2),
    ]);

    const ids = useWheelStore.getState().wheel?.rings.map((r) => r.id).sort();
    expect(ids).toEqual(['r1', 'r2']);
  });
});
