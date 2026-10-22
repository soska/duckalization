import { useEffect, useRef, useState, type ReactNode } from 'react';
import { type Size } from './cx.ts';

/** A shell command with a copy button. The labels come from the caller (translated). */
export function Command({
  command,
  copyLabel,
  copiedLabel,
  size = 'md',
}: {
  command: string;
  copyLabel: ReactNode;
  copiedLabel: ReactNode;
  size?: Size;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="dk-command" data-size={size}>
      <code>
        <span className="dk-command-prompt" aria-hidden="true">
          ${' '}
        </span>
        {command}
      </code>
      <button
        type="button"
        className="dk-command-copy"
        onClick={() => {
          void navigator.clipboard?.writeText(command).then(() => {
            setCopied(true);
            clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
      </button>
    </div>
  );
}
