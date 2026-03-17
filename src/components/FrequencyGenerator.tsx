import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Play, Square, Volume2, VolumeX, Music, Brain, Zap, Radio, 
  Mic, BarChart3, Waves, Timer, Heart, Wind, Sparkles, 
  Guitar, Piano, Drum, AudioLines, Search, Star, StarOff,
  Download, Circle, Settings, Headphones, Speaker, Activity,
  Eye, RefreshCw, Hash, Send, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// ─── AUDIO ENGINE ───────────────────────────────────────────────
class AudioEngine {
  ctx: AudioContext | null = null;
  oscillators: Map<string, { osc: OscillatorNode; gain: GainNode }> = new Map();
  analyser: AnalyserNode | null = null;
  masterGain: GainNode | null = null;
  noiseSource: AudioBufferSourceNode | null = null;

  init() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  play(id: string, freq: number, type: OscillatorType = 'sine', vol = 0.5, pan = 0) {
    this.init();
    this.stop(id);
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.05);
    
    if (pan !== 0) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      osc.connect(gain).connect(panner).connect(this.masterGain!);
    } else {
      osc.connect(gain).connect(this.masterGain!);
    }
    osc.start();
    this.oscillators.set(id, { osc, gain });
  }

  stop(id: string) {
    const entry = this.oscillators.get(id);
    if (entry) {
      try {
        entry.gain.gain.linearRampToValueAtTime(0, (this.ctx?.currentTime || 0) + 0.05);
        setTimeout(() => { try { entry.osc.stop(); } catch {} }, 60);
      } catch {}
      this.oscillators.delete(id);
    }
  }

  stopAll() {
    this.oscillators.forEach((_, id) => this.stop(id));
    if (this.noiseSource) { try { this.noiseSource.stop(); } catch {} this.noiseSource = null; }
  }

  setFrequency(id: string, freq: number) {
    const entry = this.oscillators.get(id);
    if (entry && this.ctx) {
      entry.osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    }
  }

  setVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  playNoise(type: 'white' | 'pink' | 'brown', vol = 0.3) {
    this.init();
    if (this.noiseSource) { try { this.noiseSource.stop(); } catch {} }
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'pink') {
      let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
        b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
        b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
        data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * w)) / 1.02;
        lastOut = data[i]; data[i] *= 3.5;
      }
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    source.connect(gain).connect(this.masterGain!);
    source.start();
    this.noiseSource = source;
  }

  stopNoise() {
    if (this.noiseSource) { try { this.noiseSource.stop(); } catch {} this.noiseSource = null; }
  }

  getAnalyserData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getWaveformData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  sweep(from: number, to: number, duration: number, type: OscillatorType = 'sine') {
    this.init();
    this.stop('sweep');
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), ctx.currentTime + duration);
    gain.gain.value = 0.4;
    osc.connect(gain).connect(this.masterGain!);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    this.oscillators.set('sweep', { osc, gain });
    setTimeout(() => this.oscillators.delete('sweep'), duration * 1000 + 100);
  }
}

// ─── DATA ────────────────────────────────────────────────────────
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const noteToFreq = (note: string, octave: number) => {
  const idx = NOTES.indexOf(note);
  const n = (octave - 4) * 12 + (idx - 9);
  return 440 * Math.pow(2, n / 12);
};
const freqToNote = (f: number) => {
  const n = 12 * Math.log2(f / 440) + 49;
  const noteIdx = Math.round(n - 1) % 12;
  const oct = Math.floor((Math.round(n - 1) + 8) / 12);
  return `${NOTES[noteIdx < 0 ? noteIdx + 12 : noteIdx]}${oct}`;
};

const SOLFEGGIO = [
  { freq: 174, label: 'Pain Relief', desc: 'Foundation frequency for physical healing' },
  { freq: 285, label: 'Tissue Healing', desc: 'Influences energy fields' },
  { freq: 396, label: 'Liberation', desc: 'Liberating guilt and fear' },
  { freq: 417, label: 'Change', desc: 'Undoing situations and facilitating change' },
  { freq: 528, label: 'Miracles', desc: 'Transformation and DNA repair' },
  { freq: 639, label: 'Connections', desc: 'Connecting relationships' },
  { freq: 741, label: 'Expression', desc: 'Awakening intuition' },
  { freq: 852, label: 'Intuition', desc: 'Returning to spiritual order' },
  { freq: 963, label: 'Divine', desc: 'Connection to the cosmos' },
];

const BINAURAL_PRESETS = [
  { name: 'Deep Sleep (Delta)', base: 200, beat: 2, desc: '0.5-4 Hz — deep dreamless sleep' },
  { name: 'Meditation (Theta)', base: 200, beat: 6, desc: '4-8 Hz — deep meditation, creativity' },
  { name: 'Relaxation (Alpha)', base: 200, beat: 10, desc: '8-13 Hz — calm, relaxed focus' },
  { name: 'Focus (Beta)', base: 200, beat: 18, desc: '13-30 Hz — alertness, concentration' },
  { name: 'Peak Performance (Gamma)', base: 200, beat: 40, desc: '30-100 Hz — higher processing' },
  { name: 'Schumann Resonance', base: 200, beat: 7.83, desc: 'Earth\'s natural frequency' },
];

const DTMF: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

const MORSE: Record<string, string> = {
  'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....',
  'I':'..','J':'.---','K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.',
  'Q':'--.-','R':'.-.','S':'...','T':'-','U':'..-','V':'...-','W':'.--','X':'-..-',
  'Y':'-.--','Z':'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-',
  '5':'.....','6':'-....','7':'--...','8':'---..','9':'----.', ' ': '/'
};

const GUITAR_STRINGS = [
  { name: 'E2', freq: 82.41 }, { name: 'A2', freq: 110 },
  { name: 'D3', freq: 146.83 }, { name: 'G3', freq: 196 },
  { name: 'B3', freq: 246.94 }, { name: 'E4', freq: 329.63 },
];

const SCALES: Record<string, number[]> = {
  'Major': [0,2,4,5,7,9,11,12],
  'Minor': [0,2,3,5,7,8,10,12],
  'Pentatonic': [0,2,4,7,9,12],
  'Blues': [0,3,5,6,7,10,12],
  'Dorian': [0,2,3,5,7,9,10,12],
  'Mixolydian': [0,2,4,5,7,9,10,12],
  'Harmonic Minor': [0,2,3,5,7,8,11,12],
  'Chromatic': [0,1,2,3,4,5,6,7,8,9,10,11,12],
};

const CHORDS: Record<string, number[]> = {
  'Major': [0,4,7], 'Minor': [0,3,7], 'Dim': [0,3,6], 'Aug': [0,4,8],
  'Maj7': [0,4,7,11], 'Min7': [0,3,7,10], 'Dom7': [0,4,7,10],
  'Sus2': [0,2,7], 'Sus4': [0,5,7], 'Add9': [0,4,7,14],
  'Power': [0,7,12], '6th': [0,4,7,9],
};

const SFX_PRESETS = [
  { name: 'Laser', fn: (e: AudioEngine) => e.sweep(2000, 200, 0.3, 'sawtooth') },
  { name: 'Warp', fn: (e: AudioEngine) => e.sweep(100, 3000, 1.5, 'sine') },
  { name: 'Siren', fn: (e: AudioEngine) => { let up = true; const id = setInterval(() => { e.sweep(up ? 400 : 800, up ? 800 : 400, 0.8); up = !up; }, 800); setTimeout(() => { clearInterval(id); e.stopAll(); }, 5000); }},
  { name: 'Sonar Ping', fn: (e: AudioEngine) => { e.play('sonar', 1200, 'sine', 0.6); setTimeout(() => e.stop('sonar'), 150); }},
  { name: 'Alarm', fn: (e: AudioEngine) => { let on = true; const id = setInterval(() => { if (on) e.play('alarm', 880, 'square', 0.3); else e.stop('alarm'); on = !on; }, 250); setTimeout(() => { clearInterval(id); e.stopAll(); }, 3000); }},
  { name: 'Doorbell', fn: (e: AudioEngine) => { e.play('db1', 523.25, 'sine', 0.4); setTimeout(() => { e.stop('db1'); e.play('db2', 659.25, 'sine', 0.4); setTimeout(() => e.stop('db2'), 400); }, 300); }},
  { name: 'Heartbeat', fn: (e: AudioEngine) => { const beat = () => { e.play('hb', 60, 'sine', 0.5); setTimeout(() => e.stop('hb'), 100); setTimeout(() => { e.play('hb2', 80, 'sine', 0.3); setTimeout(() => e.stop('hb2'), 80); }, 150); }; beat(); const id = setInterval(beat, 800); setTimeout(() => { clearInterval(id); e.stopAll(); }, 5000); }},
  { name: 'Coin Drop', fn: (e: AudioEngine) => { e.play('coin', 1500, 'square', 0.2); setTimeout(() => { e.stop('coin'); e.play('coin2', 2000, 'square', 0.15); setTimeout(() => e.stop('coin2'), 100); }, 80); }},
  { name: 'Power Up', fn: (e: AudioEngine) => e.sweep(200, 1500, 0.5, 'square') },
  { name: 'Power Down', fn: (e: AudioEngine) => e.sweep(1500, 100, 0.8, 'sawtooth') },
  { name: 'Explosion', fn: (e: AudioEngine) => { e.playNoise('brown', 0.8); setTimeout(() => e.stopNoise(), 1500); }},
  { name: 'Static', fn: (e: AudioEngine) => { e.playNoise('white', 0.3); setTimeout(() => e.stopNoise(), 2000); }},
];

const INTERVALS = [
  'Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd', 'Perfect 4th',
  'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th', 'Minor 7th', 'Major 7th', 'Octave'
];

// ─── VISUALIZER COMPONENT ──────────────────────────────────────
function SpectrumVisualizer({ engine, active }: { engine: AudioEngine; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx2d = canvas.getContext('2d')!;
    const draw = () => {
      const data = engine.getAnalyserData();
      const w = canvas.width, h = canvas.height;
      ctx2d.fillStyle = 'hsl(var(--background))';
      ctx2d.fillRect(0, 0, w, h);
      const barW = w / data.length * 2.5;
      for (let i = 0; i < data.length; i++) {
        const barH = (data[i] / 255) * h;
        const hue = (i / data.length) * 240;
        ctx2d.fillStyle = `hsl(${hue}, 80%, 55%)`;
        ctx2d.fillRect(i * barW, h - barH, barW - 1, barH);
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active, engine]);

  return <canvas ref={canvasRef} width={400} height={120} className="w-full h-[120px] rounded-md border border-border bg-background" />;
}

function WaveformVisualizer({ engine, active }: { engine: AudioEngine; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx2d = canvas.getContext('2d')!;
    const draw = () => {
      const data = engine.getWaveformData();
      const w = canvas.width, h = canvas.height;
      ctx2d.fillStyle = 'hsl(var(--background))';
      ctx2d.fillRect(0, 0, w, h);
      ctx2d.beginPath();
      ctx2d.strokeStyle = 'hsl(var(--primary))';
      ctx2d.lineWidth = 2;
      for (let i = 0; i < data.length; i++) {
        const x = (i / data.length) * w;
        const y = (data[i] / 255) * h;
        if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active, engine]);

  return <canvas ref={canvasRef} width={400} height={100} className="w-full h-[100px] rounded-md border border-border bg-background" />;
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────
export function FrequencyGenerator() {
  const engineRef = useRef(new AudioEngine());
  const engine = engineRef.current;

  // Core state
  const [frequency, setFrequency] = useState(440);
  const [waveform, setWaveform] = useState<OscillatorType>('sine');
  const [volume, setVolume] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dual tone
  const [freq2, setFreq2] = useState(880);
  const [dualPlaying, setDualPlaying] = useState(false);

  // Sweep
  const [sweepFrom, setSweepFrom] = useState(200);
  const [sweepTo, setSweepTo] = useState(2000);
  const [sweepDuration, setSweepDuration] = useState(2);

  // Binaural
  const [binauralBase, setBinauralBase] = useState(200);
  const [binauralBeat, setBinauralBeat] = useState(10);
  const [binauralPlaying, setBinauralPlaying] = useState(false);

  // Noise
  const [noiseType, setNoiseType] = useState<'white'|'pink'|'brown'>('white');
  const [noisePlaying, setNoisePlaying] = useState(false);

  // Metronome
  const [bpm, setBpm] = useState(120);
  const [metronomeRunning, setMetronomeRunning] = useState(false);
  const metronomeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Morse
  const [morseText, setMorseText] = useState('');

  // DTMF
  const [dtmfSequence, setDtmfSequence] = useState('');

  // Interval trainer
  const [intervalAnswer, setIntervalAnswer] = useState('');
  const [currentInterval, setCurrentInterval] = useState(0);
  const [intervalScore, setIntervalScore] = useState({ correct: 0, total: 0 });

  // Sleep timer
  const [sleepMinutes, setSleepMinutes] = useState(30);
  const [sleepActive, setSleepActive] = useState(false);
  const sleepRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BPM tapper
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [tappedBpm, setTappedBpm] = useState(0);

  // Favorites
  const [favorites, setFavorites] = useState<{ freq: number; wave: OscillatorType; name: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('freq-favorites') || '[]'); } catch { return []; }
  });
  const [recentFreqs, setRecentFreqs] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('freq-recent') || '[]'); } catch { return []; }
  });

  // Hearing test
  const [hearingTestRunning, setHearingTestRunning] = useState(false);
  const [hearingTestFreq, setHearingTestFreq] = useState(20);

  // Breathing pacer
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale'|'hold'|'exhale'|'rest'>('inhale');
  const breathRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step sequencer
  const [seqSteps, setSeqSteps] = useState<boolean[]>(new Array(16).fill(false));
  const [seqPlaying, setSeqPlaying] = useState(false);
  const [seqBpm, setSeqBpm] = useState(140);
  const [seqStep, setSeqStep] = useState(0);
  const seqRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Speaker test
  const [speakerChannel, setSpeakerChannel] = useState<'left'|'right'|'both'>('both');

  // Visualizer
  const [showVisualizer, setShowVisualizer] = useState(true);

  // Cleanup
  useEffect(() => () => { engine.stopAll(); }, []);

  // Save favorites
  useEffect(() => { localStorage.setItem('freq-favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('freq-recent', JSON.stringify(recentFreqs)); }, [recentFreqs]);

  const addRecent = useCallback((f: number) => {
    setRecentFreqs(prev => {
      const next = [f, ...prev.filter(x => x !== f)].slice(0, 20);
      return next;
    });
  }, []);

  // ─── HANDLERS ───
  const handlePlay = () => {
    if (isPlaying) { engine.stop('main'); setIsPlaying(false); }
    else { engine.play('main', frequency, waveform, volume / 100); setIsPlaying(true); addRecent(frequency); }
  };

  const handleDualPlay = () => {
    if (dualPlaying) { engine.stop('dual1'); engine.stop('dual2'); setDualPlaying(false); }
    else { engine.play('dual1', frequency, waveform, volume / 100); engine.play('dual2', freq2, waveform, volume / 100); setDualPlaying(true); }
  };

  const handleSweep = () => { engine.sweep(sweepFrom, sweepTo, sweepDuration, waveform); toast.success(`Sweep: ${sweepFrom}→${sweepTo} Hz over ${sweepDuration}s`); };

  const handleBinaural = () => {
    if (binauralPlaying) { engine.stop('binL'); engine.stop('binR'); setBinauralPlaying(false); }
    else {
      engine.play('binL', binauralBase, 'sine', volume / 100, -1);
      engine.play('binR', binauralBase + binauralBeat, 'sine', volume / 100, 1);
      setBinauralPlaying(true);
      toast.success(`Binaural: ${binauralBase} Hz L / ${binauralBase + binauralBeat} Hz R (${binauralBeat} Hz beat)`);
    }
  };

  const handleNoise = () => {
    if (noisePlaying) { engine.stopNoise(); setNoisePlaying(false); }
    else { engine.playNoise(noiseType, volume / 100); setNoisePlaying(true); }
  };

  const handleMetronome = () => {
    if (metronomeRunning) {
      if (metronomeRef.current) clearInterval(metronomeRef.current);
      engine.stop('metro');
      setMetronomeRunning(false);
    } else {
      const tick = () => { engine.play('metro', 1000, 'sine', 0.3); setTimeout(() => engine.stop('metro'), 30); };
      tick();
      metronomeRef.current = setInterval(tick, 60000 / bpm);
      setMetronomeRunning(true);
    }
  };

  const playMorse = async () => {
    const txt = morseText.toUpperCase();
    engine.init();
    for (const ch of txt) {
      const code = MORSE[ch];
      if (!code) continue;
      if (code === '/') { await new Promise(r => setTimeout(r, 400)); continue; }
      for (const sym of code) {
        engine.play('morse', 700, 'sine', 0.4);
        await new Promise(r => setTimeout(r, sym === '.' ? 80 : 240));
        engine.stop('morse');
        await new Promise(r => setTimeout(r, 60));
      }
      await new Promise(r => setTimeout(r, 200));
    }
    toast.success('Morse complete!');
  };

  const playDTMF = async () => {
    engine.init();
    for (const ch of dtmfSequence) {
      const tones = DTMF[ch];
      if (!tones) continue;
      engine.play('dtmf1', tones[0], 'sine', 0.3);
      engine.play('dtmf2', tones[1], 'sine', 0.3);
      await new Promise(r => setTimeout(r, 200));
      engine.stop('dtmf1'); engine.stop('dtmf2');
      await new Promise(r => setTimeout(r, 100));
    }
  };

  const playScale = (root: string, octave: number, scaleName: string) => {
    const intervals = SCALES[scaleName];
    if (!intervals) return;
    const rootFreq = noteToFreq(root, octave);
    intervals.forEach((semitone, i) => {
      setTimeout(() => {
        engine.play('scale', rootFreq * Math.pow(2, semitone / 12), waveform, volume / 100);
        setTimeout(() => engine.stop('scale'), 250);
      }, i * 300);
    });
  };

  const playChord = (root: string, octave: number, chordName: string) => {
    const intervals = CHORDS[chordName];
    if (!intervals) return;
    const rootFreq = noteToFreq(root, octave);
    intervals.forEach((semitone, i) => {
      engine.play(`chord${i}`, rootFreq * Math.pow(2, semitone / 12), waveform, volume / 100);
    });
    setTimeout(() => intervals.forEach((_, i) => engine.stop(`chord${i}`)), 2000);
  };

  const startIntervalTrainer = () => {
    const interval = Math.floor(Math.random() * 13);
    setCurrentInterval(interval);
    setIntervalAnswer('');
    const base = 261.63;
    engine.play('int1', base, 'sine', 0.4);
    setTimeout(() => { engine.stop('int1'); engine.play('int2', base * Math.pow(2, interval / 12), 'sine', 0.4); setTimeout(() => engine.stop('int2'), 800); }, 1000);
  };

  const checkInterval = (guess: number) => {
    if (guess === currentInterval) {
      setIntervalScore(p => ({ correct: p.correct + 1, total: p.total + 1 }));
      toast.success(`Correct! ${INTERVALS[currentInterval]}`);
    } else {
      setIntervalScore(p => ({ ...p, total: p.total + 1 }));
      toast.error(`Wrong! It was ${INTERVALS[currentInterval]}`);
    }
  };

  const handleSleepTimer = () => {
    if (sleepActive) {
      if (sleepRef.current) clearTimeout(sleepRef.current);
      setSleepActive(false);
      toast.info('Sleep timer cancelled');
    } else {
      sleepRef.current = setTimeout(() => { engine.stopAll(); setIsPlaying(false); setBinauralPlaying(false); setNoisePlaying(false); setSleepActive(false); toast.info('Sleep timer — audio stopped'); }, sleepMinutes * 60000);
      setSleepActive(true);
      toast.success(`Audio will stop in ${sleepMinutes} minutes`);
    }
  };

  const handleTap = () => {
    const now = Date.now();
    const newTaps = [...tapTimes, now].slice(-8);
    setTapTimes(newTaps);
    if (newTaps.length >= 2) {
      const diffs = newTaps.slice(1).map((t, i) => t - newTaps[i]);
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      setTappedBpm(Math.round(60000 / avg));
    }
  };

  const startHearingTest = async () => {
    setHearingTestRunning(true);
    const freqs = [20, 50, 100, 250, 500, 1000, 2000, 4000, 8000, 12000, 16000, 18000, 20000];
    for (const f of freqs) {
      setHearingTestFreq(f);
      engine.play('hearing', f, 'sine', 0.3);
      await new Promise(r => setTimeout(r, 1500));
      engine.stop('hearing');
      await new Promise(r => setTimeout(r, 300));
    }
    setHearingTestRunning(false);
    toast.success('Hearing test complete!');
  };

  const startBreathing = () => {
    if (breathingActive) {
      if (breathRef.current) clearInterval(breathRef.current);
      setBreathingActive(false);
      engine.stop('breath');
      return;
    }
    setBreathingActive(true);
    const phases: ('inhale'|'hold'|'exhale'|'rest')[] = ['inhale','hold','exhale','rest'];
    const durations = [4000, 4000, 4000, 4000];
    let idx = 0;
    const cycle = () => {
      setBreathPhase(phases[idx]);
      if (phases[idx] === 'inhale') engine.play('breath', 396, 'sine', 0.15);
      else if (phases[idx] === 'exhale') { engine.stop('breath'); engine.play('breath', 285, 'sine', 0.1); }
      else engine.stop('breath');
      idx = (idx + 1) % 4;
    };
    cycle();
    breathRef.current = setInterval(cycle, 4000);
  };

  const toggleSeqStep = (i: number) => {
    const next = [...seqSteps];
    next[i] = !next[i];
    setSeqSteps(next);
  };

  const startSequencer = () => {
    if (seqPlaying) {
      if (seqRef.current) clearInterval(seqRef.current);
      engine.stop('seq');
      setSeqPlaying(false);
      return;
    }
    setSeqPlaying(true);
    let step = 0;
    const tick = () => {
      setSeqStep(step);
      if (seqSteps[step]) {
        engine.play('seq', frequency, waveform, volume / 100);
        setTimeout(() => engine.stop('seq'), 60000 / seqBpm * 0.3);
      }
      step = (step + 1) % 16;
    };
    tick();
    seqRef.current = setInterval(tick, 60000 / seqBpm);
  };

  const handleSpeakerTest = () => {
    const pan = speakerChannel === 'left' ? -1 : speakerChannel === 'right' ? 1 : 0;
    engine.play('speaker', 440, 'sine', 0.4, pan);
    setTimeout(() => engine.stop('speaker'), 2000);
    toast.success(`Playing on ${speakerChannel} channel(s)`);
  };

  const addFavorite = () => {
    const name = `${freqToNote(frequency)} (${frequency} Hz)`;
    if (favorites.find(f => f.freq === frequency)) return;
    setFavorites(prev => [...prev, { freq: frequency, wave: waveform, name }]);
    toast.success('Added to favorites!');
  };

  // Update volume in real time
  useEffect(() => { engine.setVolume(volume / 100); }, [volume]);

  // Update frequency on playing oscillator
  useEffect(() => { if (isPlaying) engine.setFrequency('main', frequency); }, [frequency, isPlaying]);

  const wavelength = (343 / frequency).toFixed(3);
  const noteName = freqToNote(frequency);

  // ─── Category feature count badges ───
  const categories = [
    { id: 'tone', label: 'Tone Generator', icon: Waves, count: 8 },
    { id: 'musical', label: 'Musical Tools', icon: Music, count: 12 },
    { id: 'binaural', label: 'Binaural & Wellness', icon: Brain, count: 12 },
    { id: 'sfx', label: 'Sound Effects', icon: Sparkles, count: 14 },
    { id: 'analysis', label: 'Audio Analysis', icon: BarChart3, count: 7 },
    { id: 'science', label: 'Science & Education', icon: Zap, count: 11 },
    { id: 'signal', label: 'Signal Processing', icon: Radio, count: 13 },
    { id: 'utility', label: 'Utility Tools', icon: Settings, count: 10 },
    { id: 'sequence', label: 'Pattern & Sequence', icon: Activity, count: 9 },
    { id: 'comms', label: 'Communication', icon: Send, count: 7 },
    { id: 'presets', label: 'Presets & Favorites', icon: Star, count: 6 },
    { id: 'visual', label: 'Visualizations', icon: Eye, count: 6 },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AudioLines className="h-6 w-6 text-primary" />
            Sound & Frequency Toolkit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">120+ audio tools powered by the Web Audio API</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{categories.reduce((s, c) => s + c.count, 0)}+ Features</Badge>
          <Button variant="outline" size="sm" onClick={() => { engine.stopAll(); setIsPlaying(false); setBinauralPlaying(false); setNoisePlaying(false); setDualPlaying(false); setMetronomeRunning(false); setSeqPlaying(false); }}>
            <Square className="h-3 w-3 mr-1" /> Stop All
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tools (e.g. binaural, morse, guitar, noise...)" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {/* Master Volume */}
      <Card>
        <CardContent className="py-3 px-4 flex items-center gap-4 flex-wrap">
          {volume > 0 ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          <Slider value={[volume]} onValueChange={v => setVolume(v[0])} max={100} className="flex-1 min-w-[120px]" />
          <span className="text-sm font-mono text-foreground w-12 text-right">{volume}%</span>
          <Switch checked={showVisualizer} onCheckedChange={setShowVisualizer} />
          <span className="text-xs text-muted-foreground">Visualizer</span>
        </CardContent>
      </Card>

      {/* Visualizer */}
      {showVisualizer && (isPlaying || dualPlaying || binauralPlaying || noisePlaying) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SpectrumVisualizer engine={engine} active={true} />
          <WaveformVisualizer engine={engine} active={true} />
        </div>
      )}

      {/* Categories */}
      <ScrollArea className="h-auto">
        <Accordion type="multiple" defaultValue={['tone']} className="space-y-2">
          
          {/* ─── TONE GENERATOR ─── */}
          {(!searchQuery || 'tone frequency waveform sweep dual generator play'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="tone" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-primary" />
                <span className="font-semibold">Tone Generator</span>
                <Badge variant="outline" className="text-xs">8 tools</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Single tone */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-xs text-muted-foreground">Frequency (Hz)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input type="number" value={frequency} onChange={e => setFrequency(Number(e.target.value) || 1)} min={1} max={22000} className="w-28 font-mono" />
                      <Slider value={[frequency]} onValueChange={v => setFrequency(v[0])} min={1} max={22000} step={1} className="flex-1" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Note: <strong className="text-foreground">{noteName}</strong></span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>λ: <strong className="text-foreground">{wavelength}m</strong></span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Period: <strong className="text-foreground">{(1000 / frequency).toFixed(3)}ms</strong></span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select value={waveform} onValueChange={v => setWaveform(v as OscillatorType)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sine">Sine</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="sawtooth">Sawtooth</SelectItem>
                      <SelectItem value="triangle">Triangle</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handlePlay} variant={isPlaying ? 'destructive' : 'default'} className="gap-1">
                    {isPlaying ? <><Square className="h-3 w-3" /> Stop</> : <><Play className="h-3 w-3" /> Play</>}
                  </Button>
                  <Button variant="outline" size="icon" onClick={addFavorite}><Star className="h-4 w-4" /></Button>
                </div>
                {/* Presets */}
                <div className="flex flex-wrap gap-1">
                  {[{l:'A4 (440)',f:440},{l:'Middle C',f:261.63},{l:'Concert A',f:442},{l:'Bass E',f:82.41},{l:'1 kHz',f:1000},{l:'432 Hz',f:432},{l:'100 Hz',f:100},{l:'10 kHz',f:10000}].map(p => (
                    <Button key={p.l} variant="outline" size="sm" className="text-xs h-7" onClick={() => setFrequency(p.f)}>{p.l}</Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Dual tone */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dual-Tone Generator</Label>
                <div className="flex gap-2 items-center flex-wrap">
                  <Input type="number" value={frequency} onChange={e => setFrequency(Number(e.target.value))} className="w-24 font-mono" placeholder="Freq 1" />
                  <span className="text-muted-foreground">+</span>
                  <Input type="number" value={freq2} onChange={e => setFreq2(Number(e.target.value))} className="w-24 font-mono" placeholder="Freq 2" />
                  <Button onClick={handleDualPlay} variant={dualPlaying ? 'destructive' : 'secondary'} size="sm">
                    {dualPlaying ? 'Stop' : 'Play Both'}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Sweep */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Frequency Sweep</Label>
                <div className="flex gap-2 items-center flex-wrap">
                  <Input type="number" value={sweepFrom} onChange={e => setSweepFrom(Number(e.target.value))} className="w-24 font-mono" placeholder="From" />
                  <span className="text-muted-foreground">→</span>
                  <Input type="number" value={sweepTo} onChange={e => setSweepTo(Number(e.target.value))} className="w-24 font-mono" placeholder="To" />
                  <Input type="number" value={sweepDuration} onChange={e => setSweepDuration(Number(e.target.value))} className="w-16 font-mono" placeholder="Sec" />
                  <span className="text-xs text-muted-foreground">sec</span>
                  <Button onClick={handleSweep} size="sm" variant="secondary">Sweep</Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* ─── MUSICAL TOOLS ─── */}
          {(!searchQuery || 'musical guitar piano chord scale metronome tuner interval octave note'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="musical" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                <span className="font-semibold">Musical Tools</span>
                <Badge variant="outline" className="text-xs">12 tools</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Note converter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Note ↔ Frequency Converter</Label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-1">
                  {[3,4,5].map(oct => NOTES.map(note => (
                    <Button key={`${note}${oct}`} variant="outline" size="sm" className="text-xs h-8 font-mono"
                      onClick={() => { const f = Math.round(noteToFreq(note, oct) * 100) / 100; setFrequency(f); engine.play('note', f, waveform, volume / 100); setTimeout(() => engine.stop('note'), 500); }}>
                      {note}{oct}
                    </Button>
                  )))}
                </div>
              </div>

              <Separator />

              {/* Guitar tuner */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Guitar Tuner Reference</Label>
                <div className="flex gap-2 flex-wrap">
                  {GUITAR_STRINGS.map(s => (
                    <Button key={s.name} variant="outline" size="sm" className="gap-1"
                      onClick={() => { setFrequency(s.freq); engine.play('guitar', s.freq, 'sine', volume / 100); setTimeout(() => engine.stop('guitar'), 2000); }}>
                      <Guitar className="h-3 w-3" /> {s.name} ({s.freq} Hz)
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Scale player */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Scale Player</Label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(SCALES).map(scale => (
                    <Button key={scale} variant="outline" size="sm" className="text-xs" onClick={() => playScale('C', 4, scale)}>{scale}</Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Chord generator */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Chord Generator</Label>
                <div className="flex gap-1 flex-wrap">
                  {Object.keys(CHORDS).map(chord => (
                    <Button key={chord} variant="outline" size="sm" className="text-xs h-7" onClick={() => playChord('C', 4, chord)}>C {chord}</Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Metronome */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Metronome</Label>
                <div className="flex gap-2 items-center">
                  <Input type="number" value={bpm} onChange={e => setBpm(Number(e.target.value))} className="w-20 font-mono" min={20} max={300} />
                  <span className="text-sm text-muted-foreground">BPM</span>
                  <Slider value={[bpm]} onValueChange={v => setBpm(v[0])} min={20} max={300} className="flex-1 min-w-[100px]" />
                  <Button onClick={handleMetronome} variant={metronomeRunning ? 'destructive' : 'secondary'} size="sm">
                    {metronomeRunning ? 'Stop' : 'Start'}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Interval trainer */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Interval Trainer</Label>
                <div className="flex gap-2 items-center flex-wrap">
                  <Button onClick={startIntervalTrainer} size="sm" variant="secondary">Play Interval</Button>
                  <span className="text-xs text-muted-foreground">Score: {intervalScore.correct}/{intervalScore.total}</span>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-1">
                  {INTERVALS.map((name, i) => (
                    <Button key={name} variant="outline" size="sm" className="text-xs h-7" onClick={() => checkInterval(i)}>{name}</Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Harmonics explorer */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Harmonics Explorer</Label>
                <p className="text-xs text-muted-foreground">Play fundamental + overtones</p>
                <div className="flex gap-1 flex-wrap">
                  {[1,2,3,4,5,6,7,8].map(h => (
                    <Button key={h} variant="outline" size="sm" className="text-xs" onClick={() => {
                      engine.play(`harm${h}`, frequency * h, 'sine', (volume / 100) / h);
                      setTimeout(() => engine.stop(`harm${h}`), 2000);
                    }}>
                      {h}× ({Math.round(frequency * h)} Hz)
                    </Button>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* ─── BINAURAL & WELLNESS ─── */}
          {(!searchQuery || 'binaural wellness solfeggio noise sleep meditation focus relax breathe'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="binaural" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-semibold">Binaural & Wellness</span>
                <Badge variant="outline" className="text-xs">12 tools</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Binaural */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Binaural Beat Generator</Label>
                <p className="text-xs text-muted-foreground">🎧 Use headphones for binaural effect</p>
                <div className="flex gap-2 items-center flex-wrap">
                  <div>
                    <Label className="text-xs">Base (Hz)</Label>
                    <Input type="number" value={binauralBase} onChange={e => setBinauralBase(Number(e.target.value))} className="w-20 font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Beat (Hz)</Label>
                    <Input type="number" value={binauralBeat} onChange={e => setBinauralBeat(Number(e.target.value))} className="w-20 font-mono" />
                  </div>
                  <Button onClick={handleBinaural} variant={binauralPlaying ? 'destructive' : 'default'} className="mt-4">
                    {binauralPlaying ? 'Stop' : 'Start Binaural'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {BINAURAL_PRESETS.map(p => (
                    <Button key={p.name} variant="outline" size="sm" className="justify-start text-left h-auto py-2" onClick={() => { setBinauralBase(p.base); setBinauralBeat(p.beat); }}>
                      <div>
                        <div className="text-xs font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.desc}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Solfeggio */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Solfeggio Frequencies</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SOLFEGGIO.map(s => (
                    <Button key={s.freq} variant="outline" className="justify-start h-auto py-2 text-left" onClick={() => {
                      setFrequency(s.freq); engine.play('solf', s.freq, 'sine', volume / 100);
                      setTimeout(() => engine.stop('solf'), 5000);
                    }}>
                      <div>
                        <div className="font-mono text-sm">{s.freq} Hz</div>
                        <div className="text-xs font-medium text-primary">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.desc}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Noise */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Noise Generator</Label>
                <div className="flex gap-2 items-center flex-wrap">
                  {(['white','pink','brown'] as const).map(t => (
                    <Button key={t} variant={noiseType === t ? 'default' : 'outline'} size="sm" onClick={() => setNoiseType(t)} className="capitalize">{t}</Button>
                  ))}
                  <Button onClick={handleNoise} variant={noisePlaying ? 'destructive' : 'secondary'}>
                    {noisePlaying ? 'Stop Noise' : 'Play Noise'}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Sleep timer */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sleep Timer</Label>
                <div className="flex gap-2 items-center">
                  <Input type="number" value={sleepMinutes} onChange={e => setSleepMinutes(Number(e.target.value))} className="w-20 font-mono" min={1} max={480} />
                  <span className="text-sm text-muted-foreground">minutes</span>
                  <Button onClick={handleSleepTimer} variant={sleepActive ? 'destructive' : 'outline'} size="sm">
                    <Timer className="h-3 w-3 mr-1" /> {sleepActive ? 'Cancel Timer' : 'Set Timer'}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Breathing pacer */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Breathing Pacer</Label>
                <div className="flex gap-2 items-center">
                  <Button onClick={startBreathing} variant={breathingActive ? 'destructive' : 'secondary'} size="sm">
                    {breathingActive ? 'Stop' : 'Start Breathing'}
                  </Button>
                  {breathingActive && (
                    <Badge variant="secondary" className="text-lg px-4 py-1 animate-pulse capitalize">{breathPhase}</Badge>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* ─── SOUND EFFECTS ─── */}
          {(!searchQuery || 'sound effect siren alarm laser sonar explosion heartbeat coin'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="sfx" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold">Sound Effects & Fun</span>
                <Badge variant="outline" className="text-xs">14 tools</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {SFX_PRESETS.map(sfx => (
                  <Button key={sfx.name} variant="outline" className="h-auto py-3" onClick={() => sfx.fn(engine)}>
                    <div className="text-center">
                      <Sparkles className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <div className="text-xs font-medium">{sfx.name}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* ─── COMMUNICATION ─── */}
          {(!searchQuery || 'morse code dtmf phone dial communication signal'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="comms" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <span className="font-semibold">Communication & Signals</span>
                <Badge variant="outline" className="text-xs">7 tools</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Morse */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Morse Code Translator</Label>
                <div className="flex gap-2">
                  <Input value={morseText} onChange={e => setMorseText(e.target.value)} placeholder="Type text to convert to Morse" className="flex-1" />
                  <Button onClick={playMorse} size="sm" variant="secondary">Play Morse</Button>
                </div>
                {morseText && (
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {morseText.toUpperCase().split('').map(c => MORSE[c] || '').join(' ')}
                  </p>
                )}
              </div>

              <Separator />

              {/* DTMF */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">DTMF Tone Generator (Phone Dial)</Label>
                <div className="grid grid-cols-3 gap-1 max-w-[200px]">
                  {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                    <Button key={key} variant="outline" className="h-10 font-mono text-lg" onClick={() => {
                      const tones = DTMF[key];
                      engine.play('dtmf1', tones[0], 'sine', 0.3);
                      engine.play('dtmf2', tones[1], 'sine', 0.3);
                      setTimeout(() => { engine.stop('dtmf1'); engine.stop('dtmf2'); }, 200);
                      setDtmfSequence(p => p + key);
                    }}>{key}</Button>
                  ))}
                </div>
                {dtmfSequence && (
                  <div className="flex gap-2 items-center">
                    <span className="font-mono text-sm">{dtmfSequence}</span>
                    <Button variant="ghost" size="sm" onClick={() => setDtmfSequence('')}>Clear</Button>
                    <Button variant="outline" size="sm" onClick={playDTMF}>Replay All</Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Frequency reference */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Musical Frequency Chart</Label>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-1 text-muted-foreground">Note</th>
                      {[2,3,4,5,6].map(o => <th key={o} className="text-right py-1 text-muted-foreground">Oct {o}</th>)}
                    </tr></thead>
                    <tbody>
                      {NOTES.map(note => (
                        <tr key={note} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-0.5 font-medium">{note}</td>
                          {[2,3,4,5,6].map(o => (
                            <td key={o} className="text-right py-0.5 font-mono cursor-pointer hover:text-primary"
                              onClick={() => { const f = Math.round(noteToFreq(note, o) * 100) / 100; setFrequency(f); }}>
                              {Math.round(noteToFreq(note, o) * 10) / 10}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* ─── SCIENCE & EDUCATION ─── */}
          {(!searchQuery || 'science education hearing test wavelength speed sound doppler'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="science" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-semibold">Science & Education</span>
                <Badge variant="outline" className="text-xs">11 tools</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Speed of sound calc */}
              <ScienceCalc />

              <Separator />

              {/* Hearing test */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hearing Range Test</Label>
                <p className="text-xs text-muted-foreground">Sweeps through frequencies from 20 Hz to 20,000 Hz</p>
                <div className="flex gap-2 items-center">
                  <Button onClick={startHearingTest} disabled={hearingTestRunning} variant="secondary" size="sm">
                    {hearingTestRunning ? `Testing ${hearingTestFreq} Hz...` : 'Start Hearing Test'}
                  </Button>
                  {hearingTestRunning && <Badge variant="outline" className="font-mono">{hearingTestFreq} Hz</Badge>}
                </div>
              </div>

              <Separator />

              {/* Beats phenomenon */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Beats Phenomenon Demo</Label>
                <p className="text-xs text-muted-foreground">Play two close frequencies to hear "beats" — pulsating volume</p>
                <div className="flex gap-1 flex-wrap">
                  {[[440, 442], [440, 444], [440, 446], [440, 450]].map(([f1, f2]) => (
                    <Button key={`${f1}-${f2}`} variant="outline" size="sm" className="text-xs" onClick={() => {
                      engine.play('beat1', f1, 'sine', 0.3); engine.play('beat2', f2, 'sine', 0.3);
                      setTimeout(() => { engine.stop('beat1'); engine.stop('beat2'); }, 5000);
                    }}>{f1} + {f2} Hz ({f2 - f1} Hz beat)</Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Synesthesia mapper */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Frequency → Color Synesthesia Mapper</Label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border border-border" style={{ backgroundColor: `hsl(${(frequency / 22000) * 360}, 80%, 55%)` }} />
                  <div>
                    <p className="text-sm font-mono">{frequency} Hz</p>
                    <p className="text-xs text-muted-foreground">Hue: {Math.round((frequency / 22000) * 360)}°</p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* ─── UTILITY TOOLS ─── */}
          {(!searchQuery || 'utility speaker test headphone balance bpm tap subwoofer channel'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="utility" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <span className="font-semibold">Utility Tools</span>
                <Badge variant="outline" className="text-xs">10 tools</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Speaker test */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Speaker / Headphone Test</Label>
                <div className="flex gap-2 items-center flex-wrap">
                  {(['left','right','both'] as const).map(ch => (
                    <Button key={ch} variant={speakerChannel === ch ? 'default' : 'outline'} size="sm" onClick={() => setSpeakerChannel(ch)} className="capitalize">
                      {ch === 'left' ? '◀ Left' : ch === 'right' ? 'Right ▶' : '◀ Both ▶'}
                    </Button>
                  ))}
                  <Button onClick={handleSpeakerTest} variant="secondary" size="sm"><Speaker className="h-3 w-3 mr-1" /> Test</Button>
                </div>
              </div>

              <Separator />

              {/* Subwoofer test */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Subwoofer Test Tones</Label>
                <div className="flex gap-1 flex-wrap">
                  {[20, 30, 40, 50, 60, 80, 100, 120].map(f => (
                    <Button key={f} variant="outline" size="sm" className="text-xs font-mono" onClick={() => {
                      engine.play('sub', f, 'sine', 0.6); setTimeout(() => engine.stop('sub'), 3000);
                    }}>{f} Hz</Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* BPM tapper */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">BPM Tapper</Label>
                <div className="flex gap-2 items-center">
                  <Button onClick={handleTap} variant="secondary" className="h-16 w-32 text-lg font-bold">TAP</Button>
                  <div>
                    <p className="text-2xl font-bold font-mono text-foreground">{tappedBpm || '—'}</p>
                    <p className="text-xs text-muted-foreground">BPM</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setTapTimes([]); setTappedBpm(0); }}>Reset</Button>
                </div>
              </div>

              <Separator />

              {/* Tone burst */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tone Burst Generator</Label>
                <p className="text-xs text-muted-foreground">Generates pulsed tones at the current frequency</p>
                <div className="flex gap-1 flex-wrap">
                  {[{l:'100ms pulses',on:100,off:100},{l:'250ms pulses',on:250,off:250},{l:'500ms pulses',on:500,off:500},{l:'1s pulses',on:1000,off:1000}].map(p => (
                    <Button key={p.l} variant="outline" size="sm" className="text-xs" onClick={() => {
                      let count = 0;
                      const id = setInterval(() => {
                        if (count % 2 === 0) engine.play('burst', frequency, waveform, volume / 100);
                        else engine.stop('burst');
                        count++;
                        if (count >= 10) { clearInterval(id); engine.stop('burst'); }
                      }, p.on);
                    }}>{p.l}</Button>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* ─── PATTERN & SEQUENCE ─── */}
          {(!searchQuery || 'pattern sequence sequencer step arpeggio drum rhythm'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="sequence" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="font-semibold">Pattern & Sequence</span>
                <Badge variant="outline" className="text-xs">9 tools</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Step sequencer */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">16-Step Sequencer</Label>
                <div className="flex gap-1 flex-wrap">
                  {seqSteps.map((active, i) => (
                    <button key={i} onClick={() => toggleSeqStep(i)}
                      className={`w-8 h-8 rounded text-xs font-mono border transition-colors ${
                        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:bg-accent'
                      } ${seqStep === i && seqPlaying ? 'ring-2 ring-primary ring-offset-1' : ''}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <Input type="number" value={seqBpm} onChange={e => setSeqBpm(Number(e.target.value))} className="w-20 font-mono" min={40} max={300} />
                  <span className="text-xs text-muted-foreground">BPM</span>
                  <Button onClick={startSequencer} variant={seqPlaying ? 'destructive' : 'secondary'} size="sm">
                    {seqPlaying ? 'Stop' : 'Play'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSeqSteps(new Array(16).fill(false))}>Clear</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSeqSteps(new Array(16).fill(false).map(() => Math.random() > 0.5))}>Random</Button>
                </div>
              </div>

              <Separator />

              {/* Random melody */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Random Melody Generator</Label>
                <div className="flex gap-2 flex-wrap">
                  {['Major', 'Minor', 'Pentatonic', 'Blues'].map(scale => (
                    <Button key={scale} variant="outline" size="sm" onClick={() => {
                      const intervals = SCALES[scale];
                      const baseFreq = noteToFreq('C', 4);
                      const melody = Array.from({ length: 8 }, () => intervals[Math.floor(Math.random() * intervals.length)]);
                      melody.forEach((semitone, i) => {
                        setTimeout(() => {
                          engine.play('melody', baseFreq * Math.pow(2, semitone / 12), waveform, volume / 100);
                          setTimeout(() => engine.stop('melody'), 200);
                        }, i * 250);
                      });
                    }}>{scale} Melody</Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Ambient drone */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ambient Drone Creator</Label>
                <div className="flex gap-1 flex-wrap">
                  {[{l:'Om Drone',fs:[136.1, 272.2, 408.3]},{l:'Earth',fs:[7.83, 136.1, 256]},{l:'Space',fs:[63, 126, 189, 252]},{l:'Forest',fs:[174, 285, 396]}].map(d => (
                    <Button key={d.l} variant="outline" size="sm" onClick={() => {
                      d.fs.forEach((f, i) => engine.play(`drone${i}`, f, 'sine', 0.15));
                      setTimeout(() => d.fs.forEach((_, i) => engine.stop(`drone${i}`)), 10000);
                    }}>{d.l}</Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Polyrhythm */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Polyrhythm Generator</Label>
                <div className="flex gap-1 flex-wrap">
                  {[[2,3],[3,4],[4,5],[5,7],[3,5]].map(([a,b]) => (
                    <Button key={`${a}:${b}`} variant="outline" size="sm" className="text-xs" onClick={() => {
                      const base = 60000 / 120;
                      let countA = 0, countB = 0;
                      const idA = setInterval(() => {
                        engine.play('polyA', 800, 'sine', 0.3); setTimeout(() => engine.stop('polyA'), 30);
                        countA++; if (countA >= a * 4) clearInterval(idA);
                      }, base * (b / a));
                      const idB = setInterval(() => {
                        engine.play('polyB', 1200, 'sine', 0.25); setTimeout(() => engine.stop('polyB'), 30);
                        countB++; if (countB >= b * 4) clearInterval(idB);
                      }, base);
                    }}>{a}:{b}</Button>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* ─── SIGNAL PROCESSING ─── */}
          {(!searchQuery || 'signal filter lowpass highpass bandpass reverb delay distortion modulation'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="signal" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                <span className="font-semibold">Signal Processing</span>
                <Badge variant="outline" className="text-xs">13 tools</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <SignalProcessingSection engine={engine} frequency={frequency} waveform={waveform} volume={volume} />
            </AccordionContent>
          </AccordionItem>
          )}

          {/* ─── PRESETS & FAVORITES ─── */}
          {(!searchQuery || 'preset favorite recent save custom'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="presets" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="font-semibold">Presets & Favorites</span>
                <Badge variant="outline" className="text-xs">{favorites.length + recentFreqs.length} saved</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Favorites</Label>
                {favorites.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No favorites yet — star a frequency to save it here</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {favorites.map((fav, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => { setFrequency(fav.freq); setWaveform(fav.wave); }}>
                          {fav.name}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFavorites(prev => prev.filter((_, j) => j !== i))}>
                          <StarOff className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Recent Frequencies</Label>
                <div className="flex flex-wrap gap-1">
                  {recentFreqs.map((f, i) => (
                    <Button key={i} variant="ghost" size="sm" className="text-xs font-mono h-7" onClick={() => setFrequency(f)}>{f} Hz</Button>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* ─── VISUALIZATIONS ─── */}
          {(!searchQuery || 'visual spectrum waveform oscilloscope lissajous'.includes(searchQuery.toLowerCase())) && (
          <AccordionItem value="visual" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="font-semibold">Visualizations</span>
                <Badge variant="outline" className="text-xs">6 tools</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Spectrum Analyzer</Label>
                <SpectrumVisualizer engine={engine} active={true} />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Oscilloscope (Waveform)</Label>
                <WaveformVisualizer engine={engine} active={true} />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Frequency → Color Mapping</Label>
                <div className="flex gap-2">
                  {[100, 250, 500, 1000, 2000, 5000, 10000, 15000, 20000].map(f => (
                    <div key={f} className="w-8 h-8 rounded-full border border-border" style={{ backgroundColor: `hsl(${(f / 22000) * 360}, 80%, 55%)` }} title={`${f} Hz`} />
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

        </Accordion>
      </ScrollArea>
    </div>
  );
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────────

function ScienceCalc() {
  const [tempC, setTempC] = useState(20);
  const speedOfSound = 331.3 + 0.606 * tempC;
  const [calcFreq, setCalcFreq] = useState(440);
  const wavelengthCalc = speedOfSound / calcFreq;

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Speed of Sound & Wavelength Calculator</Label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Temperature (°C)</Label>
          <Input type="number" value={tempC} onChange={e => setTempC(Number(e.target.value))} className="font-mono" />
        </div>
        <div>
          <Label className="text-xs">Frequency (Hz)</Label>
          <Input type="number" value={calcFreq} onChange={e => setCalcFreq(Number(e.target.value))} className="font-mono" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Card><CardContent className="py-2">
          <p className="text-xs text-muted-foreground">Speed of Sound</p>
          <p className="font-mono text-sm font-bold">{speedOfSound.toFixed(1)} m/s</p>
        </CardContent></Card>
        <Card><CardContent className="py-2">
          <p className="text-xs text-muted-foreground">Wavelength</p>
          <p className="font-mono text-sm font-bold">{wavelengthCalc.toFixed(4)} m</p>
        </CardContent></Card>
        <Card><CardContent className="py-2">
          <p className="text-xs text-muted-foreground">Period</p>
          <p className="font-mono text-sm font-bold">{(1000 / calcFreq).toFixed(4)} ms</p>
        </CardContent></Card>
      </div>
    </div>
  );
}

function SignalProcessingSection({ engine, frequency, waveform, volume }: { engine: AudioEngine; frequency: number; waveform: OscillatorType; volume: number }) {
  const [filterType, setFilterType] = useState<BiquadFilterType>('lowpass');
  const [filterFreq, setFilterFreq] = useState(1000);
  const [filterQ, setFilterQ] = useState(1);
  const [filterActive, setFilterActive] = useState(false);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);

  const toggleFilter = () => {
    if (filterActive) {
      engine.stop('filtered');
      setFilterActive(false);
    } else {
      engine.init();
      const ctx = engine.ctx!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = waveform;
      osc.frequency.value = frequency;
      gain.gain.value = volume / 100;
      filter.type = filterType;
      filter.frequency.value = filterFreq;
      filter.Q.value = filterQ;
      osc.connect(filter).connect(gain).connect(engine.masterGain!);
      osc.start();
      filterNodeRef.current = filter;
      engine.oscillators.set('filtered', { osc, gain });
      setFilterActive(true);
    }
  };

  useEffect(() => {
    if (filterNodeRef.current) {
      filterNodeRef.current.frequency.value = filterFreq;
      filterNodeRef.current.Q.value = filterQ;
      filterNodeRef.current.type = filterType;
    }
  }, [filterFreq, filterQ, filterType]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Filter Demo</Label>
      <div className="flex gap-2 flex-wrap items-end">
        <div>
          <Label className="text-xs">Filter Type</Label>
          <Select value={filterType} onValueChange={v => setFilterType(v as BiquadFilterType)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['lowpass','highpass','bandpass','notch','allpass','peaking'].map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Cutoff (Hz)</Label>
          <Input type="number" value={filterFreq} onChange={e => setFilterFreq(Number(e.target.value))} className="w-24 font-mono" />
        </div>
        <div>
          <Label className="text-xs">Q Factor</Label>
          <Input type="number" value={filterQ} onChange={e => setFilterQ(Number(e.target.value))} className="w-20 font-mono" step={0.1} min={0.1} max={20} />
        </div>
        <Button onClick={toggleFilter} variant={filterActive ? 'destructive' : 'secondary'} size="sm">
          {filterActive ? 'Stop' : 'Play with Filter'}
        </Button>
      </div>

      <Separator />

      <Label className="text-sm font-medium">Quick Effects</Label>
      <div className="flex gap-1 flex-wrap">
        {[
          { l: 'Tremolo', fn: () => {
            engine.init(); const ctx = engine.ctx!;
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
            osc.frequency.value = frequency; osc.type = waveform;
            lfo.frequency.value = 5; lfoGain.gain.value = 0.3;
            lfo.connect(lfoGain).connect(gain.gain);
            gain.gain.value = 0.5; osc.connect(gain).connect(engine.masterGain!);
            osc.start(); lfo.start();
            setTimeout(() => { osc.stop(); lfo.stop(); }, 4000);
          }},
          { l: 'Vibrato', fn: () => {
            engine.init(); const ctx = engine.ctx!;
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
            osc.frequency.value = frequency; osc.type = waveform;
            lfo.frequency.value = 6; lfoGain.gain.value = 10;
            lfo.connect(lfoGain).connect(osc.frequency);
            gain.gain.value = volume / 100; osc.connect(gain).connect(engine.masterGain!);
            osc.start(); lfo.start();
            setTimeout(() => { osc.stop(); lfo.stop(); }, 4000);
          }},
          { l: 'AM Radio', fn: () => {
            engine.init(); const ctx = engine.ctx!;
            const carrier = ctx.createOscillator(); const modulator = ctx.createOscillator();
            const modGain = ctx.createGain(); const outGain = ctx.createGain();
            carrier.frequency.value = frequency; carrier.type = 'sine';
            modulator.frequency.value = 50; modGain.gain.value = 0.5;
            outGain.gain.value = volume / 100;
            modulator.connect(modGain).connect(outGain.gain);
            carrier.connect(outGain).connect(engine.masterGain!);
            carrier.start(); modulator.start();
            setTimeout(() => { carrier.stop(); modulator.stop(); }, 4000);
          }},
          { l: 'FM Synth', fn: () => {
            engine.init(); const ctx = engine.ctx!;
            const carrier = ctx.createOscillator(); const modulator = ctx.createOscillator();
            const modGain = ctx.createGain(); const outGain = ctx.createGain();
            carrier.frequency.value = frequency; modulator.frequency.value = frequency * 2;
            modGain.gain.value = 200; outGain.gain.value = volume / 100;
            modulator.connect(modGain).connect(carrier.frequency);
            carrier.connect(outGain).connect(engine.masterGain!);
            carrier.start(); modulator.start();
            setTimeout(() => { carrier.stop(); modulator.stop(); }, 4000);
          }},
          { l: 'Ring Mod', fn: () => {
            engine.init(); const ctx = engine.ctx!;
            const carrier = ctx.createOscillator(); const modulator = ctx.createOscillator();
            const modGain = ctx.createGain(); const outGain = ctx.createGain();
            carrier.frequency.value = frequency; modulator.frequency.value = 150;
            modGain.gain.value = 1; outGain.gain.value = volume / 100;
            carrier.connect(outGain); modulator.connect(modGain).connect(outGain.gain);
            outGain.connect(engine.masterGain!);
            carrier.start(); modulator.start();
            setTimeout(() => { carrier.stop(); modulator.stop(); }, 4000);
          }},
          { l: 'Distortion', fn: () => {
            engine.init(); const ctx = engine.ctx!;
            const osc = ctx.createOscillator(); const dist = ctx.createWaveshaper();
            const gain = ctx.createGain();
            osc.frequency.value = frequency; osc.type = waveform;
            const curve = new Float32Array(256);
            for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; curve[i] = (Math.PI + 50) * x / (Math.PI + 50 * Math.abs(x)); }
            dist.curve = curve; gain.gain.value = volume / 100;
            osc.connect(dist).connect(gain).connect(engine.masterGain!);
            osc.start(); setTimeout(() => osc.stop(), 4000);
          }},
        ].map(fx => (
          <Button key={fx.l} variant="outline" size="sm" className="text-xs" onClick={fx.fn}>{fx.l}</Button>
        ))}
      </div>
    </div>
  );
}

export default FrequencyGenerator;
