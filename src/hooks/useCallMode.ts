import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CallLog {
  id: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  mute_count: number;
}

export interface TranscriptEntry {
  speaker: "user" | "ai";
  text: string;
  timestamp: Date;
}

type RealtimeServerEvent = {
  type?: string;
  [key: string]: unknown;
};

const REALTIME_MODEL = "gpt-realtime";
const REALTIME_VOICE = "marin";

export function useCallMode() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [showCC, setShowCC] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [muteCount, setMuteCount] = useState(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const connectedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [clearTimer]);

  const formatDurationValue = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const appendTranscript = useCallback((speaker: "user" | "ai", text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setTranscripts((prev) => [
      ...prev,
      {
        speaker,
        text: trimmed,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const setRemoteAudioVolume = useCallback((nextVolume: number) => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = nextVolume;
    }
  }, []);

  const sendClientEvent = useCallback((event: Record<string, unknown>) => {
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== "open") return false;

    dc.send(JSON.stringify(event));
    return true;
  }, []);

  const cleanupMedia = useCallback(() => {
    try {
      if (dataChannelRef.current) {
        dataChannelRef.current.onopen = null;
        dataChannelRef.current.onclose = null;
        dataChannelRef.current.onerror = null;
        dataChannelRef.current.onmessage = null;
        if (dataChannelRef.current.readyState !== "closed") {
          dataChannelRef.current.close();
        }
      }
    } catch (err) {
      console.warn("Error closing data channel:", err);
    }
    dataChannelRef.current = null;

    try {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.onicegatheringstatechange = null;
        peerConnectionRef.current.onsignalingstatechange = null;
        peerConnectionRef.current.close();
      }
    } catch (err) {
      console.warn("Error closing peer connection:", err);
    }
    peerConnectionRef.current = null;

    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.warn("Error stopping local tracks:", err);
    }
    localStreamRef.current = null;

    try {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      }
    } catch (err) {
      console.warn("Error cleaning remote audio:", err);
    }
    remoteAudioRef.current = null;

    connectedRef.current = false;
    setAiSpeaking(false);
    clearTimer();
  }, [clearTimer]);

  const endCall = useCallback(async () => {
    const durationAtEnd = callDuration;
    const callId = currentCallId;
    const totalMutes = muteCount;

    cleanupMedia();

    setIsCallActive(false);
    setIsConnecting(false);
    setIsMuted(false);
    setMicError(null);
    setCurrentCallId(null);
    setCallDuration(0);
    setMuteCount(0);

    if (callId) {
      try {
        await supabase
          .from("call_logs")
          .update({
            end_time: new Date().toISOString(),
            duration_seconds: durationAtEnd,
            mute_count: totalMutes,
          })
          .eq("id", callId);
      } catch (err) {
        console.error("Failed to update call log:", err);
      }
    }

    toast({
      title: "Call Ended",
      description: `Duration: ${formatDurationValue(durationAtEnd)}`,
    });
  }, [callDuration, cleanupMedia, currentCallId, formatDurationValue, muteCount, toast]);

  const handleServerEvent = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as RealtimeServerEvent;
        const type = typeof msg.type === "string" ? msg.type : "";

        console.log("[realtime event]", type, msg);

        switch (type) {
          case "input_audio_buffer.speech_started":
            setAiSpeaking(false);
            break;

          case "response.audio.delta":
            setAiSpeaking(true);
            break;

          case "response.audio.done":
            setAiSpeaking(false);
            break;

          case "conversation.item.input_audio_transcription.completed": {
            const transcript =
              typeof (msg as { transcript?: unknown }).transcript === "string"
                ? ((msg as { transcript: string }).transcript ?? "")
                : "";

            if (transcript.trim()) {
              appendTranscript("user", transcript);
            }
            break;
          }

          case "response.done": {
            setAiSpeaking(false);

            const response = (
              msg as {
                response?: {
                  output?: Array<{ content?: Array<{ type?: string; transcript?: string; text?: string }> }>;
                };
              }
            ).response;
            const output = Array.isArray(response?.output) ? response.output : [];

            for (const item of output) {
              const content = Array.isArray(item?.content) ? item.content : [];
              for (const part of content) {
                if (part?.type === "audio_transcript" && typeof part?.transcript === "string") {
                  appendTranscript("ai", part.transcript);
                } else if (part?.type === "text" && typeof part?.text === "string") {
                  appendTranscript("ai", part.text);
                }
              }
            }
            break;
          }

          case "error": {
            const errorObj = msg as { error?: { message?: string } };
            const errorMessage = errorObj.error?.message || "Realtime session error";

            console.error("[realtime error]", msg);
            setMicError(errorMessage);

            toast({
              title: "Call Error",
              description: errorMessage,
              variant: "destructive",
            });
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error("Failed to parse realtime event:", err);
      }
    },
    [appendTranscript, toast],
  );

  const startCall = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use Call Mode.",
        variant: "destructive",
      });
      return;
    }

    if (isConnecting || isCallActive) return;

    setIsConnecting(true);
    setMicError(null);
    setTranscripts([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;

      const remoteAudio = document.createElement("audio");
      remoteAudio.autoplay = true;
      remoteAudio.volume = volume;
      remoteAudioRef.current = remoteAudio;

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;

        remoteAudio.srcObject = remoteStream;
        remoteAudio.play().catch((err) => {
          console.warn("Remote audio autoplay issue:", err);
        });
      };

      pc.onconnectionstatechange = () => {
        console.log("pc.connectionState:", pc.connectionState);

        if (pc.connectionState === "connected" && !connectedRef.current) {
          connectedRef.current = true;
          setIsConnecting(false);
          setIsCallActive(true);
          startTimer();

          toast({
            title: "📞 Call Started",
            description: "CriderGPT is live.",
          });
        }

        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          if (connectedRef.current) {
            void endCall();
          } else {
            cleanupMedia();
            setIsConnecting(false);
            setIsCallActive(false);
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("pc.iceConnectionState:", pc.iceConnectionState);
      };

      pc.onicegatheringstatechange = () => {
        console.log("pc.iceGatheringState:", pc.iceGatheringState);
      };

      pc.onsignalingstatechange = () => {
        console.log("pc.signalingState:", pc.signalingState);
      };

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        console.log("data channel open");

        sendClientEvent({
          type: "response.create",
          response: {
            output_modalities: ["audio", "text"],
          },
        });
      };

      dc.onclose = () => {
        console.log("data channel closed");
      };

      dc.onerror = (err) => {
        console.error("data channel error", err);
      };

      dc.onmessage = handleServerEvent;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const { data: sessionData, error: sessionError } = await supabase.functions.invoke("realtime-token", {
        body: {
          model: REALTIME_MODEL,
          voice: REALTIME_VOICE,
        },
      });

      if (sessionError) {
        throw new Error(sessionError.message || "Failed to create realtime session");
      }

      const ephemeralKey = sessionData?.client_secret?.value;
      if (!ephemeralKey) {
        throw new Error("Missing ephemeral client secret from realtime-token");
      }

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`,
        {
          method: "POST",
          body: offer.sdp ?? "",
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
        },
      );

      if (!sdpResponse.ok) {
        const detail = await sdpResponse.text().catch(() => "");
        throw new Error(`SDP exchange failed (${sdpResponse.status}): ${detail}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      const { data: callLog, error: callLogError } = await supabase
        .from("call_logs")
        .insert({
          user_id: user.id,
          start_time: new Date().toISOString(),
          mute_count: 0,
        })
        .select()
        .single<CallLog>();

      if (!callLogError && callLog?.id) {
        setCurrentCallId(callLog.id);
      }
    } catch (error) {
      console.error("Error starting realtime call:", error);

      cleanupMedia();
      setIsConnecting(false);
      setIsCallActive(false);

      const description =
        error instanceof Error ? error.message : "Failed to start call. Check mic permissions and realtime setup.";

      setMicError(description);

      toast({
        title: "Call Failed",
        description,
        variant: "destructive",
      });
    }
  }, [
    cleanupMedia,
    endCall,
    handleServerEvent,
    isCallActive,
    isConnecting,
    sendClientEvent,
    startTimer,
    toast,
    user,
    volume,
  ]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextMuted = !isMuted;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    if (nextMuted) {
      setMuteCount((prev) => prev + 1);
    }

    setIsMuted(nextMuted);
  }, [isMuted]);

  const adjustVolume = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      setRemoteAudioVolume(newVolume);
    },
    [setRemoteAudioVolume],
  );

  const toggleCC = useCallback(() => {
    setShowCC((prev) => !prev);
  }, []);

  const formatDuration = useCallback(() => {
    return formatDurationValue(callDuration);
  }, [callDuration, formatDurationValue]);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [cleanupMedia]);

  return {
    isCallActive,
    isConnecting,
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
    formatDuration,
  };
}

export const useRealtimeCall = useCallMode;
