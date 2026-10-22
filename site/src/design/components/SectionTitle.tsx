import type { ReactNode } from 'react';

/** A section's eyebrow (mono, beak dot) and its big heading. */
export function SectionTitle({ eyebrow, title, id }: { eyebrow: ReactNode; title: ReactNode; id: string }) {
  return (
    <>
      <p className="dk-eyebrow">{eyebrow}</p>
      <h2 id={id} className="dk-section-heading">
        {title}
      </h2>
    </>
  );
}
