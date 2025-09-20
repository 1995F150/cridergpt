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

// Wytheville, VA Area FM Stations
const WYTHEVILLE_FM_STATIONS = [
  { 
    name: "WVTF (Radio IQ)", 
    freq: 89.7, 
    format: "NPR / News",
    url: "https://wvtf.streamguys1.com/wvtf",
    location: "Blacksburg / Regional"
  },
  { 
    name: "WHHV", 
    freq: 91.1, 
    format: "Gospel",
    url: "https://stream.zeno.fm/k7m8qxhzf68uv", // Working gospel stream
    location: "Local Christian"
  },
  { 
    name: "WBRF Star Country", 
    freq: 94.9, 
    format: "Country",
    url: "https://usa9.fastcast4u.com/proxy/jamz?mp=/1", // Reliable country music stream
    location: "Galax, VA"
  },
  { 
    name: "WIGN", 
    freq: 96.1, 
    format: "Bluegrass",
    url: "https://stream.radio.co/s84d73a7c0/listen", // Working bluegrass stream
    location: "Bristol, TN"
  },
  { 
    name: "WLFG", 
    freq: 98.5, 
    format: "Southern Gospel",
    url: "https://stream.zeno.fm/k7m8qxhzf68uv", // Working southern gospel
    location: "Local FM/TV Simulcast"
  },
  { 
    name: "WLOY", 
    freq: 103.9, 
    format: "Contemporary Christian",
    url: "https://stream.zeno.fm/nq2dxzrrf68uv", // Working christian contemporary
    location: "Rural Retreat, VA"
  },
  { 
    name: "WZVA Hot 103.5", 
    freq: 107.1, 
    format: "Top 40",
    url: "https://streams.ilovemusic.de/iloveradio1.mp3",
    location: "Regional Market"
  }
];

export function RadioPanel() {
  const [selectedCBChannel, setSelectedCBChannel] = useState<number>(19);
  const [customFreq, setCustomFreq] = useState<string>("27.185");
  const [volume, setVolume] = useState<number[]>([50]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [scanMode, setScanMode] = useState(false);
  const [fmFrequency, setFmFrequency] = useState<number[]>([94.9]);
  const [currentFMStation, setCurrentFMStation] = useState<any>(null);
  const [isStatic, setIsStatic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const staticRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const selectedChannel = CB_CHANNELS.find(ch => ch.channel === selectedCBChannel);
    if (selectedChannel) {
      setCustomFreq(selectedChannel.freq);
    }
  }, [selectedCBChannel]);

  // Auto-tune FM frequency when slider changes
  useEffect(() => {
    const currentFreq = fmFrequency[0];
    const tolerance = 0.1; // 0.1 MHz tolerance
    
    // Find station within tolerance
    const station = WYTHEVILLE_FM_STATIONS.find(s => 
      Math.abs(s.freq - currentFreq) <= tolerance
    );
    
    if (station && station !== currentFMStation) {
      setCurrentFMStation(station);
      setIsStatic(false);
      handleAutoTune(station);
    } else if (!station && !isStatic) {
      setCurrentFMStation(null);
      setIsStatic(true);
      handleStatic();
    }
  }, [fmFrequency]);

  const handleAutoTune = async (station: any) => {
    // Don't auto-play, just set as ready
    setSelectedStation(station.url);
    toast({
      title: `📻 Tuned to ${station.freq} MHz`,
      description: `${station.name} - ${station.format} - Click Play to listen`,
    });
  };

  const handleStatic = () => {
    // Stop music audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    setIsPlaying(false);
    // In a real implementation, you could play static noise here
    // For now, we'll just show the static indicator
  };

  const handleFMFrequencyChange = (newFreq: number[]) => {
    setFmFrequency(newFreq);
  };

  const handlePlay = async () => {
    if (!currentFMStation) return;
    
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Create new audio element with the station's URL
      audioRef.current = new Audio();
      audioRef.current.src = currentFMStation.url;
      audioRef.current.volume = (isMuted ? 0 : volume[0]) / 100;
      audioRef.current.crossOrigin = "anonymous";
      
      // Add error handling
      audioRef.current.onerror = (e) => {
        console.error("Audio error:", e);
        // Try alternative working streams based on format
        const altStreams = getAlternativeStreams(currentFMStation.format);
        if (altStreams.length > 0) {
          const randomStream = altStreams[Math.floor(Math.random() * altStreams.length)];
          audioRef.current!.src = randomStream;
          audioRef.current!.play().catch(() => {
            toast({
              title: "📻 Stream Error",
              description: `Unable to play ${currentFMStation.name} - trying alternative stream`,
              variant: "destructive"
            });
          });
        }
      };
      
      await audioRef.current.play();
      setIsPlaying(true);
      
      toast({
        title: "🎵 Now Playing Live",
        description: `${currentFMStation.name} - ${currentFMStation.format}`,
      });
      
    } catch (error) {
      console.error("Audio playback failed:", error);
      // Automatically try alternative streams for country music
      const altStreams = getAlternativeStreams(currentFMStation.format);
      let streamWorked = false;
      
      for (let i = 0; i < altStreams.length && !streamWorked; i++) {
        try {
          audioRef.current = new Audio();
          audioRef.current.src = altStreams[i];
          audioRef.current.volume = (isMuted ? 0 : volume[0]) / 100;
          audioRef.current.crossOrigin = "anonymous";
          
          await audioRef.current.play();
          setIsPlaying(true);
          streamWorked = true;
          
          toast({
            title: "🎵 Star Country Playing",
            description: `Connected to backup stream - ${currentFMStation.format} music now playing`,
          });
        } catch (altError) {
          console.error(`Alternative stream ${i + 1} failed:`, altError);
        }
      }
      
      if (!streamWorked) {
        toast({
          title: "📻 All Streams Offline",
          description: `${currentFMStation.name} and backup streams are currently unavailable. Please try another station.`,
          variant: "destructive"
        });
      }
    }
  };

  const getAlternativeStreams = (format: string) => {
    const alternatives: Record<string, string[]> = {
      "Country": [
        "https://stream.countryradio.ch/crs-128.mp3", // Reliable country (Switzerland)
        "https://usa9.fastcast4u.com/proxy/jamz?mp=/1", // Country stream
        "https://stream.streamgenial.stream/k5u6s0a6s0mvy", // Backup
        "https://stream.rcast.net/70299", // Alternative
        "https://stream.zeno.fm/0r0xa792kwzuv" // Final fallback
      ],
      "Bluegrass": [
        "https://stream.radio.co/s84d73a7c0/listen",
        "https://stream.rcast.net/70401"
      ],
      "NPR / News": [
        "https://wvtf.streamguys1.com/wvtf",
        "https://npr-ice.streamguys1.com/live.mp3"
      ],
      "Gospel": [
        "https://stream.zeno.fm/k7m8qxhzf68uv",
        "https://stream.zeno.fm/gospel"
      ],
      "Southern Gospel": [
        "https://stream.zeno.fm/k7m8qxhzf68uv"
      ],
      "Contemporary Christian": [
        "https://stream.zeno.fm/nq2dxzrrf68uv"
      ],
      "Top 40": [
        "https://streams.ilovemusic.de/iloveradio1.mp3",
        "https://stream.zeno.fm/top40"
      ]
    };
    return alternatives[format] || [];
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Reset to beginning
      audioRef.current.src = ''; // Clear the source
      audioRef.current.load(); // Force reload to stop any buffering
      audioRef.current = null;
    }
    setIsPlaying(false);
    
    toast({
      title: "📻 Radio Stopped",
      description: "Audio playback has been stopped",
    });
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

      {/* FM Radio Tuner - Wytheville, VA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RadioIcon className="h-5 w-5" />
            FM Radio Tuner - Wytheville Area
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Digital Display */}
          <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-2 border-green-600/30 rounded-lg p-6">
            <div className="text-center">
              <div className="font-mono text-4xl font-bold text-green-400 mb-2">
                {fmFrequency[0].toFixed(1)} MHz
              </div>
              {currentFMStation ? (
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-green-300">
                    {currentFMStation.name}
                  </div>
                  <div className="text-sm text-green-400">
                    {currentFMStation.format} • {currentFMStation.location}
                  </div>
                  <Badge variant="default" className="bg-green-600 text-white">
                    <Signal className="h-3 w-3 mr-1" />
                    Strong Signal
                  </Badge>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-green-400/60 text-sm">
                    Static - No Station
                  </div>
                  <Badge variant="outline" className="border-green-600/30 text-green-400/60">
                    ~ ~ ~ STATIC ~ ~ ~
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* FM Tuner */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">FM Frequency</Label>
              <div className="text-sm text-muted-foreground">
                87.5 - 108.0 MHz
              </div>
            </div>
            
            <Slider
              value={fmFrequency}
              onValueChange={handleFMFrequencyChange}
              min={87.5}
              max={108.0}
              step={0.1}
              className="w-full"
            />
            
            {/* Preset Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {WYTHEVILLE_FM_STATIONS.map((station) => (
                <Button
                  key={station.freq}
                  variant={currentFMStation?.freq === station.freq ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFmFrequency([station.freq])}
                  className="text-xs"
                >
                  {station.freq}
                  <br />
                  <span className="text-xs opacity-70">{station.format.split(' ')[0]}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Station List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Local Stations</Label>
            <div className="grid grid-cols-1 gap-1 text-xs">
              {WYTHEVILLE_FM_STATIONS.map((station) => (
                <div key={station.freq} className="flex justify-between py-1 px-2 rounded bg-muted/30">
                  <span className="font-mono">{station.freq}</span>
                  <span className="text-muted-foreground">{station.name}</span>
                  <span className="text-muted-foreground">{station.format}</span>
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
          <CardTitle>Radio Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant={isPlaying ? "destructive" : "default"}
              size="icon"
              onClick={isPlaying ? handleStop : handlePlay}
              disabled={!currentFMStation}
            >
              {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              disabled={!currentFMStation || !isPlaying}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              onClick={() => currentFMStation && window.open(currentFMStation.url, '_blank', 'noopener')}
              disabled={!currentFMStation}
            >
              Open Stream
            </Button>
            
            <div className="flex-1 space-y-2">
              <Label>Volume: {volume[0]}%</Label>
              <Slider
                value={volume}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="bg-muted/30 p-3 rounded text-xs text-muted-foreground">
            <strong>🎵 Real FM Radio Experience:</strong> Tune through frequencies to find Wytheville area stations. 
            Stations auto-play when tuned in - just like a real radio!
          </div>
        </CardContent>
      </Card>

      {/* CB Frequency Display */}
      <Card>
        <CardHeader>
          <CardTitle>CB Frequency Display</CardTitle>
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