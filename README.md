# Vendor Onboarding Tracker

Replaces the shared onboarding spreadsheet with a small web app. Vendors move through
**Contract Sent → Contract Signed → KYC Docs Received → KYC Verified → Active**. Every change
is logged (who, when, from, to), and vendors stuck in a stage for more than 7 days are
highlighted.

The problem analysis, design decisions and assumptions are in **[write-up.md](write-up.md)**.

## Run

Requires Node 18+.

```bash
# terminal 1 — API on http://localhost:4000
cd backend && npm install && npm start

# terminal 2 — UI on http://localhost:5173
cd frontend && npm install && npm run dev
```

Log in as **linh**, **huy** or **mai** (password `password`).

Optional:

```bash
npm run seed                          # reset data/db.json to the seed data
npm test                              # API tests (in backend/)

# freeze "today" for a demo: re-seed with the same NOW so seed dates line up
export NOW=2026-08-10T09:00:00Z
npm run seed && npm start
```

Seed dates are relative to "now" at seed time, and `data/db.json` is reused on later
starts. If you change `NOW`, run `npm run seed` again with the same value; otherwise the
existing data may be dated after "today".

## Layout

```
backend/   Express API, JSON-file store, append-only event log
  src/stages.js   stage list, stuck threshold, transition rules
  src/store.js    vendors + events, derived days-in-stage / isStuck, optimistic locking
  src/clock.js    single source of "now" (overridable via NOW)
frontend/  React + Vite single-page app
  src/components/ Login, Dashboard, StageSummary, VendorTable, VendorDrawer, ActivityFeed
```

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/login` | `{username, password}` → `{token, user}` |
| GET | `/api/vendors` | list with `daysInStage`, `isStuck`, `latestNote` |
| GET | `/api/vendors/:id` | vendor + full history |
| POST | `/api/vendors/:id/stage` | `{toStage, note?, expectedVersion}`: one step forward, or back with a reason; `409` if stale |
| POST | `/api/vendors/:id/kyc-rejection` | `{reason}`: log a rejection, vendor stays at KYC Docs Received |
| POST | `/api/vendors/:id/notes` | `{note}`: free-text note (doesn't reset the stuck timer) |
| GET | `/api/activity` | recent events across all vendors |
