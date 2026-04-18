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
  const [micError, setMicError] = useState<string | null>(null);

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
    setMicError(null);

    let micStream: MediaStream | null = null;

    try {
      if (navigator.permissions?.query) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (permission.state === 'denied') {
            const message = 'Microphone blocked. Enable microphone access in your browser settings.';
            setMicError(message);
            toast({ title: 'Microphone blocked', description: message, variant: 'destructive' });
            setStatus('idle');
            return;
          }
        } catch {
          // Permissions API is inconsistent across browsers; continue to getUserMedia.
        }
      }

      // Request microphone immediately inside the user gesture flow.
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = micStream;

      // Get ephemeral token after mic access is granted.
      const { data: session, error: sessionErr } = await supabase.functions.invoke('openai-realtime-token', {
        body: { voice: 'alloy' },
      });
      if (sessionErr) throw sessionErr;
      const ephemeralKey = session?.client_secret?.value;
      if (!ephemeralKey) throw new Error('No ephemeral key returned');

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Prepare audio element early and try to unlock playback for mobile browsers.
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.volume = volume;
      audioElRef.current = audioEl;
      try {
        await audioEl.play();
      } catch {
        // Expected until a remote track exists.
      }

      pc.ontrack = async (e) => {
        audioEl.srcObject = e.streams[0];
        try {
          await audioEl.play();
        } catch (err) {
          console.error('[Realtime] Remote audio playback blocked:', err);
          toast({
            title: 'Audio blocked',
            description: 'The call connected, but browser audio playback was blocked. Tap Start Call again if needed.',
            variant: 'destructive',
          });
        }
      };

      micStream.getTracks().forEach((t) => pc.addTrack(t, micStream!));

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.addEventListener('open', () => {
        console.log('[Realtime] Data channel open — requesting greeting');
        try {
          dc.send(JSON.stringify({
            type: 'response.create',
            response: {
              modalities: ['audio', 'text'],
              instructions: "Greet the user warmly in one short sentence. Say hi, mention you're CriderGPT, and ask what they need.",
            },
          }));
        } catch (err) {
          console.error('[Realtime] Failed to send greeting trigger:', err);
        }
      });
      dc.addEventListener('message', (e) => {
        try { handleEvent(JSON.parse(e.data)); } catch (err) { console.error('Bad event', err); }
      });

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

      const { data: callLog } = await supabase
        .from('call_logs')
        .insert({ user_id: user.id, start_time: new Date().toISOString(), mute_count: 0 })
        .select()
        .single();
      callIdRef.current = callLog?.id ?? null;

      muteCountRef.current = 0;
      setCallDuration(0);
      setTranscripts([]);
      timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);

      setStatus('active');
      toast({ title: '📞 Call connected', description: 'Speak naturally with CriderGPT' });
    } catch (err: any) {
      console.error('Start call failed:', err);
      const message =
        err?.name === 'NotAllowedError' ? 'Permission denied. Allow microphone access in browser settings.' :
        err?.name === 'NotFoundError' ? 'No microphone was found on this device.' :
        err?.name === 'NotReadableError' ? 'Your microphone is busy in another app.' :
        err?.message || 'Could not start call';

      setMicError(message);
      cleanup();
      setStatus('idle');
      toast({ title: 'Call failed', description: message, variant: 'destructive' });
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
    micError,
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
