import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Users,
  Settings
} from 'lucide-react';

interface VideoCallInterfaceProps {
  onEndCall: () => void;
  isVideoCall?: boolean;
}

export const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({ 
  onEndCall, 
  isVideoCall = true 
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [participants, setParticipants] = useState<string[]>(['You']);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Initialize media
  useEffect(() => {
    initializeMedia();
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeMedia = async () => {
    try {
      const constraints = {
        video: isVideoCall,
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsConnected(true);
      
      toast({
        title: "Connected",
        description: `${isVideoCall ? 'Video' : 'Voice'} call initialized successfully.`
      });

    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Media Error",
        description: "Could not access camera or microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
      
      toast({
        title: isMuted ? "Microphone unmuted" : "Microphone muted",
        description: `Audio is now ${isMuted ? 'enabled' : 'disabled'}.`
      });
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
      
      toast({
        title: isVideoEnabled ? "Camera disabled" : "Camera enabled",
        description: `Video is now ${isVideoEnabled ? 'disabled' : 'enabled'}.`
      });
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    toast({
      title: "Call ended",
      description: `${isVideoCall ? 'Video' : 'Voice'} call ended successfully.`
    });
    
    onEndCall();
  };

  return (
    <div className="h-full bg-black relative overflow-hidden rounded-lg">
      {/* Video Containers */}
      <div className="h-full relative">
        {isVideoCall && (
          <>
            {/* Remote Video (main) */}
            <div className="h-full w-full bg-gray-900 flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
              {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Waiting for participants...</p>
                    <p className="text-sm opacity-75">Share the call link to invite friends</p>
                  </div>
                </div>
              )}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                  <VideoOff className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
          </>
        )}

        {/* Voice Call Interface */}
        {!isVideoCall && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-16 w-16" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Voice Call</h3>
              <p className="text-gray-300 mb-4">Connected with {participants.length} participant(s)</p>
              <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                {isMuted ? 'Muted' : 'Active'}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-4 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
          {/* Mute Toggle */}
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full w-12 h-12 p-0"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* Video Toggle (only for video calls) */}
          {isVideoCall && (
            <Button
              variant={isVideoEnabled ? "secondary" : "destructive"}
              size="lg"
              className="rounded-full w-12 h-12 p-0"
              onClick={toggleVideo}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
          )}

          {/* End Call */}
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-12 h-12 p-0 bg-red-600 hover:bg-red-700"
            onClick={endCall}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>

          {/* Settings */}
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full w-12 h-12 p-0"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Participants List */}
      <div className="absolute top-4 left-4">
        <Card className="bg-black/50 backdrop-blur-sm border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {participants.map((participant, index) => (
                <div key={index} className="text-xs text-gray-300 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {participant}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <Badge variant={isConnected ? "default" : "destructive"} className="bg-black/50 backdrop-blur-sm">
          {isConnected ? "Connected" : "Connecting..."}
        </Badge>
      </div>
    </div>
  );
};