export const STAGES = [
  'CONTRACT_SENT',
  'CONTRACT_SIGNED',
  'KYC_DOCS_RECEIVED',
  'KYC_VERIFIED',
  'ACTIVE',
];

export const STAGE_LABELS = {
  CONTRACT_SENT: 'Contract Sent',
  CONTRACT_SIGNED: 'Contract Signed',
  KYC_DOCS_RECEIVED: 'KYC Docs Received',
  KYC_VERIFIED: 'KYC Verified',
  ACTIVE: 'Active',
};

export const STUCK_AFTER_DAYS = 7;

export function isValidStage(stage) {
  return STAGES.includes(stage);
}

export function validateTransition(from, to, note) {
  if (!isValidStage(to)) return `Unknown stage "${to}".`;
  if (from === to) return `Vendor is already in ${STAGE_LABELS[to]}.`;

  const fromIdx = STAGES.indexOf(from);
  const toIdx = STAGES.indexOf(to);

  if (toIdx > fromIdx + 1) {
    return `Cannot skip stages: next stage after ${STAGE_LABELS[from]} is ${STAGE_LABELS[STAGES[fromIdx + 1]]}.`;
  }
  if (toIdx < fromIdx && !note?.trim()) {
    return 'Moving a vendor back to an earlier stage requires a reason.';
  }
  return null;
}
