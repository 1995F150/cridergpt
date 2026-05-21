import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TranscriptEntry = { speaker: 'user' | 'ai'; text: string; timestamp: Date };

const SILENCE_MS = 900;
const RMS_THRESHOLD = 0.012;
const MIN_SPEECH_MS = 400;

export function useDIYCallMode() {
  const { toast } = useToast();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showCC, setShowCC] = useState(true);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [voice, setVoice] = useState<string>('onyx');

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechStartRef = useRef<number>(0);
  const lastVoiceAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const aiPlayingRef = useRef(false);
  const mutedRef = useRef(false);
  const activeRef = useRef(false);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const timerRef = useRef<number | null>(null);
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  useEffect(() => { mutedRef.current = isMuted; }, [isMuted]);

  const addTranscript = (e: TranscriptEntry) => setTranscripts((p) => [...p, e]);

  const blobToBase64 = (blob: Blob) => new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = (r.result as string).split(',')[1] || '';
      res(s);
    };
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

  const playNext = useCallback(() => {
    const next = audioQueueRef.current.shift();
    if (!next) {
      aiPlayingRef.current = false;
      setAiSpeaking(false);
      return;
    }
    aiPlayingRef.current = true;
    setAiSpeaking(true);
    next.volume = volume;
    next.onended = () => playNext();
    next.onerror = () => playNext();
    next.play().catch(() => playNext());
  }, [volume]);

  const speak = useCallback(async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice },
      });
      if (error || !data?.audioContent) return;
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      audioQueueRef.current.push(audio);
      if (!aiPlayingRef.current) playNext();
    } catch (e) {
      console.error('TTS failed', e);
    }
  }, [voice, playNext]);

  const handleUtterance = useCallback(async (blob: Blob) => {
    try {
      const base64 = await blobToBase64(blob);
      const { data: sttData, error: sttErr } = await supabase.functions.invoke('speech-to-text', {
        body: { audio: base64, mimeType: blob.type },
      });
      if (sttErr || !sttData?.text) return;
      const userText = sttData.text.trim();
      if (!userText) return;
      addTranscript({ speaker: 'user', text: userText, timestamp: new Date() });
      historyRef.current.push({ role: 'user', content: userText });

      const { data: chatData, error: chatErr } = await supabase.functions.invoke('chat-with-ai', {
        body: { message: userText, model: 'gpt-4o-mini' },
      });
      if (chatErr) throw chatErr;
      const aiText: string = chatData?.response || '';
      if (!aiText) return;
      addTranscript({ speaker: 'ai', text: aiText, timestamp: new Date() });
      historyRef.current.push({ role: 'assistant', content: aiText });

      // Split into sentences for streamed playback
      const sentences = aiText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [aiText];
      for (const s of sentences) {
        const t = s.trim();
        if (t) await speak(t);
      }
    } catch (e) {
      console.error('Utterance pipeline error', e);
      toast({ title: 'Call error', description: (e as Error).message, variant: 'destructive' });
    }
  }, [speak, toast]);

  const finalizeUtterance = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    const collected = chunksRef.current.slice();
    chunksRef.current = [];
    rec.stop();
  }, []);

  const startRecorderCycle = useCallback(() => {
    if (!streamRef.current || !activeRef.current) return;
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm');
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];
      if (blob.size > 2000) {
        handleUtterance(blob);
      }
      if (activeRef.current) startRecorderCycle();
    };
    recorderRef.current = rec;
    rec.start();
  }, [handleUtterance]);

  const monitorLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !activeRef.current) return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const now = performance.now();

    if (!aiPlayingRef.current && !mutedRef.current) {
      if (rms > RMS_THRESHOLD) {
        if (!isSpeakingRef.current) {
          isSpeakingRef.current = true;
          speechStartRef.current = now;
        }
        lastVoiceAtRef.current = now;
      } else if (isSpeakingRef.current) {
        if (now - lastVoiceAtRef.current > SILENCE_MS &&
            now - speechStartRef.current > MIN_SPEECH_MS) {
          isSpeakingRef.current = false;
          finalizeUtterance();
        }
      }
    }
    rafRef.current = requestAnimationFrame(monitorLoop);
  }, [finalizeUtterance]);

  const startCall = useCallback(async () => {
    if (isCallActive || isConnecting) return;
    setIsConnecting(true);
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;

      activeRef.current = true;
      setIsCallActive(true);
      setCallDuration(0);
      timerRef.current = window.setInterval(() => setCallDuration((d) => d + 1), 1000);

      startRecorderCycle();
      rafRef.current = requestAnimationFrame(monitorLoop);

      // Greeting
      const greet = "Hey, you're on call mode. What's up?";
      addTranscript({ speaker: 'ai', text: greet, timestamp: new Date() });
      historyRef.current.push({ role: 'assistant', content: greet });
      speak(greet);
    } catch (e) {
      setMicError((e as Error).message || 'Microphone error');
      activeRef.current = false;
      setIsCallActive(false);
    } finally {
      setIsConnecting(false);
    }
  }, [isCallActive, isConnecting, monitorLoop, startRecorderCycle, speak]);

  const endCall = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch (_) {}
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioQueueRef.current.forEach((a) => { try { a.pause(); } catch (_) {} });
    audioQueueRef.current = [];
    aiPlayingRef.current = false;
    setAiSpeaking(false);
    setIsCallActive(false);
  }, []);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);
  const adjustVolume = useCallback((v: number) => setVolume(v), []);
  const toggleCC = useCallback(() => setShowCC((s) => !s), []);

  const formatDuration = useCallback(() => {
    const m = Math.floor(callDuration / 60).toString().padStart(2, '0');
    const s = (callDuration % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [callDuration]);

  useEffect(() => () => endCall(), [endCall]);

  return {
    isCallActive, isConnecting, isMuted, aiSpeaking, callDuration, volume, showCC,
    transcripts, micError, voice, setVoice,
    startCall, endCall, toggleMute, adjustVolume, toggleCC, formatDuration,
  };
}
