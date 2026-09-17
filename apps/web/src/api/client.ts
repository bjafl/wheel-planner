import type { Activity, Ring, Wheel } from '../types';

const BASE_URL = 'http://localhost:3001';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getWheel: (id: string) => fetch(`${BASE_URL}/wheels/${id}`).then((r) => json<Wheel>(r)),
  createWheel: (input: { title: string; year: number }) =>
    fetch(`${BASE_URL}/wheels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }).then((r) => json<Wheel>(r)),
  createRing: (wheelId: string, input: Omit<Ring, 'id' | 'wheelId'>) =>
    fetch(`${BASE_URL}/wheels/${wheelId}/rings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }).then((r) => json<Ring>(r)),
  updateRing: (wheelId: string, ringId: string, patch: Partial<Ring>) =>
    fetch(`${BASE_URL}/wheels/${wheelId}/rings/${ringId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).then((r) => json<Ring>(r)),
  deleteRing: (wheelId: string, ringId: string) =>
    fetch(`${BASE_URL}/wheels/${wheelId}/rings/${ringId}`, { method: 'DELETE' }).then((r) => json<void>(r)),
  createActivity: (wheelId: string, input: Omit<Activity, 'id'>) =>
    fetch(`${BASE_URL}/wheels/${wheelId}/activities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }).then((r) => json<Activity>(r)),
  updateActivity: (activityId: string, patch: Partial<Activity>) =>
    fetch(`${BASE_URL}/activities/${activityId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).then((r) => json<Activity>(r)),
  deleteActivity: (activityId: string) =>
    fetch(`${BASE_URL}/activities/${activityId}`, { method: 'DELETE' }).then((r) => json<void>(r)),
};
