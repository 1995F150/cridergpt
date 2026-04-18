import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TranscriptEntry {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export type CallStatus = 'idle' | 'connecting' | 'active' | 'ending';

export function useRealtimeCall() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [showCC, setShowCC] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callIdRef = useRef<string | null>(null);
  const muteCountRef = useRef(0);
  const currentAiTextRef = useRef('');

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (dcRef.current) { try { dcRef.current.close(); } catch {} dcRef.current = null; }
    if (pcRef.current) { try { pcRef.current.close(); } catch {} pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current.remove();
      audioElRef.current = null;
    }
  }, []);

  const handleEvent = useCallback((evt: any) => {
    switch (evt.type) {
      case 'response.audio.delta':
        setAiSpeaking(true);
        break;
      case 'response.audio.done':
      case 'response.done':
        setAiSpeaking(false);
        if (currentAiTextRef.current.trim()) {
          setTranscripts(prev => [...prev, {
            speaker: 'ai',
            text: currentAiTextRef.current.trim(),
            timestamp: new Date(),
          }]);
          currentAiTextRef.current = '';
        }
        break;
      case 'response.audio_transcript.delta':
        currentAiTextRef.current += evt.delta || '';
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (evt.transcript) {
          setTranscripts(prev => [...prev, {
            speaker: 'user',
            text: evt.transcript,
            timestamp: new Date(),
          }]);
        }
        break;
      case 'error':
        console.error('Realtime error event:', evt);
        toast({ title: 'Call error', description: evt.error?.message || 'Unknown error', variant: 'destructive' });
        break;
    }
  }, [toast]);

  const startCall = useCallback(async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to use Call Mode', variant: 'destructive' });
      return;
    }

    setStatus('connecting');
    try {
      // 1. Get ephemeral token
      const { data: session, error: sessionErr } = await supabase.functions.invoke('openai-realtime-token', {
        body: { voice: 'alloy' },
      });
      if (sessionErr) throw sessionErr;
      const ephemeralKey = session?.client_secret?.value;
      if (!ephemeralKey) throw new Error('No ephemeral key returned');

      // 2. Set up WebRTC
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Remote audio
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.volume = volume;
      audioElRef.current = audioEl;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

      // Mic
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = ms;
      ms.getTracks().forEach(t => pc.addTrack(t, ms));

      // Data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.addEventListener('message', (e) => {
        try { handleEvent(JSON.parse(e.data)); } catch (err) { console.error('Bad event', err); }
      });

      // 3. SDP offer/answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const sdpResp = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });
      if (!sdpResp.ok) throw new Error(`SDP exchange failed: ${sdpResp.status}`);
      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      // 4. Log call
      const { data: callLog } = await supabase
        .from('call_logs')
        .insert({ user_id: user.id, start_time: new Date().toISOString(), mute_count: 0 })
        .select()
        .single();
      callIdRef.current = callLog?.id ?? null;

      // 5. Timer
      muteCountRef.current = 0;
      setCallDuration(0);
      setTranscripts([]);
      timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);

      setStatus('active');
      toast({ title: '📞 Call connected', description: 'Speak naturally with CriderGPT' });
    } catch (err: any) {
      console.error('Start call failed:', err);
      cleanup();
      setStatus('idle');
      toast({ title: 'Call failed', description: err.message || 'Could not start call', variant: 'destructive' });
    }
  }, [user, volume, toast, handleEvent, cleanup]);

  const endCall = useCallback(async () => {
    setStatus('ending');
    cleanup();
    if (callIdRef.current) {
      await supabase.from('call_logs').update({
        end_time: new Date().toISOString(),
        duration_seconds: callDuration,
        mute_count: muteCountRef.current,
      }).eq('id', callIdRef.current);
      callIdRef.current = null;
    }
    setStatus('idle');
    setIsMuted(false);
    setAiSpeaking(false);
    toast({ title: 'Call ended', description: `Duration: ${formatDuration(callDuration)}` });
  }, [callDuration, cleanup, toast]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const newMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
    if (newMuted) muteCountRef.current += 1;
    setIsMuted(newMuted);
  }, [isMuted]);

  const adjustVolume = useCallback((v: number) => {
    setVolume(v);
    if (audioElRef.current) audioElRef.current.volume = v;
  }, []);

  const toggleCC = useCallback(() => setShowCC(p => !p), []);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    isCallActive: status === 'active',
    isConnecting: status === 'connecting',
    isMuted,
    aiSpeaking,
    callDuration,
    volume,
    showCC,
    transcripts,
    startCall,
    endCall,
    toggleMute,
    adjustVolume,
    toggleCC,
    formatDuration: () => formatDuration(callDuration),
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
