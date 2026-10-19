// Transport-independent call state. No API keys, providers, or audio devices here.
export type CallMessage = { role: 'user' | 'assistant'; content: string };
export type CallCaption = { speaker: 'user' | 'ai'; text: string; timestamp: Date; model?: string; incomplete?: boolean };
type Reply = { text?: string; response?: string; audioContent?: string; model?: string; incomplete?: boolean; error?: string };
type Invoke = (name: string, body: Record<string, unknown>) => Promise<Reply>;

export class CallTurn {
  private epoch = 0;
  private active = false;
  private busy = false;
  private history: CallMessage[] = [];
  private cancelPending?: () => void;
  constructor(private invoke: Invoke, private emit: (entry: CallCaption) => void,
              private play: (audio: string) => Promise<void>, private timeoutMs = 60000) {}

  start() { this.stop(); this.active = true; this.history = []; }
  stop() { this.active = false; this.epoch++; this.busy = false; this.cancelPending?.(); }
  get processing() { return this.busy; }
  private current(epoch: number) { return this.active && this.epoch === epoch; }

  async run(audio: string, mimeType: string, model: string, voice: string): Promise<boolean> {
    if (!this.active || this.busy) return false;
    this.busy = true;
    const epoch = this.epoch;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let expired = false;
    const valid = () => this.current(epoch) && !expired;
    const work = async () => {
      const stt = await this.invoke('speech-to-text', { audio, mimeType });
      if (!valid()) return false;
      if (stt.error) throw new Error('Transcription failed. Please try again.');
      const text = stt.text?.trim();
      if (!text) return false;
      this.emit({ speaker: 'user', text, timestamp: new Date() });
      // The backend appends the new message itself; history must exclude it.
      const reply = await this.invoke('chat-with-ai', {
        message: text, model, conversation_history: this.history.slice(-10), mode: 'chat',
      });
      if (!valid()) return false;
      if (reply.error || !reply.response?.trim()) throw new Error('The selected model did not return an answer. Please retry.');
      if (model.startsWith('native:') && reply.model !== model.slice('native:'.length)) {
        throw new Error('The server returned a different model. No speech was played; please retry.');
      }
      this.emit({ speaker: 'ai', text: reply.response, timestamp: new Date(), model: reply.model, incomplete: reply.incomplete });
      if (reply.incomplete) throw new Error('The model returned an incomplete answer. It was not read aloud; please retry.');
      this.history = [...this.history, { role: 'user', content: text }, { role: 'assistant', content: reply.response }].slice(-10) as CallMessage[];
      // One speech request per response: sentence splitting consumed multiple usage credits.
      const speech = await this.invoke('text-to-speech', { text: reply.response, voice });
      if (!valid()) return false;
      if (speech.error || !speech.audioContent) throw new Error('Speech playback is unavailable. Your answer remains in the captions.');
      await this.play(speech.audioContent);
      return valid();
    };
    try {
      return await Promise.race([work(), new Promise<boolean>((resolve, reject) => {
        this.cancelPending = () => { expired = true; resolve(false); };
        timer = setTimeout(() => { expired = true; reject(new Error('Voice turn timed out. Please retry.')); }, this.timeoutMs);
      })]);
    } finally {
      clearTimeout(timer);
      if (this.epoch === epoch) { this.busy = false; this.cancelPending = undefined; }
    }
  }
}
