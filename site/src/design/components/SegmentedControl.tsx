import type { ReactNode } from 'react';
import { type Size } from './cx.ts';

export type Segment<T extends string> = { value: T; label: ReactNode; lang?: string };

/**
 * One-of-n choice as a group of pressed buttons. Not tabs: choosing a segment
 * changes a setting (like the page language), it doesn't reveal a panel.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
}: {
  /** Accessible name of the group. */
  label: string;
  options: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: Size;
}) {
  return (
    <div className="dk-segmented" data-size={size} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="dk-segmented-option"
          lang={o.lang}
          aria-pressed={value === o.value}
          onClick={() => {
            if (value !== o.value) onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
