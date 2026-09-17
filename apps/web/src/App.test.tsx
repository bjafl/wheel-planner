import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

const WHEEL_ID = 'ca0ac0db-f374-45bf-87da-f745aa04fc84';
const RING_ID = 'd433e8bd-4337-416b-ac5d-aaa18b3a4606';
const ACTIVITY_ID = '2efbc258-e677-4cb8-bbcf-e2295679f977';

// Exact payload captured via curl against the real running apps/api server
// (POST /wheels, POST /wheels/:id/rings, POST /wheels/:id/activities, GET /wheels/:id).
const WHEEL_PAYLOAD = {
  id: WHEEL_ID,
  title: 'Verifikasjonshjul',
  year: 2026,
  rings: [{ id: RING_ID, wheelId: WHEEL_ID, name: 'Kampanjer', orderIndex: 0, color: '#3b82f6' }],
  activities: [
    {
      id: ACTIVITY_ID,
      ringId: RING_ID,
      title: 'Sommerkampanje',
      notes: null,
      kind: 'range',
      startDate: '2026-06-01',
      endDate: '2026-08-01',
      recurrenceRule: null,
      lane: 0,
      color: null,
    },
  ],
};

beforeEach(() => {
  localStorage.setItem('wheel-planner:devWheelId', WHEEL_ID);
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === `http://localhost:3001/wheels/${WHEEL_ID}`) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(WHEEL_PAYLOAD) } as Response);
      }
      throw new Error(`unexpected fetch: ${url}`);
    })
  );
});

describe('App end-to-end wiring (smoke)', () => {
  it('loads the dev wheel via the real store/api client and renders its ring + activity', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Sommerkampanje').length).toBeGreaterThan(0);
    });

    // Rendered by CategoryRing/ActivitySegment from the real wheel loaded through the store.
    expect(document.querySelector(`path[data-activity-id="${ACTIVITY_ID}"]`)).not.toBeNull();

    // ActivityList shows it with the resolved ring name.
    expect(screen.getAllByText('Kampanjer').length).toBeGreaterThan(0);

    // The Sheet trigger for creating a new activity is present and enabled (a ring exists).
    const newActivityButton = screen.getByRole('button', { name: /ny aktivitet/i });
    expect(newActivityButton.hasAttribute('disabled')).toBe(false);
  });
});
