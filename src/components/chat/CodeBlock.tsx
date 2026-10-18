import { memo, useMemo, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import 'highlight.js/styles/github-dark.css';

for (const [name, definition] of Object.entries({ python, javascript, typescript, xml, css, sql, bash, json })) hljs.registerLanguage(name, definition);
const aliases: Record<string, string> = { py: 'python', js: 'javascript', ts: 'typescript', html: 'xml', sh: 'bash', shell: 'bash' };

export const CodeBlock = memo(function CodeBlock({ text, language = 'text' }: { text: string; language?: string }) {
  const [lineNumbers, setLineNumbers] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Copy code');
  const label = language.trim().split(/\s+/)[0].slice(0, 40) || 'text';
  const highlighted = useMemo(() => {
    const name = aliases[label.toLowerCase()] || label.toLowerCase();
    // Bound expensive highlighting. Unknown languages and huge outputs stay copyable.
    if (typeof window === 'undefined' || text.length > 50000 || !hljs.getLanguage(name)) return undefined;
    return DOMPurify.sanitize(hljs.highlight(text, { language: name, ignoreIllegals: true }).value, { ALLOWED_TAGS: ['span'], ALLOWED_ATTR: ['class'] });
  }, [text, label]);
  return <section className="my-3 min-w-0 max-w-full overflow-hidden rounded-xl border border-primary/20" aria-label={`${label} code block`}>
    <div className="flex flex-wrap items-center justify-between gap-2 bg-background/60 px-3 py-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" className="min-h-11 text-xs" aria-pressed={lineNumbers} onClick={() => setLineNumbers(value => !value)}>Line numbers</Button>
        <Button type="button" variant="ghost" size="sm" className="min-h-11 text-xs" onClick={async () => {
          try { await navigator.clipboard.writeText(text); setCopyStatus('Copied'); }
          catch { setCopyStatus('Copy unavailable — select code'); }
        }}>{copyStatus}</Button>
      </div>
    </div>
    <div className="flex max-w-full overflow-x-auto bg-[#0d1117] text-[#e6edf3]" tabIndex={0} role="region" aria-label="Scrollable code">
      {lineNumbers && <pre aria-hidden="true" className="select-none border-r border-white/10 p-3 pr-2 text-right text-xs leading-6 text-slate-500">{text.split('\n').map((_, index) => index + 1).join('\n')}</pre>}
      <pre className="m-0 min-w-0 flex-1 p-3 text-sm leading-6"><code className="whitespace-pre font-mono" {...(highlighted !== undefined ? { dangerouslySetInnerHTML: { __html: highlighted } } : { children: text })} /></pre>
    </div>
    <span className="sr-only" role="status">{copyStatus === 'Copy code' ? '' : copyStatus}</span>
  </section>;
});
