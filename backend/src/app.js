import express from 'express';
import { login, logout, requireAuth } from './users.js';
import { StoreError } from './store.js';
import { STAGES, STAGE_LABELS, STUCK_AFTER_DAYS } from './stages.js';
import { now } from './clock.js';

export function createApp(store) {
  const app = express();
  app.use(express.json());

  app.post('/api/login', (req, res) => {
    const result = login(req.body?.username, req.body?.password);
    if (!result) return res.status(401).json({ error: 'Invalid username or password.' });
    res.json(result);
  });

  app.post('/api/logout', requireAuth, (req, res) => {
    logout(req.token);
    res.status(204).end();
  });

  app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

  app.use('/api', requireAuth);

  app.get('/api/config', (_req, res) => {
    res.json({
      stages: STAGES.map((id) => ({ id, label: STAGE_LABELS[id] })),
      stuckAfterDays: STUCK_AFTER_DAYS,
      now: now().toISOString(),
    });
  });

  app.get('/api/vendors', (_req, res) => res.json({ vendors: store.listVendors() }));

  app.get('/api/vendors/:id', (req, res) => res.json({ vendor: store.getVendor(req.params.id) }));

  app.post('/api/vendors/:id/stage', (req, res) => {
    const { toStage, note, expectedVersion } = req.body ?? {};
    const vendor = store.changeStage(req.params.id, {
      toStage,
      note: typeof note === 'string' ? note : '',
      expectedVersion: Number.isInteger(expectedVersion) ? expectedVersion : undefined,
      actor: req.user,
    });
    res.json({ vendor });
  });

  app.post('/api/vendors/:id/notes', (req, res) => {
    const vendor = store.addNote(req.params.id, { note: req.body?.note, actor: req.user });
    res.status(201).json({ vendor });
  });

  app.post('/api/vendors/:id/kyc-rejection', (req, res) => {
    const vendor = store.recordKycRejection(req.params.id, { reason: req.body?.reason, actor: req.user });
    res.status(201).json({ vendor });
  });

  app.get('/api/activity', (_req, res) => res.json({ events: store.recentActivity(30) }));

  app.use((err, _req, res, _next) => {
    if (err instanceof StoreError) {
      return res.status(err.status).json({ error: err.message, ...err.extra });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}
