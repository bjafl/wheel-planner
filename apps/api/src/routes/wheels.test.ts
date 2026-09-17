import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import request from 'supertest';
import { buildApp } from '../app';

const TEST_DB = './test-wheels.sqlite';
let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  app = buildApp(TEST_DB);
});

afterEach(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('wheel/ring/activity API', () => {
  it('creates a wheel, adds a ring and an activity, then reads them back', async () => {
    const createWheel = await request(app).post('/wheels').send({ title: 'Marketing 2026', year: 2026 });
    expect(createWheel.status).toBe(201);
    const wheelId = createWheel.body.id;

    const createRing = await request(app)
      .post(`/wheels/${wheelId}/rings`)
      .send({ name: 'Kampanjer', color: '#ff0000', orderIndex: 0 });
    expect(createRing.status).toBe(201);
    const ringId = createRing.body.id;

    const createActivity = await request(app)
      .post(`/wheels/${wheelId}/activities`)
      .send({
        ringId,
        title: 'Vårkampanje',
        notes: null,
        kind: 'range',
        startDate: '2026-03-01',
        endDate: '2026-05-01',
        recurrenceRule: null,
        lane: 0,
        color: null,
      });
    expect(createActivity.status).toBe(201);

    const getWheel = await request(app).get(`/wheels/${wheelId}`);
    expect(getWheel.status).toBe(200);
    expect(getWheel.body.rings).toHaveLength(1);
    expect(getWheel.body.activities).toHaveLength(1);
    expect(getWheel.body.activities[0].title).toBe('Vårkampanje');
  });

  it('updates and deletes an activity', async () => {
    const { body: wheel } = await request(app).post('/wheels').send({ title: 'W', year: 2026 });
    const { body: ring } = await request(app)
      .post(`/wheels/${wheel.id}/rings`)
      .send({ name: 'R', color: '#000', orderIndex: 0 });
    const { body: activity } = await request(app)
      .post(`/wheels/${wheel.id}/activities`)
      .send({ ringId: ring.id, title: 'A', notes: null, kind: 'milestone', startDate: '2026-06-01', endDate: null, recurrenceRule: null, lane: 0, color: null });

    const update = await request(app).put(`/activities/${activity.id}`).send({ title: 'A2' });
    expect(update.status).toBe(200);
    expect(update.body.title).toBe('A2');

    const del = await request(app).delete(`/activities/${activity.id}`);
    expect(del.status).toBe(204);

    const getWheel = await request(app).get(`/wheels/${wheel.id}`);
    expect(getWheel.body.activities).toHaveLength(0);
  });

  it('moves an activity to a different ring via PUT', async () => {
    const { body: wheel } = await request(app).post('/wheels').send({ title: 'W', year: 2026 });
    const { body: ringA } = await request(app)
      .post(`/wheels/${wheel.id}/rings`)
      .send({ name: 'A', color: '#000', orderIndex: 0 });
    const { body: ringB } = await request(app)
      .post(`/wheels/${wheel.id}/rings`)
      .send({ name: 'B', color: '#fff', orderIndex: 1 });
    const { body: activity } = await request(app)
      .post(`/wheels/${wheel.id}/activities`)
      .send({ ringId: ringA.id, title: 'A', notes: null, kind: 'milestone', startDate: '2026-06-01', endDate: null, recurrenceRule: null, lane: 0, color: null });

    const update = await request(app).put(`/activities/${activity.id}`).send({ ringId: ringB.id });
    expect(update.status).toBe(200);
    expect(update.body.ringId).toBe(ringB.id);

    const getWheel = await request(app).get(`/wheels/${wheel.id}`);
    expect(getWheel.body.activities[0].ringId).toBe(ringB.id);
  });
});
