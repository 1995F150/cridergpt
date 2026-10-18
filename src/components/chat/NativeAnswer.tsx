import { safeSourceURL } from '@/utils/sourceURL';
import { Fragment, useMemo, type ReactNode } from 'react';
import { marked, type Token } from 'marked';
import { CodeBlock } from './CodeBlock';
export type NativeSource = { id: number; title: string; url: string };
export function NativeAnswer({ content, sources = [] }: { content: string; sources?: NativeSource[] }) {
  const tokens = useMemo(() => marked.lexer(!content.includes('```') && /^\s*def [A-Za-z_]\w*\([^\n)]*\)(?: -> [^:\n]+)?:\n[ \t]+\S/.test(content) ? '```python\n' + content + '\n```' : content), [content]);
  const known = new Map(sources.map(source => [String(source.id), safeSourceURL(source.url)]));
  const citations = (text: string) => text.split(/(\[\d+\])/g).map((part, i) => { const url = known.get(part.slice(1, -1)); return url && /^\[\d+\]$/.test(part) ? <a key={i} className="text-primary underline" href={url} target="_blank" rel="noopener noreferrer" aria-label={'Source ' + part.slice(1, -1)}>{part}</a> : <Fragment key={i}>{part}</Fragment>; });
  const inline = (items: Token[] = []): ReactNode => items.map((item, i) => {
    const inside = 'tokens' in item && item.tokens ? inline(item.tokens) : citations(String('text' in item ? item.text : ''));
    if (item.type === 'strong') return <strong key={i}>{inside}</strong>;
    if (item.type === 'em') return <em key={i}>{inside}</em>;
    if (item.type === 'del') return <del key={i}>{inside}</del>;
    if (item.type === 'codespan') return <code key={i} className="rounded bg-muted px-1">{item.text}</code>;
    if (item.type === 'br') return <br key={i} />;
    if (item.type === 'link') { const url = safeSourceURL(item.href); return url ? <a key={i} className="break-words text-primary underline" href={url} target="_blank" rel="noopener noreferrer">{inside}</a> : <Fragment key={i}>{inside}</Fragment>; }
    // Raw HTML is displayed as text, never inserted into the DOM.
    return <Fragment key={i}>{inside}</Fragment>;
  });
  const blocks = (items: Token[]): ReactNode => items.map((item, i) => {
    if (item.type === 'code') return <CodeBlock key={i} text={item.text} language={item.lang || 'code'} />;
    if (item.type === 'heading') { const Heading = ('h' + Math.max(1, Math.min(6, item.depth))) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; return <Heading key={i} className="my-3 font-semibold">{inline(item.tokens)}</Heading>; }
    if (item.type === 'blockquote') return <blockquote key={i} className="my-2 border-l-2 pl-3 text-muted-foreground">{blocks(item.tokens)}</blockquote>;
    if (item.type === 'list') { const rows = item.items.map((row, j: number) => <li key={j}>{blocks(row.tokens)}</li>); return item.ordered ? <ol key={i} start={item.start || 1} className="my-2 list-decimal space-y-1 pl-6">{rows}</ol> : <ul key={i} className="my-2 list-disc space-y-1 pl-6">{rows}</ul>; }
    if (item.type === 'table') return <div key={i} className="my-2 overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{item.header.map((cell,j: number) => <th key={j} className="border p-2">{inline(cell.tokens)}</th>)}</tr></thead><tbody>{item.rows.map((row,j: number) => <tr key={j}>{row.map((cell,k: number) => <td key={k} className="border p-2">{inline(cell.tokens)}</td>)}</tr>)}</tbody></table></div>;
    if (item.type === 'hr') return <hr key={i} className="my-3" />;
    if (item.type === 'space') return null;
    return <p key={i} className="my-2 whitespace-pre-wrap leading-relaxed">{'tokens' in item && item.tokens ? inline(item.tokens) : citations(String('text' in item ? item.text : ''))}</p>;
  });
  return <div className="w-full min-w-0 break-words text-sm">{blocks(tokens)}</div>;
}
