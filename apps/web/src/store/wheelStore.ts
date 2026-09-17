import { create } from 'zustand';
import { toast } from 'sonner';
import type { Activity, Ring, Wheel } from '../types';
import { api } from '../api/client';
import { assignLanes } from '../geometry/lanePacking';

function computeLaneChanges(activities: Activity[], ringId: string): Array<{ id: string; lane: number }> {
  const ringActivities = activities.filter((a) => a.ringId === ringId);
  const laneable = ringActivities.map((a) => ({
    id: a.id,
    startDate: new Date(a.startDate),
    endDate: new Date(a.endDate ?? a.startDate),
  }));
  return assignLanes(laneable)
    .filter((packed) => ringActivities.find((a) => a.id === packed.id)?.lane !== packed.lane)
    .map((packed) => ({ id: packed.id, lane: packed.lane }));
}

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

export const useWheelStore = create<WheelStore>((set, get) => {
  // Recomputes lane assignments for every activity in a ring (via
  // geometry/lanePacking's assignLanes) and persists any that changed.
  // Runs after addActivity/updateActivity so a newly added or edited
  // activity — which the form always submits with lane: 0 — doesn't
  // silently overlap an existing sibling on the wheel. Best-effort: a
  // failed lane update just leaves that activity visually overlapping
  // until the next add/edit in the same ring triggers another attempt.
  async function repackRing(ringId: string) {
    const wheel = get().wheel;
    if (!wheel) return;
    const changes = computeLaneChanges(wheel.activities, ringId);
    for (const change of changes) {
      try {
        const updated = await api.updateActivity(change.id, { lane: change.lane });
        set((state) => {
          if (!state.wheel) return state;
          return {
            wheel: {
              ...state.wheel,
              activities: state.wheel.activities.map((a) => (a.id === change.id ? updated : a)),
            },
          };
        });
      } catch {
        // Background consistency pass — not worth a toast.
      }
    }
  }

  return {
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
        // Functional set() form: read state at commit time (not the pre-await
        // `wheel` capture) so a concurrent add/update/remove doesn't race and
        // clobber this ring with a stale base array. See updateRing/removeRing.
        set((state) => {
          if (!state.wheel) return state;
          return { wheel: { ...state.wheel, rings: [...state.wheel.rings, ring] } };
        });
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
        // Functional set() form: read state at commit time (not the pre-await
        // `wheel` capture) so concurrent activity mutations — e.g. two drags
        // committing before either PUT resolves — don't race and clobber each
        // other's already-applied changes with a stale base array.
        set((state) => {
          if (!state.wheel) return state;
          return { wheel: { ...state.wheel, activities: [...state.wheel.activities, activity] } };
        });
        await repackRing(activity.ringId);
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
        // Functional set() form — see addActivity above. This matters
        // especially here: all three drag interactions (segment move, resize,
        // milestone move) commit through updateActivity, so dragging two
        // different activities before the first one's PUT resolves must not
        // silently drop one of the two updates.
        set((state) => {
          if (!state.wheel) return state;
          return {
            wheel: {
              ...state.wheel,
              activities: state.wheel.activities.map((a) => (a.id === activityId ? updated : a)),
            },
          };
        });
        await repackRing(updated.ringId);
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
        // Functional set() form — see addActivity above.
        set((state) => {
          if (!state.wheel) return state;
          return { wheel: { ...state.wheel, activities: state.wheel.activities.filter((a) => a.id !== activityId) } };
        });
      } catch (err) {
        toast.error('Kunne ikke slette aktiviteten');
        throw err;
      }
    },
  };
});
