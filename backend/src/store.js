import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildSeed } from './seed.js';
import { STAGE_LABELS, STUCK_AFTER_DAYS, validateTransition } from './stages.js';
import { now, daysBetween } from './clock.js';

export class StoreError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function createStore({ file = null, data = null } = {}) {
  let db = data ?? load(file);

  function persist() {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, file);
  }

  function findVendor(id) {
    const vendor = db.vendors.find((v) => v.id === id);
    if (!vendor) throw new StoreError(404, 'Vendor not found.');
    return vendor;
  }

  function eventsFor(vendorId) {
    return db.events
      .filter((e) => e.vendorId === vendorId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  function present(vendor) {
    const daysInStage = daysBetween(vendor.stageEnteredAt);
    const latestNote = eventsFor(vendor.id).find((e) => e.note);
    return {
      ...vendor,
      stageLabel: STAGE_LABELS[vendor.stage],
      daysInStage,
      isStuck: vendor.stage !== 'ACTIVE' && daysInStage > STUCK_AFTER_DAYS,
      latestNote: latestNote ? { text: latestNote.note, by: latestNote.actorName, at: latestNote.at } : null,
    };
  }

  function addEvent(event) {
    const full = { id: crypto.randomUUID(), at: now().toISOString(), note: '', ...event };
    db.events.push(full);
    return full;
  }

  return {
    listVendors() {
      return db.vendors.map(present);
    },

    getVendor(id) {
      return { ...present(findVendor(id)), history: eventsFor(id) };
    },

    changeStage(id, { toStage, note = '', expectedVersion, actor }) {
      const vendor = findVendor(id);

      if (expectedVersion !== undefined && expectedVersion !== vendor.version) {
        throw new StoreError(409, 'This vendor was updated by someone else. Please review the latest state.', {
          vendor: this.getVendor(id),
        });
      }

      const error = validateTransition(vendor.stage, toStage, note);
      if (error) throw new StoreError(400, error);

      const event = addEvent({
        vendorId: id,
        type: 'STAGE_CHANGE',
        fromStage: vendor.stage,
        toStage,
        note: note.trim(),
        actorId: actor.id,
        actorName: actor.name,
      });

      vendor.stage = toStage;
      vendor.stageEnteredAt = event.at;
      vendor.version += 1;
      persist();
      return this.getVendor(id);
    },

    addNote(id, { note, actor }) {
      const vendor = findVendor(id);
      if (!note?.trim()) throw new StoreError(400, 'Note cannot be empty.');
      addEvent({
        vendorId: id,
        type: 'NOTE',
        fromStage: null,
        toStage: null,
        note: note.trim(),
        actorId: actor.id,
        actorName: actor.name,
      });
      persist();
      return this.getVendor(id);
    },

    recordKycRejection(id, { reason, actor }) {
      const vendor = findVendor(id);
      if (vendor.stage !== 'KYC_DOCS_RECEIVED') {
        throw new StoreError(400, 'KYC can only be rejected while the vendor is at KYC Docs Received.');
      }
      if (!reason?.trim()) throw new StoreError(400, 'Please say why the KYC documents were rejected.');
      addEvent({
        vendorId: id,
        type: 'KYC_REJECTED',
        fromStage: null,
        toStage: null,
        note: reason.trim(),
        actorId: actor.id,
        actorName: actor.name,
      });
      persist();
      return this.getVendor(id);
    },

    recentActivity(limit = 20) {
      const names = Object.fromEntries(db.vendors.map((v) => [v.id, v.name]));
      return [...db.events]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, limit)
        .map((e) => ({ ...e, vendorName: names[e.vendorId] }));
    },
  };

  function load(filePath) {
    if (filePath && fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    const seeded = buildSeed();
    if (filePath) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(seeded, null, 2));
    }
    return seeded;
  }
}
