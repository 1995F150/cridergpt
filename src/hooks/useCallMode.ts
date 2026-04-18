import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CallLog {
  id: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  mute_count: number;
}

export interface TranscriptEntry {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const CALL_MODE_MODEL = 'google/gemini-3-flash-preview';

export function useCallMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [muteCount, setMuteCount] = useState(0);
  const [showCC, setShowCC] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = async (event: any) => {
        const result = event.results?.[event.resultIndex];
        const transcript = result?.[0]?.transcript?.trim();

        if (!result?.isFinal || !transcript) return;

        setTranscripts(prev => [...prev, {
          speaker: 'user',
          text: transcript,
          timestamp: new Date()
        }]);

        await processVoiceInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    }
  }, []);

  // Process voice input and generate AI response
  const processVoiceInput = async (transcript: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: transcript,
          model: CALL_MODE_MODEL,
        }
      });

      if (error) throw error;
      
      // Add AI response to CC
      if (data?.response) {
        setTranscripts(prev => [...prev, {
          speaker: 'ai',
          text: data.response,
          timestamp: new Date()
        }]);
        
        // Speak the response
        speakResponse(data.response);
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
    }
  };

  // Browser SpeechSynthesis fallback
  const speakWithBrowser = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('No speechSynthesis available in this browser');
      return;
    }
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.volume = Math.max(0.01, volume);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    synthRef.current = utter;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    utter.onend = () => {
      if (recognitionRef.current && isCallActive && !isMuted) {
        try { recognitionRef.current.start(); } catch {}
      }
    };
    utter.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
    };

    window.speechSynthesis.speak(utter);
    console.log('🔊 Speaking via browser TTS:', text.substring(0, 60));
  };

  // Text-to-speech for AI responses — uses cloned voice engine when available
  const speakResponse = async (text: string) => {
    // Try cloned voice engine first (will fail if local Docker engine isn't running)
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (!error && data?.audioContent) {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }

        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.volume = volume;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (recognitionRef.current && isCallActive && !isMuted) {
            try { recognitionRef.current.start(); } catch {}
          }
        };

        try {
          await audio.play();
          return;
        } catch (playErr) {
          console.warn('Audio playback blocked, falling back to browser TTS:', playErr);
          URL.revokeObjectURL(audioUrl);
        }
      } else {
        console.warn('Cloned TTS unavailable, using browser TTS. Error:', error);
      }
    } catch (err) {
      console.warn('Cloned voice request failed, falling back to browser TTS:', err);
    }

    speakWithBrowser(text);
  };

  // Start call
  const startCall = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use Call Mode",
        variant: "destructive",
      });
      return;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Initialize audio context
      audioContextRef.current = new AudioContext();

      // Create call log
      const { data: callLog, error } = await supabase
        .from('call_logs')
        .insert({
          user_id: user.id,
          start_time: new Date().toISOString(),
          mute_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentCallId(callLog.id);
      setIsCallActive(true);
      setMuteCount(0);
      setTranscripts([]);

      // Start timer
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Initialize speech recognition
      initSpeechRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      toast({
        title: "📞 Call Started",
        description: "Speak to interact with CriderGPT AI",
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Error",
        description: "Failed to start call. Check microphone permissions.",
        variant: "destructive",
      });
    }
  }, [user, toast, initSpeechRecognition]);

  // End call
  const endCall = useCallback(async () => {
    if (!currentCallId || !user) return;

    try {
      // Stop all media
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Update call log
      await supabase
        .from('call_logs')
        .update({
          end_time: new Date().toISOString(),
          duration_seconds: callDuration,
          mute_count: muteCount
        })
        .eq('id', currentCallId);

      setIsCallActive(false);
      setCallDuration(0);
      setCurrentCallId(null);
      setMuteCount(0);
      setTranscripts([]);

      toast({
        title: "Call Ended",
        description: `Duration: ${formatDuration(callDuration)}`,
      });
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [currentCallId, user, callDuration, muteCount, toast]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (recognitionRef.current) {
      if (isMuted) {
        recognitionRef.current.start();
      } else {
        recognitionRef.current.stop();
        setMuteCount(prev => prev + 1);
      }
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }

    setIsMuted(!isMuted);
  }, [isMuted]);

  // Adjust volume
  const adjustVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (synthRef.current) {
      synthRef.current.volume = newVolume;
    }
  }, []);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCallActive) {
        endCall();
      }
    };
  }, []);

  const toggleCC = useCallback(() => {
    setShowCC(prev => !prev);
  }, []);

  return {
    isCallActive,
    isMuted,
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
