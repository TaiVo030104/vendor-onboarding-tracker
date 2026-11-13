import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { STAGES } from './stages.js';
import { USERS } from './users.js';
import { now, daysAgo } from './clock.js';

const SEED_VENDORS = [
  { name: 'Company A', region: 'HCMC', owner: 'u-linh', enteredDaysAgo: [60, 52, 45, 40, 38] },
  {
    name: 'Company B',
    region: 'Can Tho',
    owner: 'u-huy',
    enteredDaysAgo: [40, 33, 18],
    notes: [{ daysAgo: 10, by: 'u-huy', type: 'KYC_REJECTED', text: 'Business license expired. Asked vendor to re-upload.' }],
  },
  { name: 'Company C', region: 'Hanoi', owner: 'u-linh', enteredDaysAgo: [20, 9] },
  { name: 'Company D', region: 'HCMC', owner: 'u-mai', enteredDaysAgo: [25, 18, 10, 3] },
  { name: 'Company E', region: 'Da Nang', owner: 'u-huy', enteredDaysAgo: [35, 28, 21] },
  { name: 'Company F', region: 'HCMC', owner: 'u-mai', enteredDaysAgo: [2] },
  { name: 'Company G', region: 'Hanoi', owner: 'u-mai', enteredDaysAgo: [11] },
  { name: 'Company H', region: 'Da Nang', owner: 'u-linh', enteredDaysAgo: [14, 6, 1] },
];

const SALES_PIC = { id: 'sales', name: 'Sales PIC' };

export function buildSeed(at = now()) {
  const userById = Object.fromEntries(USERS.map((u) => [u.id, u]));
  const vendors = [];
  const events = [];

  SEED_VENDORS.forEach((seed, i) => {
    const id = `v-${String(i + 1).padStart(3, '0')}`;
    const owner = userById[seed.owner];

    seed.enteredDaysAgo.forEach((d, stageIdx) => {
      const actor = stageIdx === 0 ? SALES_PIC : owner;
      events.push({
        id: crypto.randomUUID(),
        vendorId: id,
        type: 'STAGE_CHANGE',
        fromStage: stageIdx === 0 ? null : STAGES[stageIdx - 1],
        toStage: STAGES[stageIdx],
        note: '',
        actorId: actor.id,
        actorName: actor.name,
        at: daysAgo(d, at),
      });
    });

    for (const n of seed.notes ?? []) {
      events.push({
        id: crypto.randomUUID(),
        vendorId: id,
        type: n.type ?? 'NOTE',
        fromStage: null,
        toStage: null,
        note: n.text,
        actorId: n.by,
        actorName: userById[n.by].name,
        at: daysAgo(n.daysAgo, at),
      });
    }

    const stageIdx = seed.enteredDaysAgo.length - 1;
    vendors.push({
      id,
      name: seed.name,
      region: seed.region,
      ownerId: owner.id,
      ownerName: owner.name,
      stage: STAGES[stageIdx],
      stageEnteredAt: daysAgo(seed.enteredDaysAgo[stageIdx], at),
      version: 1,
    });
  });

  events.sort((a, b) => a.at.localeCompare(b.at));
  return { vendors, events };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/db.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(buildSeed(), null, 2));
  console.log(`Seeded ${file}`);
}
