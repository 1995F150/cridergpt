import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, RotateCcw, Monitor } from 'lucide-react';

interface VideoCallInterfaceProps {
  friendId?: string;
  friendName?: string;
  onCallEnd?: () => void;
  isIncoming?: boolean;
}

export function VideoCallInterface({ 
  friendId, 
  friendName = "Friend", 
  onCallEnd,
  isIncoming = false 
}: VideoCallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const { toast } = useToast();
  const callStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout>();

  // Request camera and microphone permissions
  const requestMediaPermissions = async (): Promise<MediaStream | null> => {
    try {
      console.log('📹 Requesting video call permissions...');
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Media permissions granted');
      
      return stream;
      
    } catch (error) {
      console.error('❌ Media permission error:', error);
      
      let errorMessage = 'Failed to access camera and microphone';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera and microphone access denied. Please allow access to make video calls.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Camera or microphone not found on this device.';
        }
      }
      
      toast({
        title: "Permission Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    }
  };

  // Start video call
  const startCall = async () => {
    const stream = await requestMediaPermissions();
    if (!stream) return;

    setLocalStream(stream);
    setIsCallActive(true);
    setConnectionStatus('connecting');
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Start call duration timer
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);

    // Simulate connection establishment (replace with actual WebRTC logic)
    setTimeout(() => {
      setConnectionStatus('connected');
      toast({
        title: "Call Connected",
        description: `Video call with ${friendName} is now active`
      });
    }, 2000);

    console.log('📹 Video call started with', friendName);
  };

  // End video call
  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    
    setIsCallActive(false);
    setConnectionStatus('disconnected');
    setCallDuration(0);
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    if (onCallEnd) {
      onCallEnd();
    }

    console.log('📹 Video call ended');
    
    toast({
      title: "Call Ended",
      description: `Video call with ${friendName} has ended`
    });
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        toast({
          title: videoTrack.enabled ? "Camera On" : "Camera Off",
          description: `Camera ${videoTrack.enabled ? 'enabled' : 'disabled'}`
        });
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        toast({
          title: audioTrack.enabled ? "Microphone On" : "Microphone Off", 
          description: `Microphone ${audioTrack.enabled ? 'enabled' : 'disabled'}`
        });
      }
    }
  };

  // Switch camera (front/back)
  const switchCamera = async () => {
    if (!isCallActive) return;
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    // Stop current stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Get new stream with different camera
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: true
      });
      
      setLocalStream(newStream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      
    } catch (error) {
      console.error('❌ Error switching camera:', error);
      toast({
        title: "Camera Switch Failed",
        description: "Unable to switch camera",
        variant: "destructive"
      });
    }
  };

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [localStream]);

  return (
    <div className="space-y-4">
      {/* Call Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Call with {friendName}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className={`px-2 py-1 rounded text-xs ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
                connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {connectionStatus}
              </div>
              {isCallActive && (
                <div className="font-mono">
                  {formatDuration(callDuration)}
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Local Video (You) */}
            <div className="relative">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {isCallActive ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Your Camera</p>
                    </div>
                  </div>
                )}
                
                {/* Local video overlay */}
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  You {!isVideoEnabled && '(Camera Off)'}
                </div>
                
                {/* Camera facing indicator */}
                {isCallActive && (
                  <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    {facingMode === 'user' ? 'Front' : 'Back'}
                  </div>
                )}
              </div>
            </div>

            {/* Remote Video (Friend) */}
            <div className="relative">
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-semibold">
                          {friendName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p>{friendName}</p>
                      <p className="text-sm opacity-75">
                        {connectionStatus === 'connecting' ? 'Connecting...' : 'Waiting to connect'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Remote video overlay */}
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {friendName}
                </div>
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="flex justify-center gap-4 mt-6">
            {!isCallActive ? (
              <Button
                onClick={startCall}
                size="lg"
                className="bg-green-500 hover:bg-green-600"
              >
                <Phone className="h-5 w-5 mr-2" />
                {isIncoming ? 'Answer' : 'Start Call'}
              </Button>
            ) : (
              <>
                {/* Video toggle */}
                <Button
                  onClick={toggleVideo}
                  variant={isVideoEnabled ? "default" : "destructive"}
                  size="lg"
                >
                  {isVideoEnabled ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <VideoOff className="h-5 w-5" />
                  )}
                </Button>

                {/* Audio toggle */}
                <Button
                  onClick={toggleAudio}
                  variant={isAudioEnabled ? "default" : "destructive"}
                  size="lg"
                >
                  {isAudioEnabled ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </Button>

                {/* Switch camera */}
                <Button
                  onClick={switchCamera}
                  variant="outline"
                  size="lg"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>

                {/* End call */}
                <Button
                  onClick={endCall}
                  variant="destructive"
                  size="lg"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}