export type VoiceOption = { id: string; name: string; provider: 'local'; model: string; kind: 'stock' | 'owned_reference'; available: boolean };
type Invoke = (name: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>;
export type AudioPart = { audio: string; mime: 'audio/wav' };

export async function loadVoiceCatalog(invoke: Invoke): Promise<VoiceOption[]> {
  const catalog = await invoke('cridergpt-ubuntu-api', { action: 'native_audio', operation: 'catalog' });
  if (catalog.error || !Array.isArray(catalog.voices) || !(catalog.transcription as { available?: boolean })?.available) throw new Error('Local voice catalog unavailable. No external voice was substituted.');
  return catalog.voices.filter((voice): voice is VoiceOption => voice && typeof voice.id === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(voice.id) && typeof voice.name === 'string' && typeof voice.model === 'string' &&
    voice.provider === 'local' && ['stock', 'owned_reference'].includes(voice.kind) && voice.available === true).slice(0, 20);
}

export function splitSpeech(text: string): string[] {
  const chunks: string[] = [];
  while (text.length) {
    let end = Math.min(text.length, 300);
    if (end < text.length) {
      const boundary = text.lastIndexOf(' ', end - 1);
      if (boundary > 0) end = boundary + 1;
    }
    chunks.push(text.slice(0, end)); text = text.slice(end);
  }
  if (!chunks.length || chunks.length > 8) throw new Error('Answer is too long for local speech. Read the complete captions.');
  return chunks;
}

export class NativeVoiceTransport {
  private epoch = 0;
  private jobs = new Set<string>();
  constructor(private invoke: Invoke, private intervalMs = 350, private deadlineMs = 100000) {}
  private audio(body: Record<string, unknown>) { return this.invoke('cridergpt-ubuntu-api', { action: 'native_audio', ...body }); }
  cancel() {
    this.epoch++;
    for (const id of this.jobs) void this.audio({ operation: 'cancel', id }).catch(() => {});
    this.jobs.clear();
  }
  private async job(body: Record<string, unknown>, epoch: number) {
    if (epoch !== this.epoch) throw new Error('Voice turn cancelled.');
    const created = await this.audio(body);
    if (typeof created.id !== 'string' || !/^[0-9a-f-]{36}$/.test(created.id)) throw new Error('Local voice job was not accepted.');
    const id = created.id;
    if (epoch !== this.epoch) { void this.audio({ operation: 'cancel', id }).catch(() => {}); throw new Error('Voice turn cancelled.'); }
    this.jobs.add(id);
    const deadline = Date.now() + this.deadlineMs;
    try {
      while (Date.now() < deadline) {
        if (epoch !== this.epoch) throw new Error('Voice turn cancelled.');
        const job = await this.audio({ operation: 'job', id });
        if (epoch !== this.epoch) throw new Error('Voice turn cancelled.');
        if (job.status === 'completed' && job.result && typeof job.result === 'object') return job.result as Record<string, unknown>;
        if (!['queued', 'running'].includes(String(job.status))) throw new Error('Local speech was interrupted or failed. Please retry.');
        await new Promise(resolve => setTimeout(resolve, this.intervalMs));
      }
      throw new Error('Local speech timed out.');
    } finally {
      this.jobs.delete(id);
      void this.audio({ operation: 'cancel', id }).catch(() => {});
    }
  }
  async request(name: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const epoch = this.epoch;
    if (name === 'speech-to-text') {
      const result = await this.job({ operation: 'transcribe', audio: body.audio }, epoch);
      if (result.incomplete || !['eos', 'silence'].includes(String(result.finish_reason))) throw new Error('Transcription is incomplete. Please repeat the sentence.');
      return { text: result.text };
    }
    if (name === 'text-to-speech') {
      if (typeof body.text !== 'string' || typeof body.voice !== 'string') throw new Error('Choose a backend voice.');
      const selected = (await loadVoiceCatalog(this.invoke)).find(option => option.id === body.voice);
      if (epoch !== this.epoch) throw new Error('Voice turn cancelled.');
      if (!selected) throw new Error('Selected backend voice is unavailable. No substitution was made.');
      const parts: AudioPart[] = [];
      for (const text of splitSpeech(body.text)) {
        const result = await this.job({ operation: 'speech', text, voice_id: body.voice }, epoch);
        if (typeof result.audio !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(result.audio) || result.audio.length > 2800000 || result.mime !== 'audio/wav' || result.finish_reason !== 'completed' || Boolean(result.cloned) !== (selected.kind === 'owned_reference')) throw new Error('Voice output could not be verified. Read the answer in captions.');
        parts.push({ audio: result.audio, mime: 'audio/wav' });
      }
      return { audioParts: parts };
    }
    return this.invoke(name, body);
  }
}
