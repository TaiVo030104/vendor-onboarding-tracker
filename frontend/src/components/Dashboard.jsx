import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import StageSummary from './StageSummary.jsx';
import VendorTable from './VendorTable.jsx';
import VendorDrawer from './VendorDrawer.jsx';
import ActivityFeed from './ActivityFeed.jsx';

export default function Dashboard({ user, onLogout, onSessionExpired }) {
  const [config, setConfig] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const [stageFilter, setStageFilter] = useState(null);
  const [stuckOnly, setStuckOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [search, setSearch] = useState('');

  const handleError = useCallback(
    (err) => {
      if (err.status === 401) return onSessionExpired();
      setError(err.message);
    },
    [onSessionExpired],
  );

  const refresh = useCallback(async () => {
    try {
      const [{ vendors }, { events }] = await Promise.all([api.vendors(), api.activity()]);
      setVendors(vendors);
      setActivity(events);
      setError('');
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  useEffect(() => {
    api.config().then(setConfig).catch(handleError);
    refresh();
  }, [refresh, handleError]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors
      .filter((v) => !stageFilter || v.stage === stageFilter)
      .filter((v) => !stuckOnly || v.isStuck)
      .filter((v) => !mineOnly || v.ownerId === user.id)
      .filter((v) => !q || v.name.toLowerCase().includes(q) || v.region.toLowerCase().includes(q))
      .sort((a, b) => Number(b.isStuck) - Number(a.isStuck) || b.daysInStage - a.daysInStage);
  }, [vendors, stageFilter, stuckOnly, mineOnly, search, user.id]);

  const stuckCount = vendors.filter((v) => v.isStuck).length;

  if (!config) {
    return <div className="center muted">{error || 'Loading…'}</div>;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">VO</span>
          <strong>Vendor Onboarding</strong>
        </div>
        <div className="topbar-right">
          <span className="muted small">Today: {new Date(config.now).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span className="avatar" title={user.name}>{user.name[0]}</span>
          <span>{user.name}</span>
          <button className="btn ghost" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main className="layout">
        <section className="main-col">
          {error && <div className="alert error">{error}</div>}

          <StageSummary
            stages={config.stages}
            vendors={vendors}
            active={stageFilter}
            onSelect={(id) => setStageFilter((cur) => (cur === id ? null : id))}
          />

          {stuckCount > 0 && (
            <button className={`stuck-banner ${stuckOnly ? 'on' : ''}`} onClick={() => setStuckOnly((s) => !s)}>
              <span className="dot red" />
              <strong>{stuckCount} vendor{stuckCount === 1 ? '' : 's'} stuck</strong>
              <span className="muted">— no progress for more than {config.stuckAfterDays} days.</span>
              <span className="link">{stuckOnly ? 'Show all' : 'Show only these'}</span>
            </button>
          )}

          <div className="toolbar">
            <input
              className="search"
              placeholder="Search vendor or region…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="toggle">
              <input type="checkbox" checked={stuckOnly} onChange={(e) => setStuckOnly(e.target.checked)} />
              Stuck only
            </label>
            <label className="toggle">
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
              My vendors
            </label>
            {(stageFilter || stuckOnly || mineOnly || search) && (
              <button
                className="btn ghost small"
                onClick={() => {
                  setStageFilter(null);
                  setStuckOnly(false);
                  setMineOnly(false);
                  setSearch('');
                }}
              >
                Clear filters
              </button>
            )}
            <span className="muted small push">{visible.length} of {vendors.length} vendors</span>
          </div>

          <VendorTable
            vendors={visible}
            stages={config.stages}
            stuckAfterDays={config.stuckAfterDays}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>

        <aside className="side-col">
          <ActivityFeed events={activity} stages={config.stages} onSelectVendor={setSelectedId} />
        </aside>
      </main>

      {selectedId && (
        <VendorDrawer
          vendorId={selectedId}
          config={config}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
          onError={handleError}
        />
      )}
    </div>
  );
}
