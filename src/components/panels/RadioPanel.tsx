import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioIcon, Volume2, VolumeX, Play, Square, Signal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CB_CHANNELS = [
  { channel: 1, freq: "26.965" },
  { channel: 2, freq: "26.975" },
  { channel: 3, freq: "26.985" },
  { channel: 4, freq: "27.005" },
  { channel: 5, freq: "27.015" },
  { channel: 6, freq: "27.025" },
  { channel: 7, freq: "27.035" },
  { channel: 8, freq: "27.055" },
  { channel: 9, freq: "27.065" }, // Emergency channel
  { channel: 10, freq: "27.075" },
  { channel: 11, freq: "27.085" },
  { channel: 12, freq: "27.105" },
  { channel: 13, freq: "27.115" },
  { channel: 14, freq: "27.125" },
  { channel: 15, freq: "27.135" },
  { channel: 16, freq: "27.155" },
  { channel: 17, freq: "27.165" },
  { channel: 18, freq: "27.175" },
  { channel: 19, freq: "27.185" }, // Trucker channel
  { channel: 20, freq: "27.205" },
  { channel: 21, freq: "27.215" },
  { channel: 22, freq: "27.225" },
  { channel: 23, freq: "27.255" },
  { channel: 24, freq: "27.235" },
  { channel: 25, freq: "27.245" },
  { channel: 26, freq: "27.265" },
  { channel: 27, freq: "27.275" },
  { channel: 28, freq: "27.285" },
  { channel: 29, freq: "27.295" },
  { channel: 30, freq: "27.305" },
  { channel: 31, freq: "27.315" },
  { channel: 32, freq: "27.325" },
  { channel: 33, freq: "27.335" },
  { channel: 34, freq: "27.345" },
  { channel: 35, freq: "27.355" },
  { channel: 36, freq: "27.365" },
  { channel: 37, freq: "27.375" },
  { channel: 38, freq: "27.385" },
  { channel: 39, freq: "27.395" },
  { channel: 40, freq: "27.405" }
];

const RADIO_STATIONS = [
  { name: "Classic Rock Radio", url: "https://streams.ilovemusic.de/iloveradio3.mp3", freq: "101.5" },
  { name: "Country Music", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/KCMOFM.mp3", freq: "103.3" },
  { name: "News Talk Radio", url: "https://stream.revma.ihrhls.com/zc181", freq: "105.7" },
  { name: "Jazz Smooth", url: "https://jazz-wr04.ice.infomaniak.ch/jazz-wr04-128.mp3", freq: "107.1" },
  { name: "Electronic Dance", url: "https://streams.ilovemusic.de/iloveradio2.mp3", freq: "95.5" }
];

export function RadioPanel() {
  const [selectedCBChannel, setSelectedCBChannel] = useState<number>(19);
  const [customFreq, setCustomFreq] = useState<string>("27.185");
  const [volume, setVolume] = useState<number[]>([50]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [scanMode, setScanMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const selectedChannel = CB_CHANNELS.find(ch => ch.channel === selectedCBChannel);
    if (selectedChannel) {
      setCustomFreq(selectedChannel.freq);
    }
  }, [selectedCBChannel]);

  const handlePlayStation = async (stationUrl: string, stationName: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(stationUrl);
      audioRef.current.volume = volume[0] / 100;
      audioRef.current.crossOrigin = "anonymous";
      
      await audioRef.current.play();
      setIsPlaying(true);
      
      toast({
        title: "Now Playing",
        description: `Tuned to ${stationName}`,
      });
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to radio stream",
        variant: "destructive"
      });
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume[0] / 100;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const startCBScan = () => {
    setScanMode(!scanMode);
    if (!scanMode) {
      toast({
        title: "CB Scanner Active",
        description: "Scanning CB channels for activity...",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <RadioIcon className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Radio & CB Scanner</h2>
        <Badge variant="outline" className="ml-auto">
          <Signal className="h-3 w-3 mr-1" />
          Online
        </Badge>
      </div>

      {/* CB Radio Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RadioIcon className="h-5 w-5" />
            CB Radio Channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cb-channel">CB Channel</Label>
              <Select value={selectedCBChannel.toString()} onValueChange={(value) => setSelectedCBChannel(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select CB Channel" />
                </SelectTrigger>
                <SelectContent>
                  {CB_CHANNELS.map((channel) => (
                    <SelectItem key={channel.channel} value={channel.channel.toString()}>
                      Ch {channel.channel} - {channel.freq} MHz
                      {channel.channel === 9 && " (Emergency)"}
                      {channel.channel === 19 && " (Truckers)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency (MHz)</Label>
              <Input
                id="frequency"
                value={customFreq}
                onChange={(e) => setCustomFreq(e.target.value)}
                placeholder="27.185"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={startCBScan} 
              variant={scanMode ? "destructive" : "outline"}
              className="flex-1"
            >
              {scanMode ? "Stop Scan" : "Start CB Scan"}
            </Button>
            <Button variant="outline" disabled>
              Listen CB Ch {selectedCBChannel}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
            <strong>Note:</strong> CB radio listening requires specialized hardware. This interface simulates CB channel selection and frequency tuning.
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* FM/AM Radio Section */}
      <Card>
        <CardHeader>
          <CardTitle>Internet Radio Stations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Station</Label>
            <div className="grid grid-cols-1 gap-2">
              {RADIO_STATIONS.map((station, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{station.name}</div>
                    <div className="text-sm text-muted-foreground">{station.freq} FM</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePlayStation(station.url, station.name)}
                    disabled={isPlaying}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Tune In
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Audio Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant={isPlaying ? "destructive" : "outline"}
              onClick={isPlaying ? handleStop : () => {}}
              disabled={!isPlaying}
            >
              {isPlaying ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              disabled={!isPlaying}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Volume: {volume[0]}%</Label>
            <Slider
              value={volume}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Frequency Scanner Display */}
      <Card>
        <CardHeader>
          <CardTitle>Frequency Display</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 font-mono text-2xl p-4 rounded text-center">
            {customFreq} MHz
          </div>
          <div className="text-center text-sm text-muted-foreground mt-2">
            CB Band: 26.965 - 27.405 MHz
          </div>
        </CardContent>
      </Card>
    </div>
  );
}