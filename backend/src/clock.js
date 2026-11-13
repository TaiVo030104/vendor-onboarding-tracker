let fixedNow = process.env.NOW ? new Date(process.env.NOW) : null;

export function now() {
  return fixedNow ? new Date(fixedNow) : new Date();
}

export function setNow(date) {
  fixedNow = date ? new Date(date) : null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(fromIso, to = now()) {
  return Math.floor((to.getTime() - new Date(fromIso).getTime()) / DAY_MS);
}

export function daysAgo(days, from = now()) {
  return new Date(from.getTime() - days * DAY_MS).toISOString();
}
