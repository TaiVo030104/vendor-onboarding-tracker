export default function StageSummary({ stages, vendors, active, onSelect }) {
  return (
    <div className="summary">
      {stages.map((s, i) => {
        const inStage = vendors.filter((v) => v.stage === s.id);
        const stuck = inStage.filter((v) => v.isStuck).length;
        return (
          <button
            key={s.id}
            className={`summary-card ${active === s.id ? 'active' : ''}`}
            onClick={() => onSelect(s.id)}
            title={`Filter to ${s.label}`}
          >
            <span className="summary-step">{i + 1}</span>
            <span className="summary-label">{s.label}</span>
            <span className="summary-count">{inStage.length}</span>
            <span className={`summary-stuck ${stuck ? '' : 'hidden'}`}>{stuck} stuck</span>
          </button>
        );
      })}
    </div>
  );
}
