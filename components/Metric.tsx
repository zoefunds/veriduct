export function Metric({ label, value, note, tone = "mint" }: { label: string; value: string; note: string; tone?: string }) {
  return <article className={`metric ${tone}`}><small>{label}</small><strong>{value}</strong><p>{note}</p></article>;
}
