import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store.js';
import { setNow } from '../src/clock.js';

const NOW = new Date('2026-08-10T09:00:00Z');
let server;
let baseUrl;

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function loginAs(username) {
  const { body } = await api('/api/login', { method: 'POST', body: { username, password: 'password' } });
  return body.token;
}

function start() {
  return new Promise((resolve) => {
    server = createApp(createStore({ file: null })).listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
}

before(() => setNow(NOW));
beforeEach(async () => {
  server?.close();
  await start();
});
after(() => {
  server?.close();
  setNow(null);
});

test('rejects unauthenticated requests and bad credentials', async () => {
  assert.equal((await api('/api/vendors')).status, 401);
  const bad = await api('/api/login', { method: 'POST', body: { username: 'linh', password: 'nope' } });
  assert.equal(bad.status, 401);
});

test('lists vendors with computed days-in-stage and stuck flag', async () => {
  const token = await loginAs('linh');
  const { body } = await api('/api/vendors', { token });
  const byName = Object.fromEntries(body.vendors.map((v) => [v.name, v]));

  assert.equal(byName['Company E'].daysInStage, 21);
  assert.equal(byName['Company E'].isStuck, true);
  assert.equal(byName['Company F'].isStuck, false);
  assert.equal(byName['Company A'].isStuck, false);
});

test('stage change records who, when, from and to — and resets the stuck timer', async () => {
  const token = await loginAs('huy');
  const res = await api('/api/vendors/v-005/stage', {
    token,
    method: 'POST',
    body: { toStage: 'KYC_VERIFIED', expectedVersion: 1 },
  });

  assert.equal(res.status, 200);
  const v = res.body.vendor;
  assert.equal(v.stage, 'KYC_VERIFIED');
  assert.equal(v.daysInStage, 0);
  assert.equal(v.isStuck, false);
  assert.equal(v.version, 2);

  const [latest] = v.history;
  assert.equal(latest.actorName, 'Huy');
  assert.equal(latest.fromStage, 'KYC_DOCS_RECEIVED');
  assert.equal(latest.toStage, 'KYC_VERIFIED');
  assert.equal(latest.at, NOW.toISOString());
});

test('cannot skip stages', async () => {
  const token = await loginAs('mai');
  const res = await api('/api/vendors/v-006/stage', { token, method: 'POST', body: { toStage: 'ACTIVE' } });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /skip/);
});

test('moving backwards requires a reason', async () => {
  const token = await loginAs('mai');
  const path = '/api/vendors/v-004/stage';
  const noReason = await api(path, { token, method: 'POST', body: { toStage: 'KYC_DOCS_RECEIVED' } });
  assert.equal(noReason.status, 400);

  const withReason = await api(path, {
    token,
    method: 'POST',
    body: { toStage: 'KYC_DOCS_RECEIVED', note: 'Marked verified by mistake' },
  });
  assert.equal(withReason.status, 200);
  assert.equal(withReason.body.vendor.history[0].note, 'Marked verified by mistake');
});

test('stale update from a second coordinator is rejected with 409', async () => {
  const linh = await loginAs('linh');
  const huy = await loginAs('huy');
  const path = '/api/vendors/v-003/stage';

  const first = await api(path, { token: linh, method: 'POST', body: { toStage: 'KYC_DOCS_RECEIVED', expectedVersion: 1 } });
  assert.equal(first.status, 200);

  const second = await api(path, { token: huy, method: 'POST', body: { toStage: 'KYC_DOCS_RECEIVED', expectedVersion: 1 } });
  assert.equal(second.status, 409);
  assert.equal(second.body.vendor.stage, 'KYC_DOCS_RECEIVED');
});

test('notes are recorded in history without resetting time in stage', async () => {
  const token = await loginAs('huy');
  const res = await api('/api/vendors/v-005/notes', { token, method: 'POST', body: { note: 'Chased by phone' } });
  assert.equal(res.status, 201);
  assert.equal(res.body.vendor.history[0].type, 'NOTE');
  assert.equal(res.body.vendor.daysInStage, 21);
  assert.equal(res.body.vendor.latestNote.text, 'Chased by phone');
});

test('KYC rejection keeps the vendor at KYC Docs Received and is logged with a reason', async () => {
  const token = await loginAs('huy');
  const path = '/api/vendors/v-005/kyc-rejection';

  assert.equal((await api(path, { token, method: 'POST', body: { reason: ' ' } })).status, 400);

  const res = await api(path, { token, method: 'POST', body: { reason: 'ID copy unreadable' } });
  assert.equal(res.status, 201);
  const v = res.body.vendor;
  assert.equal(v.stage, 'KYC_DOCS_RECEIVED');
  assert.equal(v.daysInStage, 21);
  assert.equal(v.history[0].type, 'KYC_REJECTED');
  assert.equal(v.history[0].actorName, 'Huy');
  assert.equal(v.history[0].note, 'ID copy unreadable');

  const wrongStage = await api('/api/vendors/v-006/kyc-rejection', { token, method: 'POST', body: { reason: 'x' } });
  assert.equal(wrongStage.status, 400);
});
