# Vendor Onboarding Tracker - Write-up

## Problems with the current process

**1. "Last Updated" is filled in by hand.**
It's the only way to tell how long a vendor has been waiting, and it depends on someone
remembering to change it. People forget, or they update it when they add a note even though
nothing actually moved. In the example sheet, Company E has been at KYC Docs Received since
15 July and nothing flags it. You'd only notice by reading every row and working out the
dates yourself.

**2. There's no history.**
The sheet only shows where a vendor is now. If something looks off, like a vendor marked
Active that never seems to have passed KYC, there's no way to find out who changed it, when,
or what it was before. Failed KYC reviews are a good example. Company B was rejected in Slack
and went back to waiting on documents, and the only record is a note that someone will
probably overwrite later.

**3. Three people editing the same sheet with no rules.**
Two coordinators can edit the same row and the last save wins without either of them
knowing. Nothing stops someone from moving a vendor from Contract Sent straight to Active
and skipping KYC, which is a compliance problem. Stages are free text too, so typos make
filtering and counting unreliable.

## Approach

I treated this as a workflow with a history, not a table you edit. Each vendor has a
current stage, and every change to it is stored as an entry in a history log. The current
stage is what the list shows; the history is what you look at when something seems wrong.

The backend is Node with Express. The frontend is a single-page React app built with Vite.
I picked these because I can move quickly with them, and the problem doesn't need anything
heavier.

## How the app addresses the problems

**Problem 1:** The app records the time whenever a vendor's stage changes and works out days
in stage from that, so nobody types a date. Adding a note doesn't reset the counter; only an
actual stage change does. Any vendor that has been in the same stage (other than Active) for
more than 7 days is marked as stuck. Stuck vendors are sorted to the top, and the dashboard
has a count and a filter for them.

**Problem 2:** Every stage change is saved as a separate history entry with who made it,
when, the previous stage and the new stage. Notes are saved the same way. Each vendor has its
own timeline, and there's a recent activity feed across all vendors. For failed KYC reviews I
added a "Record KYC rejection" action. It keeps the vendor at KYC Docs Received but logs the
reason, so it's clear why the vendor hasn't moved.

**Problem 3:** Coordinators log in, so every change is tied to a person. Stages come from a
fixed list. Vendors can only move forward one stage at a time, so KYC can't be skipped.
Moving back is allowed (to fix a mistake, for example) but needs a reason, which goes into
the history. To avoid silent overwrites, each vendor has a version number. If someone else
updated the vendor after you opened it, your change is rejected and you see the latest state
instead.

## Assumptions

- A vendor counts as stuck after more than 7 full days in the same stage. Active is the last
  stage, so it's never stuck. The 7 days is a constant in the code.
- A failed KYC review isn't a stage change. The brief says the vendor stays at KYC Docs
  Received, so I log it as a rejection with a reason and leave the stage (and the stuck
  timer) as it is.
- The days-in-stage counter restarts on any stage change, including moving back.
- Any coordinator can update any vendor. Each vendor has an owner, but that's only used for
  the "My vendors" filter, not for permissions.
- Sales adds vendors outside this app, since creating vendors is out of scope. Seeded vendors
  start at Contract Sent with "Sales PIC" recorded as the person who added them.
- Compliance review and activation happen in other systems. The app only records the
  outcome, and the coordinator moves the stage once it's done.
- Login uses three hardcoded accounts (linh, huy, mai, password `password`). Sessions are
  kept in memory, so restarting the server logs everyone out.
- Seed dates are relative to today, so the demo always shows a mix of stuck and on-track
  vendors whenever it's run.

## Technical decisions

- **Days in stage is calculated, not stored.** The vendor only stores when it entered its
  current stage. Days in stage and the stuck flag are worked out on the server each time
  the list is loaded, so they can't get out of date.
- **History is append-only.** Stage changes, notes and KYC rejections are all entries in
  one log, and nothing in it is edited or deleted. A vendor's current stage could be
  rebuilt from its history if needed.
- **Stage rules live in one place.** The list of stages, the 7-day threshold and the
  rules for moving between stages are all in `backend/src/stages.js`, and the server
  checks them. The UI only offers moves that are allowed, but it doesn't enforce them.
- **Version numbers to catch conflicting edits.** When a coordinator changes a stage, the
  app sends the version of the vendor they were looking at. If it doesn't match, the
  server refuses the change and the UI reloads the vendor. I chose this over locking rows
  because conflicts should be rare with three people.
- **One place for "now".** All date logic reads the current time from
  `backend/src/clock.js`. Tests set it to a fixed date, and for a demo you can set it
  with the `NOW` environment variable.

## Tests

The tests are in `backend/test/api.test.js`. They call the real API with an in-memory store
and a fixed date. I focused on the business rules, because those are where a mistake
would actually hurt:

- you can't use the API without logging in;
- days in stage and the stuck flag come out right for the seed data, and Active vendors
  are never stuck;
- a stage change records who, when, the previous stage and the new stage, and resets the
  days-in-stage counter;
- you can't skip stages, and moving back requires a reason;
- a second coordinator working from an old view gets a conflict instead of overwriting
  the first one's change;
- notes and KYC rejections show up in the history but don't reset the counter, and a KYC
  rejection leaves the vendor at KYC Docs Received.

I didn't write frontend tests. The UI is mostly displaying what the API returns, so I
checked it by hand in the browser instead.

## Shortcuts and trade-offs

- Data is kept in memory and saved to a JSON file after every change. That's fine for one
  server process and a few vendors, but it won't hold up with several processes or a lot
  of data.
- Login is mock-only: hardcoded users, plain-text passwords, and sessions that disappear
  when the server restarts.
- The vendor list doesn't update on its own. If someone else changes a vendor, you see it
  after a refresh, or when your own change is rejected because of the version check.
- There's one stuck threshold for every stage.
- There are no frontend tests.

## What I'd improve with more time

- Move to a real database (Postgres, for example). The history log would map directly to
  an events table.
- Set a stuck threshold per stage, since a KYC review can reasonably take longer than
  getting a contract signed.
- Add a "waiting on" field (vendor, compliance or us) so a stuck vendor can be chased by
  the right person.
- Add a few frontend tests for the stage-change form and the conflict message.
- Replace the mock login with the company's SSO.
