import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CallTurn, type CallCaption } from '@/lib/call-turn';
import { NativeVoiceTransport, loadVoiceCatalog, type VoiceOption } from '@/lib/native-voice';

async function invokeBackend(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error || data?.error) throw new Error('Backend voice request failed. Refresh voices or retry.');
  return data ?? {};
}

export type TranscriptEntry = CallCaption;
const SILENCE_MS = 900;
const RMS_THRESHOLD = 0.012;
const MIN_SPEECH_MS = 400;
const MAX_UTTERANCE_MS = 20000;

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
  const [voice, setVoice] = useState('');
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const catalogEpoch = useRef(0);
  const [callModel, setCallModel] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);
  const connectingRef = useRef(false);
  const generationRef = useRef(0);
  const mutedRef = useRef(false);
  const volumeRef = useRef(volume);
  const voiceRef = useRef(voice);
  const modelRef = useRef('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const finishPlaybackRef = useRef<(() => void) | null>(null);
  const turnRef = useRef<CallTurn | null>(null);
  const voiceTransportRef = useRef<NativeVoiceTransport | null>(null);
  const speakStartRef = useRef(0);
  const lastVoiceRef = useRef(0);
  const cycleStartRef = useRef(0);
  const restartRef = useRef<() => void>(() => {});
  volumeRef.current = volume;
  voiceRef.current = voice;

  if (!voiceTransportRef.current) voiceTransportRef.current = new NativeVoiceTransport(invokeBackend);
  if (!turnRef.current) {
    turnRef.current = new CallTurn((name, body) => voiceTransportRef.current!.request(name, body), entry => setTranscripts(previous => [...previous, entry]), async (content, mime = 'audio/mpeg') => {
      if (!activeRef.current) return;
      const audio = new Audio(`data:${mime === 'audio/wav' ? 'audio/wav' : 'audio/mpeg'};base64,${content}`);
      audioRef.current = audio;
      audio.volume = volumeRef.current;
      setAiSpeaking(true);
      try {
        await new Promise<void>((resolve, reject) => {
          finishPlaybackRef.current = resolve;
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('Audio playback failed. Your answer remains in the captions.'));
          audio.play().catch(() => reject(new Error('Browser blocked audio. Please restart the call and allow playback.')));
        });
      } finally {
        audio.pause();
        audio.onended = null;
        audio.onerror = null;
        if (audioRef.current === audio) {
          audioRef.current = null;
          finishPlaybackRef.current = null;
          setAiSpeaking(false);
        }
      }
    }, 60000, () => voiceTransportRef.current?.cancel());
  }

  const refreshVoices = useCallback(async () => {
    const epoch = ++catalogEpoch.current;
    setVoicesLoading(true); setVoiceError(null);
    try {
      const catalog = await loadVoiceCatalog(invokeBackend);
      if (catalogEpoch.current !== epoch) return;
      setVoices(catalog);
      setVoice(previous => previous || catalog[0]?.id || '');
      if (!catalog.length) setVoiceError('No local voices are available on the backend.');
    } catch {
      if (catalogEpoch.current === epoch) { setVoices([]); setVoiceError('Backend voices unavailable. Refresh after the audio gateway is enabled.'); }
    } finally { if (catalogEpoch.current === epoch) setVoicesLoading(false); }
  }, []);
  useEffect(() => { const counter = catalogEpoch; void refreshVoices(); return () => { counter.current++; }; }, [refreshVoices]);

  const endCall = useCallback(() => {
    activeRef.current = false;
    connectingRef.current = false;
    generationRef.current++;
    turnRef.current?.stop();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (timerRef.current !== null) clearInterval(timerRef.current);
    rafRef.current = null;
    timerRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    finishPlaybackRef.current?.();
    finishPlaybackRef.current = null;
    setAiSpeaking(false);
    setIsCallActive(false);
    setIsConnecting(false);
  }, []);

  const startRecorderCycle = useCallback(() => {
    if (!streamRef.current || !activeRef.current || turnRef.current?.processing) return;
    const epoch = generationRef.current;
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mime) { setMicError('This browser does not support call recording.'); endCall(); return; }
    const recorder = new MediaRecorder(streamRef.current, { mimeType: mime });
    const chunks: Blob[] = [];
    const deadline = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, MAX_UTTERANCE_MS);
    let hadSpeech = false;
    cycleStartRef.current = performance.now();
    speakStartRef.current = 0;
    lastVoiceRef.current = 0;
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => {
      clearTimeout(deadline);
      if (activeRef.current && epoch === generationRef.current) {
        endCall();
        setMicError('Microphone recording failed. Check the device and restart the call.');
      }
    };
    recorder.onstop = async () => {
      clearTimeout(deadline);
      hadSpeech = speakStartRef.current > 0;
      if (!activeRef.current || epoch !== generationRef.current) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || mime });
      try {
        if (hadSpeech && blob.size > 2 * 1024 * 1024) throw new Error('The recording is too large. Please try a shorter utterance.');
        if (hadSpeech && !mutedRef.current && blob.size > 0 && blob.size <= 2 * 1024 * 1024) {
          const audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
            reader.onerror = () => reject(new Error('Could not read microphone audio.'));
            reader.readAsDataURL(blob);
          });
          if (activeRef.current && epoch === generationRef.current) {
            setMicError(null);
            await turnRef.current?.run(audio, blob.type, modelRef.current, voiceRef.current);
          }
        }
      } catch (error) {
        if (activeRef.current && epoch === generationRef.current) {
          audioRef.current?.pause();
          finishPlaybackRef.current?.();
          const message = error instanceof Error ? error.message : 'Voice turn failed. Please retry.';
          setMicError(message);
          toast({ title: 'Call error', description: message, variant: 'destructive' });
        }
      } finally {
        if (activeRef.current && epoch === generationRef.current) restartRef.current();
      }
    };
    recorderRef.current = recorder;
    recorder.start();
  }, [endCall, toast]);
  restartRef.current = startRecorderCycle;

  const monitorLoop = useCallback(function monitor() {
    const analyser = analyserRef.current;
    if (!analyser || !activeRef.current) return;
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      const buffer = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buffer);
      const rms = Math.sqrt(buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length);
      const now = performance.now();
      if (!mutedRef.current && rms > RMS_THRESHOLD) {
        if (!speakStartRef.current) speakStartRef.current = now;
        lastVoiceRef.current = now;
      }
      const ended = speakStartRef.current > 0 && now - lastVoiceRef.current > SILENCE_MS && now - speakStartRef.current > MIN_SPEECH_MS;
      if (ended || now - cycleStartRef.current >= MAX_UTTERANCE_MS) recorder.stop();
    }
    rafRef.current = requestAnimationFrame(monitor);
  }, []);

  const startCall = useCallback(async () => {
    if (activeRef.current || connectingRef.current) return;
    connectingRef.current = true;
    const epoch = ++generationRef.current;
    setIsConnecting(true);
    setMicError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Calls require HTTPS and a browser with microphone recording support.');
      const { data: { session } } = await supabase.auth.getSession();
      if (epoch !== generationRef.current) return;
      if (!session) throw new Error('Sign in before starting a call.');
      const available = await loadVoiceCatalog(invokeBackend);
      if (epoch !== generationRef.current) return;
      if (!available.some(option => option.id === voiceRef.current)) throw new Error('The selected backend voice is unavailable. Refresh voices and select one.');
      const model = localStorage.getItem('crider-gpt-selected-model') || 'cridergpt-5.0';
      modelRef.current = model;
      setCallModel(model);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (epoch !== generationRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      stream.getAudioTracks().forEach(track => { track.enabled = !mutedRef.current; });
      const context = new AudioContext();
      audioCtxRef.current = context;
      await context.resume();
      if (epoch !== generationRef.current) return;
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
      activeRef.current = true;
      turnRef.current?.start();
      setTranscripts([]);
      setIsCallActive(true);
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration(duration => duration + 1), 1000);
      restartRef.current();
      rafRef.current = requestAnimationFrame(monitorLoop);
    } catch (error) {
      if (epoch === generationRef.current) {
        endCall();
        setMicError(error instanceof Error ? error.message : 'Microphone error');
      }
    } finally {
      if (epoch === generationRef.current) { connectingRef.current = false; setIsConnecting(false); }
    }
  }, [endCall, monitorLoop]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setIsMuted(mutedRef.current);
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !mutedRef.current; });
    speakStartRef.current = 0;
    lastVoiceRef.current = 0;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);
  const adjustVolume = useCallback((value: number) => {
    const bounded = Math.max(0, Math.min(1, value));
    volumeRef.current = bounded;
    setVolume(bounded);
    if (audioRef.current) audioRef.current.volume = bounded;
  }, []);
  const toggleCC = useCallback(() => setShowCC(previous => !previous), []);
  const formatDuration = useCallback(() => `${Math.floor(callDuration / 60).toString().padStart(2, '0')}:${(callDuration % 60).toString().padStart(2, '0')}`, [callDuration]);
  useEffect(() => () => endCall(), [endCall]);
  return { isCallActive, isConnecting, isMuted, aiSpeaking, callDuration, volume, showCC,
    transcripts, micError, voice, setVoice, voices, voicesLoading, voiceError, refreshVoices, callModel, startCall, endCall, toggleMute, adjustVolume, toggleCC, formatDuration };
}
