export function stageIndex(stages, id) {
  return stages.findIndex((s) => s.id === id);
}

export default function StageBadge({ stage, label }) {
  return <span className={`badge stage-${stage.toLowerCase().replaceAll('_', '-')}`}>{label}</span>;
}

export function StageProgress({ stages, current }) {
  const idx = stageIndex(stages, current);
  return (
    <span className="progress" aria-label={`Stage ${idx + 1} of ${stages.length}`}>
      {stages.map((s, i) => (
        <span key={s.id} className={`seg ${i <= idx ? 'done' : ''}`} title={s.label} />
      ))}
    </span>
  );
}
