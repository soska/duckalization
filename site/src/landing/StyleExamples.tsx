import { useEffect, useRef, useState } from 'react';
import { useT } from './i18n.tsx';

export function StyleExamples() {
  const { __, __s } = useT();
  const [selected, setSelected] = useState(0);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const examples = [
    {
      label: __('Argentina · Youth'),
      locale: 'es-AR',
      tone: __('Casual. Local. Never trying too hard.'),
      prompt: __s('Configure duckalization for a young adult audience in Argentina (es-AR). Use vos and natural Rioplatense Spanish. Keep it playful, clear, and brief, without forced slang or Spain-specific phrasing. Keep product names unchanged. Save this as the es-AR translation style guide and connect it in the config, preserving other locale settings.'),
      source: 'Find your people.',
      translation: 'Encontrá a tu gente.',
    },
    {
      label: __('Spain · Business'),
      locale: 'es-ES',
      tone: __('Professional, without the corporate fog.'),
      prompt: __s('Configure duckalization for business professionals in Spain (es-ES). Address readers as usted. Use clear, precise language and a confident, respectful tone. Prefer presupuesto for quote. Avoid hype, buzzwords, and unnecessary anglicisms. Keep product names unchanged. Save this as the es-ES translation style guide and connect it in the config, preserving other locale settings.'),
      source: 'Request your quote.',
      translation: 'Solicite su presupuesto.',
    },
    {
      label: __('Mexico · Launch'),
      locale: 'es-MX',
      tone: __('Warm enough to welcome. Clear enough to sell.'),
      prompt: __s('Configure duckalization for a marketing site launching in Mexico (es-MX), aimed at small-business owners. Use tú and natural Mexican Spanish. Lead with concrete benefits and clear calls to action. Sound warm and confident, without exaggerated promises or forced slang. Preserve prices and product names. Save this as the es-MX translation style guide and connect it in the config, preserving other locale settings.'),
      source: 'Take the next step for your business.',
      translation: 'Da el siguiente paso con tu negocio.',
    },
  ];
  const example = examples[selected]!;

  useEffect(() => {
    setCopyState('idle');
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [example.prompt]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(example.prompt);
      setCopyState('copied');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <div className="style-examples">
      <div className="style-example-options" role="group" aria-label={__s('Style guide examples')}>
        {examples.map((item, index) => (
          <button key={item.locale} type="button" aria-pressed={selected === index} aria-controls="style-example-content" onClick={() => setSelected(index)}>{item.label}</button>
        ))}
      </div>
      <div className="style-example-content" id="style-example-content">
        <header><span className="style-example-locale">{example.locale}</span><h4>{example.tone}</h4></header>
        <div className="style-example-prompt" key={example.locale}>{example.prompt}</div>
        <div className="style-example-wording">
          <span>{__('A little of that voice')}</span>
          <q lang="en">{example.source}</q>
          <span aria-hidden="true">↓</span>
          <q lang={example.locale}>{example.translation}</q>
        </div>
        <div className="style-example-action">
          <span>{__('Give your agent a starting point.')}</span>
          <button type="button" onClick={() => { void copy(); }} aria-label={__s('Copy style prompt')}>{copyState === 'copied' ? __('Copied') : __('Copy prompt')} <span aria-hidden="true">{copyState === 'copied' ? '✓' : '↗'}</span></button>
        </div>
        <span className="style-example-feedback" role="status">{copyState === 'copied' ? __('Prompt copied.') : copyState === 'failed' ? __('Couldn’t copy. Select the prompt text to copy it.') : ''}</span>
      </div>
    </div>
  );
}
