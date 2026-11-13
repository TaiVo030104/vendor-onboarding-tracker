import { formatDateTime } from '../format.js';

export function describeEvent(e, labelOf) {
  if (e.type === 'NOTE') return <>added a note</>;
  if (e.type === 'KYC_REJECTED') return <>recorded a <b className="stuck-text">KYC rejection</b> (vendor asked to resend)</>;
  if (!e.fromStage) return <>created at <b>{labelOf(e.toStage)}</b></>;
  return (
    <>
      moved <b>{labelOf(e.fromStage)}</b> → <b>{labelOf(e.toStage)}</b>
    </>
  );
}

export default function ActivityFeed({ events, stages, onSelectVendor }) {
  const labelOf = (id) => stages.find((s) => s.id === id)?.label ?? id;

  return (
    <div className="panel">
      <h2>Recent activity</h2>
      <ul className="feed">
        {events.map((e) => (
          <li key={e.id}>
            <div>
              <b>{e.actorName}</b> {describeEvent(e, labelOf)} for{' '}
              <button className="link" onClick={() => onSelectVendor(e.vendorId)}>
                {e.vendorName}
              </button>
            </div>
            {e.note && <div className="feed-note">“{e.note}”</div>}
            <div className="muted small">{formatDateTime(e.at)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
