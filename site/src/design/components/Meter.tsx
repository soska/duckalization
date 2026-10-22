/**
 * A small pill-shaped gauge. Without `label` it's decorative (the number is
 * said in text next to it); with one it's an accessible `meter`.
 */
export function Meter({ value, label }: { value: number; label?: string }) {
  const v = Math.min(1, Math.max(0, value));
  const a11y = label
    ? { role: 'meter', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 1, 'aria-valuenow': v }
    : { 'aria-hidden': true as const };
  return (
    <span className="dk-meter" {...a11y}>
      <span style={{ transform: `scaleX(${v})` }} />
    </span>
  );
}
