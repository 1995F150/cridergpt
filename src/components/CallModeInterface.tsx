import { Phone, PhoneOff, Mic, MicOff, Volume2, Video, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCallMode } from '@/hooks/useCallMode';

interface CallModeInterfaceProps {
  onClose?: () => void;
}

export function CallModeInterface({ onClose }: CallModeInterfaceProps) {
  const {
    isCallActive,
    isMuted,
    callDuration,
    volume,
    startCall,
    endCall,
    toggleMute,
    adjustVolume,
    formatDuration,
  } = useCallMode();

  if (!isCallActive) {
    return (
      <div className="flex justify-center items-center p-4">
        <Button
          onClick={startCall}
          size="lg"
          className="gap-2"
        >
          <Phone className="h-5 w-5" />
          Start Call Mode
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 space-y-6">
        {/* Call Status */}
        <div className="text-center space-y-2">
          <Badge variant="outline" className="px-4 py-2 text-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Call Active
            </div>
          </Badge>
          <div className="text-3xl font-mono font-bold">
            {formatDuration()}
          </div>
        </div>

        {/* Voice Indicator */}
        <div className="flex justify-center">
          <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            isMuted ? 'bg-muted' : 'bg-primary/10'
          }`}>
            {isMuted ? (
              <MicOff className="h-12 w-12 text-muted-foreground" />
            ) : (
              <Mic className="h-12 w-12 text-primary animate-pulse" />
            )}
          </div>
        </div>

        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              AI Voice Volume
            </label>
            <span className="text-sm text-muted-foreground">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <Slider
            value={[volume]}
            onValueChange={(values) => adjustVolume(values[0])}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Call Controls */}
        <div className="grid grid-cols-3 gap-4">
          {/* Mute/Unmute */}
          <Button
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "outline"}
            size="lg"
            className="flex-col h-auto py-4"
          >
            {isMuted ? (
              <MicOff className="h-6 w-6 mb-1" />
            ) : (
              <Mic className="h-6 w-6 mb-1" />
            )}
            <span className="text-xs">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </Button>

          {/* End Call */}
          <Button
            onClick={() => {
              endCall();
              onClose?.();
            }}
            variant="destructive"
            size="lg"
            className="flex-col h-auto py-4"
          >
            <PhoneOff className="h-6 w-6 mb-1" />
            <span className="text-xs">End Call</span>
          </Button>

          {/* Video (Inactive) */}
          <Button
            disabled
            variant="outline"
            size="lg"
            className="flex-col h-auto py-4 opacity-50"
          >
            <Video className="h-6 w-6 mb-1" />
            <span className="text-xs">Video</span>
            <Badge variant="secondary" className="mt-1 text-[10px]">Soon</Badge>
          </Button>
        </div>

        {/* Future Features */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled
              variant="ghost"
              size="sm"
              className="justify-start opacity-50"
            >
              <Monitor className="h-4 w-4 mr-2" />
              Screen Share
              <Badge variant="secondary" className="ml-auto text-[10px]">Soon</Badge>
            </Button>
            <Button
              disabled
              variant="ghost"
              size="sm"
              className="justify-start opacity-50"
            >
              <Video className="h-4 w-4 mr-2" />
              Video Call
              <Badge variant="secondary" className="ml-auto text-[10px]">Soon</Badge>
            </Button>
          </div>
        </div>

        {/* Call Instructions */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>🎙️ Speak naturally to interact with CriderGPT AI</p>
          <p>🔇 AI will pause your mic while responding</p>
        </div>
      </CardContent>
    </Card>
  );
}
