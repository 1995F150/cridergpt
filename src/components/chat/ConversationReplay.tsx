import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as Message } from '@/hooks/useChat';

export function ConversationReplay({ messages, hasOlder, loading, onLoadOlder, onClose }: { messages: Message[]; hasOlder: boolean; loading: boolean; onLoadOlder: () => void; onClose: () => void }) {
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1500);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setPosition(value => Math.min(value + 1, messages.length)), speed);
    return () => clearInterval(timer);
  }, [playing, speed, messages.length]);
  useEffect(() => { if (position >= messages.length) setPlaying(false); }, [position, messages.length]);
  return <section className="min-w-0 space-y-3 p-3" aria-label="Conversation replay">
    <h2 className="font-semibold">Conversation replay</h2>
    <p className="text-sm text-muted-foreground">Original saved messages only. Replay never calls an AI model.{hasOlder ? ' Load older pages to include earlier messages.' : ''}</p>
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={onClose}>Back to chat</Button>
      {hasOlder && <Button disabled={loading} variant="outline" onClick={() => { setPlaying(false); setPosition(0); onLoadOlder(); }}>Load older records</Button>}
      <Button variant="outline" disabled={position === 0} onClick={() => setPosition(value => Math.max(0, value - 1))}>Previous</Button>
      <Button disabled={!messages.length} onClick={() => { if (position >= messages.length) setPosition(0); setPlaying(value => !value); }}>{playing ? 'Pause' : 'Play'}</Button>
      <Button variant="outline" disabled={position >= messages.length} onClick={() => setPosition(value => Math.min(messages.length, value + 1))}>Next</Button>
      <select className="min-h-11 rounded border bg-background p-2" aria-label="Playback speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}>
        <option value={3000}>0.5×</option><option value={1500}>1×</option><option value={750}>2×</option>
      </select>
    </div>
    <label className="block text-sm">{position} / {messages.length} loaded messages<input className="block min-h-11 w-full" type="range" aria-label="Replay position" min={0} max={messages.length} value={Math.min(position, messages.length)} onChange={event => { setPlaying(false); setPosition(Number(event.target.value)); }} /></label>
    {messages.slice(0, position).map(message => <div key={message.id}><time className="px-4 text-xs text-muted-foreground" dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time><ChatMessage role={message.role} content={message.content} timestamp={message.created_at} metadata={message.metadata} imageUrl={message.image_url} /></div>)}
  </section>;
}
