import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import StageBadge, { stageIndex } from './StageBadge.jsx';
import { describeEvent } from './ActivityFeed.jsx';
import { formatDate, formatDateTime, plural } from '../format.js';

export default function VendorDrawer({ vendorId, config, onClose, onChanged, onError }) {
  const { stages, stuckAfterDays } = config;
  const labelOf = (id) => stages.find((s) => s.id === id)?.label ?? id;

  const [vendor, setVendor] = useState(null);
  const [mode, setMode] = useState(null);
  const [note, setNote] = useState('');
  const [backTo, setBackTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [conflict, setConflict] = useState('');

  const load = useCallback(() => {
    api.vendor(vendorId).then(({ vendor }) => setVendor(vendor)).catch(onError);
  }, [vendorId, onError]);

  useEffect(() => {
    setVendor(null);
    setMode(null);
    setConflict('');
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function openMode(next) {
    setMode(next);
    setNote('');
    setFormError('');
    if (next === 'back') {
      const idx = stageIndex(stages, vendor.stage);
      setBackTo(stages[idx - 1]?.id ?? '');
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    setConflict('');
    try {
      let res;
      if (mode === 'note') {
        res = await api.addNote(vendor.id, note);
      } else if (mode === 'reject') {
        res = await api.rejectKyc(vendor.id, note);
      } else {
        const idx = stageIndex(stages, vendor.stage);
        const toStage = mode === 'advance' ? stages[idx + 1].id : backTo;
        res = await api.changeStage(vendor.id, { toStage, note, expectedVersion: vendor.version });
      }
      setVendor(res.vendor);
      setMode(null);
      onChanged();
    } catch (err) {
      if (err.status === 409) {
        setVendor(err.body.vendor);
        setMode(null);
        setConflict(err.message);
        onChanged();
      } else if (err.status === 400) {
        setFormError(err.message);
      } else {
        onError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  const idx = vendor ? stageIndex(stages, vendor.stage) : -1;
  const next = stages[idx + 1];
  const earlier = stages.slice(0, Math.max(idx, 0));

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Vendor details">
        {!vendor ? (
          <div className="center muted">Loading…</div>
        ) : (
          <>
            <header className="drawer-head">
              <div>
                <h2>{vendor.name}</h2>
                <div className="muted">
                  {vendor.region} · Coordinator: {vendor.ownerName}
                </div>
              </div>
              <button className="btn ghost icon" onClick={onClose} aria-label="Close">✕</button>
            </header>

            {conflict && (
              <div className="alert warn">
                <strong>Not saved.</strong> {conflict} The view below is now up to date.
              </div>
            )}

            <ol className="stepper">
              {stages.map((s, i) => (
                <li key={s.id} className={i < idx ? 'done' : i === idx ? `current ${vendor.isStuck ? 'stuck' : ''}` : ''}>
                  <span className="step-dot">{i < idx ? '✓' : i + 1}</span>
                  <span className="step-label">{s.label}</span>
                </li>
              ))}
            </ol>

            <div className={`status-box ${vendor.isStuck ? 'stuck' : ''}`}>
              <div>
                <StageBadge stage={vendor.stage} label={vendor.stageLabel} />
                {vendor.isStuck && <span className="pill red">Stuck</span>}
              </div>
              <div className="status-days">
                {vendor.stage === 'ACTIVE' ? (
                  <>Active since {formatDate(vendor.stageEnteredAt)}</>
                ) : (
                  <>
                    <b>{plural(vendor.daysInStage, 'day')}</b> in this stage (since {formatDate(vendor.stageEnteredAt)})
                    {vendor.isStuck && <div className="small">Over the {stuckAfterDays}-day limit — follow up with the vendor.</div>}
                  </>
                )}
              </div>
            </div>

            {!mode && (
              <div className="actions">
                {next && (
                  <button className="btn primary" onClick={() => openMode('advance')}>
                    Move to {next.label} →
                  </button>
                )}
                {vendor.stage === 'KYC_DOCS_RECEIVED' && (
                  <button className="btn" onClick={() => openMode('reject')}>
                    Record KYC rejection
                  </button>
                )}
                {earlier.length > 0 && (
                  <button className="btn" onClick={() => openMode('back')}>
                    ← Move back…
                  </button>
                )}
                <button className="btn" onClick={() => openMode('note')}>
                  Add note
                </button>
              </div>
            )}

            {mode && (
              <form className="action-form" onSubmit={submit}>
                {mode === 'advance' && (
                  <p>
                    Move <b>{vendor.name}</b> from <b>{vendor.stageLabel}</b> to <b>{next.label}</b>?
                  </p>
                )}
                {mode === 'back' && (
                  <>
                    <p>Move back (e.g. KYC documents rejected, or fixing a mistake). A reason is required.</p>
                    <label>
                      Move to
                      <select value={backTo} onChange={(e) => setBackTo(e.target.value)}>
                        {earlier.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {mode === 'reject' && (
                  <p>
                    Compliance rejected the documents. <b>{vendor.name}</b> stays at <b>KYC Docs Received</b> while
                    they resend; the rejection is logged in the history.
                  </p>
                )}
                {mode === 'note' && (
                  <p className="muted small">Notes are logged in the history but don’t reset the time-in-stage timer.</p>
                )}
                <label>
                  {mode === 'back' || mode === 'reject' ? 'Reason' : mode === 'note' ? 'Note' : 'Note (optional)'}
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    autoFocus
                    placeholder={
                      mode === 'back'
                        ? 'e.g. Compliance rejected business license — expired'
                        : mode === 'reject'
                          ? 'e.g. Business license expired — asked vendor to re-upload'
                        : mode === 'note'
                          ? 'e.g. Chased vendor by phone, docs promised Friday'
                          : ''
                    }
                  />
                </label>
                {formError && <div className="alert error">{formError}</div>}
                <div className="actions">
                  <button
                    className={`btn ${mode === 'back' || mode === 'reject' ? 'danger' : 'primary'}`}
                    disabled={busy || (mode !== 'advance' && !note.trim())}
                  >
                    {busy ? 'Saving…' : { advance: 'Confirm', back: 'Move back', reject: 'Record rejection', note: 'Save note' }[mode]}
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setMode(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <h3>History</h3>
            <ul className="timeline">
              {vendor.history.map((e) => (
                <li key={e.id} className={e.type === 'NOTE' ? 'note' : e.type === 'KYC_REJECTED' ? 'back' : e.fromStage && stageIndex(stages, e.toStage) < stageIndex(stages, e.fromStage) ? 'back' : 'forward'}>
                  <div>
                    <b>{e.actorName}</b> {describeEvent(e, labelOf)}
                  </div>
                  {e.note && <div className="feed-note">“{e.note}”</div>}
                  <div className="muted small">{formatDateTime(e.at)}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </>
  );
}
