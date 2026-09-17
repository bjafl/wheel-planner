import { create } from 'zustand';
import type { Activity, Ring, Wheel } from '../types';
import { api } from '../api/client';

interface WheelStore {
  wheel: Wheel | null;
  loadWheel: (id: string) => Promise<void>;
  addRing: (input: Omit<Ring, 'id' | 'wheelId'>) => Promise<void>;
  updateRing: (ringId: string, patch: Partial<Ring>) => Promise<void>;
  removeRing: (ringId: string) => Promise<void>;
  addActivity: (input: Omit<Activity, 'id'>) => Promise<void>;
  updateActivity: (activityId: string, patch: Partial<Activity>) => Promise<void>;
  removeActivity: (activityId: string) => Promise<void>;
}

export const useWheelStore = create<WheelStore>((set, get) => ({
  wheel: null,

  loadWheel: async (id) => {
    const wheel = await api.getWheel(id);
    set({ wheel });
  },

  addRing: async (input) => {
    const wheel = get().wheel;
    if (!wheel) return;
    const ring = await api.createRing(wheel.id, input);
    set({ wheel: { ...wheel, rings: [...wheel.rings, ring] } });
  },

  updateRing: async (ringId, patch) => {
    const wheel = get().wheel;
    if (!wheel) return;
    const updated = await api.updateRing(wheel.id, ringId, patch);
    // Apply via the functional set() form and re-read state at commit time
    // (not the `wheel` captured above) so concurrent calls — e.g. RingManager's
    // drag-to-reorder, which fires one updateRing per affected ring via
    // Promise.all — don't race and clobber each other's already-applied
    // changes with a stale base array.
    set((state) => {
      if (!state.wheel) return state;
      const rings = state.wheel.rings
        .map((r) => (r.id === ringId ? updated : r))
        .sort((a, b) => a.orderIndex - b.orderIndex);
      return { wheel: { ...state.wheel, rings } };
    });
  },

  removeRing: async (ringId) => {
    const wheel = get().wheel;
    if (!wheel) return;
    await api.deleteRing(wheel.id, ringId);
    // The DB cascade-deletes activities belonging to the ring; mirror that
    // client-side so orphaned activities don't linger in e.g. ActivityList.
    set({
      wheel: {
        ...wheel,
        rings: wheel.rings.filter((r) => r.id !== ringId),
        activities: wheel.activities.filter((a) => a.ringId !== ringId),
      },
    });
  },

  addActivity: async (input) => {
    const wheel = get().wheel;
    if (!wheel) return;
    const activity = await api.createActivity(wheel.id, input);
    set({ wheel: { ...wheel, activities: [...wheel.activities, activity] } });
  },

  updateActivity: async (activityId, patch) => {
    const wheel = get().wheel;
    if (!wheel) return;
    const updated = await api.updateActivity(activityId, patch);
    set({ wheel: { ...wheel, activities: wheel.activities.map((a) => (a.id === activityId ? updated : a)) } });
  },

  removeActivity: async (activityId) => {
    const wheel = get().wheel;
    if (!wheel) return;
    await api.deleteActivity(activityId);
    set({ wheel: { ...wheel, activities: wheel.activities.filter((a) => a.id !== activityId) } });
  },
}));
