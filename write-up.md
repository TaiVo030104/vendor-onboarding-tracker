# Vendor Onboarding Tracker — Write-up

## 1. Problems with the current spreadsheet process

### Problem 1: "Last Updated" is typed by hand, so nobody can trust it
The only signal for "how long has this vendor been waiting" is a date a coordinator
must remember to change. It goes wrong in both directions:

- **Forgotten:** the stage is changed but the date isn't, so the vendor looks newer or older than it is.
- **Touched for the wrong reason:** a coordinator edits the Notes column (e.g. "chased by
  phone") and bumps the date, so a vendor that has made no progress looks recently active.

As a result, stuck vendors aren't noticed. In the example sheet, Company E has sat at
*KYC Docs Received* since 15 July and nothing on the sheet calls that out. Someone has
to scan every row and calculate dates in their head.

### Problem 2: There is no history, so you can't explain bad data
A spreadsheet row only holds the *current* state. When a value looks wrong (a vendor
shown as *Active* that never passed KYC, a stage that went backwards) there's no way
to answer *who changed it, when, and what it was before*. KYC failures are the clearest
case: Company B goes *KYC Docs Received → (rejected in Slack) → KYC Docs Received*, and
the only trace is a free-text note that will be overwritten next time.

### Problem 3: Three people editing one sheet, with no rules
- **Silent overwrites:** two coordinators update the same row from slightly different
  views of the sheet, and the last save wins without either of them noticing.
- **No workflow rules:** anyone can type any stage, so a vendor can jump from
  *Contract Sent* straight to *Active*, skipping KYC. That is a compliance risk, not
  just a data-quality problem.
- **Free-text stages:** "KYC Docs Recieved", "kyc received" and so on make filtering
  and counting unreliable.

## 2. How the solution addresses them

| Problem | What the app does |
|---|---|
| Manual "Last Updated" | Every stage change writes `stageEnteredAt` automatically. **Days in stage** is calculated when it is read (`now − stageEnteredAt`) and never stored or typed, so it can't drift. Adding a note does **not** reset this timer: only real progress does. |
| Stuck vendors go unnoticed | Vendors that have been in a non-final stage for **more than 7 days** are flagged *Stuck*. The dashboard shows a stuck count, lets you filter to stuck vendors only, and sorts them to the top by default. |
| No history | Every stage change and note is an append-only **event** (`who`, `when`, `from`, `to`, `note`). Each vendor has a timeline, and there's a global "Recent activity" feed. The current vendor row is just the latest state; the events are the record of what happened. |
| KYC failures leave no trace | A **"Record KYC rejection"** action (only at *KYC Docs Received*) logs a `KYC_REJECTED` event with a required reason. Per the process, the vendor **stays** at *KYC Docs Received*, but the history now shows *why* it hasn't moved, and the reason appears in the vendor list's "Latest note" column. |
| Silent overwrites | **Optimistic locking**: each vendor has a `version`. The client sends the version it last saw. If someone else changed the vendor in the meantime, the server returns `409`, and the UI shows the latest state instead of overwriting it. |
| No workflow rules | Stages are a fixed list (no free text). **Forward moves may only go one stage at a time**, so KYC can't be skipped. **Backward moves are allowed but need a reason** (e.g. a KYC rejection or fixing a mistake), and the reason is saved in the history. |
| Who is doing what | Coordinators log in (mock accounts), so every change is attributed to a real person. Each vendor shows its owning coordinator, and there's a "My vendors" filter. |

### Architecture (kept deliberately small)
- **Backend:** Node + Express. Data is kept in memory and written to `data/db.json`
  after each change (atomic write via temp file + rename). The store has a small
  interface, so it could be replaced by Postgres without touching the routes.
- **Frontend:** React (Vite) single-page app. It calls the API via a dev proxy.
- **Clock:** all "now" logic goes through `clock.js`. Setting `NOW=2026-08-10T09:00:00Z`
  fixes the date for demos and tests.
- **Tests:** `node --test` API tests cover auth, stuck calculation, history recording,
  skip prevention, required reason for backward moves, KYC rejection, and the 409 conflict.
  I also ran the UI end to end in headless Chrome: login, filters, KYC rejection, forward
  and backward moves, the two-coordinator conflict, logout, and phone width.

## 3. Assumptions

1. **Stuck = more than 7 full days in the same non-*Active* stage.** *Active* is the
   final stage and is never stuck. The threshold is a single constant (`STUCK_AFTER_DAYS`).
2. **A failed KYC review is recorded as a KYC rejection event, not a stage change.** The
   process says the vendor "remains at KYC Docs Received", so the stage doesn't move, but
   the rejection and its reason go into the history. It does **not** reset the stuck
   timer, because the vendor still hasn't progressed. If a vendor was marked *KYC Verified*
   by mistake, the coordinator uses "Move back" (reason required) instead.
3. **"Time in stage" restarts whenever the stage changes**, including backward moves:
   the vendor is now waiting on something new.
4. **Any coordinator can update any vendor.** The *owner* coordinator is for visibility
   ("My vendors") and doesn't limit permissions. With three coordinators, sharing work
   matters more than access control.
5. **Sales creates vendors outside this app.** Vendor creation is out of scope, so seeded
   vendors start at *Contract Sent* with an event attributed to "Sales PIC".
6. **Compliance review and activation happen in other systems.** The app only records
   the result; the coordinator is trusted to move the stage once it's done.
7. **Mock auth:** three seeded coordinators (`linh`, `huy`, `mai`, password `password`)
   with in-memory session tokens. Restarting the server logs everyone out.
8. **Seed dates are relative to "now"**, so the demo always shows a mix of stuck and
   healthy vendors whatever day it is run.

## 4. What I'd do next (not built)
- A per-stage stuck threshold (e.g. KYC review might reasonably take longer than contract signing).
- A "waiting on" field (*vendor* / *compliance* / *us*) so stuck vendors can be routed to the right person.
- Real auth (SSO) and a real database. The event log maps directly onto an `events` table.
- A daily digest of stuck vendors (notifications were out of scope).

## 5. Running it
```bash
cd backend && npm install && npm start            # API on :4000
cd frontend && npm install && npm run dev         # UI on :5173
# optional: freeze the clock for a demo
NOW=2026-08-10T09:00:00Z npm start
```
Log in as `linh` / `huy` / `mai`, password `password`.
