import { create } from 'zustand';
import { toast } from 'sonner';
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
    try {
      const wheel = await api.getWheel(id);
      set({ wheel });
    } catch (err) {
      toast.error('Kunne ikke laste årshjulet');
      throw err;
    }
  },

  addRing: async (input) => {
    const wheel = get().wheel;
    if (!wheel) return;
    try {
      const ring = await api.createRing(wheel.id, input);
      set({ wheel: { ...wheel, rings: [...wheel.rings, ring] } });
    } catch (err) {
      toast.error('Kunne ikke opprette ringen');
      throw err;
    }
  },

  updateRing: async (ringId, patch) => {
    const wheel = get().wheel;
    if (!wheel) return;
    try {
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
    } catch (err) {
      toast.error('Kunne ikke oppdatere ringen');
      throw err;
    }
  },

  removeRing: async (ringId) => {
    const wheel = get().wheel;
    if (!wheel) return;
    try {
      await api.deleteRing(wheel.id, ringId);
      // The DB cascade-deletes activities belonging to the ring; mirror that
      // client-side so orphaned activities don't linger in e.g. ActivityList.
      // Use the functional set() form to read state at commit time (not the
      // pre-await `wheel` capture) so concurrent removeRing or updateRing calls
      // don't race and clobber each other's already-applied changes with a
      // stale base array.
      set((state) => {
        if (!state.wheel) return state;
        return {
          wheel: {
            ...state.wheel,
            rings: state.wheel.rings.filter((r) => r.id !== ringId),
            activities: state.wheel.activities.filter((a) => a.ringId !== ringId),
          },
        };
      });
    } catch (err) {
      toast.error('Kunne ikke slette ringen');
      throw err;
    }
  },

  addActivity: async (input) => {
    const wheel = get().wheel;
    if (!wheel) return;
    try {
      const activity = await api.createActivity(wheel.id, input);
      set({ wheel: { ...wheel, activities: [...wheel.activities, activity] } });
    } catch (err) {
      toast.error('Kunne ikke lagre aktiviteten');
      throw err;
    }
  },

  updateActivity: async (activityId, patch) => {
    const wheel = get().wheel;
    if (!wheel) return;
    try {
      const updated = await api.updateActivity(activityId, patch);
      set({ wheel: { ...wheel, activities: wheel.activities.map((a) => (a.id === activityId ? updated : a)) } });
    } catch (err) {
      toast.error('Kunne ikke oppdatere aktiviteten');
      throw err;
    }
  },

  removeActivity: async (activityId) => {
    const wheel = get().wheel;
    if (!wheel) return;
    try {
      await api.deleteActivity(activityId);
      set({ wheel: { ...wheel, activities: wheel.activities.filter((a) => a.id !== activityId) } });
    } catch (err) {
      toast.error('Kunne ikke slette aktiviteten');
      throw err;
    }
  },
}));
