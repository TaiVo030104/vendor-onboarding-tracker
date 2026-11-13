import StageBadge, { StageProgress } from './StageBadge.jsx';
import { formatDate, plural } from '../format.js';

export default function VendorTable({ vendors, stages, stuckAfterDays, selectedId, onSelect }) {
  if (vendors.length === 0) {
    return <div className="empty">No vendors match these filters.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="vendors">
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Stage</th>
            <th>Time in stage</th>
            <th>Coordinator</th>
            <th>Latest note</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => (
            <tr
              key={v.id}
              className={`${v.isStuck ? 'stuck' : ''} ${selectedId === v.id ? 'selected' : ''}`}
              onClick={() => onSelect(v.id)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(v.id)}
            >
              <td>
                <div className="vendor-name">{v.name}</div>
                <div className="muted small">{v.region}</div>
              </td>
              <td>
                <StageBadge stage={v.stage} label={v.stageLabel} />
                <StageProgress stages={stages} current={v.stage} />
              </td>
              <td>
                {v.stage === 'ACTIVE' ? (
                  <span className="muted">Since {formatDate(v.stageEnteredAt)}</span>
                ) : (
                  <>
                    <span className={v.isStuck ? 'days stuck-text' : 'days'}>
                      {plural(v.daysInStage, 'day')}
                    </span>
                    {v.isStuck && (
                      <span className="pill red" title={`More than ${stuckAfterDays} days without progress`}>
                        Stuck
                      </span>
                    )}
                    <div className="muted small">since {formatDate(v.stageEnteredAt)}</div>
                  </>
                )}
              </td>
              <td>
                <span className="avatar sm">{v.ownerName[0]}</span> {v.ownerName}
              </td>
              <td className="note-cell">
                {v.latestNote ? (
                  <>
                    <div className="truncate">{v.latestNote.text}</div>
                    <div className="muted small">
                      {v.latestNote.by} · {formatDate(v.latestNote.at)}
                    </div>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
