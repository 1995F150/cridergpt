import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Music, Mic2, Wand2, Drum, Play, Pause, Download, Trash2, Upload, Loader2, ListMusic } from "lucide-react";

interface MusicTrack {
  id: string;
  title: string;
  track_type: string;
  prompt: string | null;
  genre: string | null;
  mood: string | null;
  bpm: number | null;
  duration_seconds: number | null;
  audio_url: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

const GENRES = ["Pop", "Rock", "Hip Hop", "Country", "Electronic", "Jazz", "Classical", "R&B", "Folk", "Blues", "Metal", "Ambient"];
const MOODS = ["Energetic", "Chill", "Dark", "Happy", "Melancholic", "Aggressive", "Dreamy", "Upbeat", "Emotional", "Epic"];

export function MusicStudio() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate tab state
  const [genPrompt, setGenPrompt] = useState("");
  const [genGenre, setGenGenre] = useState("");
  const [genMood, setGenMood] = useState("");
  const [genDuration, setGenDuration] = useState([15]);
  const [genTitle, setGenTitle] = useState("");

  // Beat tab state
  const [beatGenre, setBeatGenre] = useState("Hip Hop");
  const [beatBpm, setBeatBpm] = useState([120]);
  const [beatMood, setBeatMood] = useState("Energetic");
  const [beatDuration, setBeatDuration] = useState([15]);
  const [beatTitle, setBeatTitle] = useState("");

  // Cover tab state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverTitle, setCoverTitle] = useState("");

  // Hum tab state
  const [humFile, setHumFile] = useState<File | null>(null);
  const [humGenre, setHumGenre] = useState("Pop");
  const [humMood, setHumMood] = useState("Upbeat");
  const [humTitle, setHumTitle] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    const { data } = await (supabase as any)
      .from("music_tracks")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTracks(data);
  };

  const generateMusic = async (action: string, payload: Record<string, unknown>) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-music", {
        body: { action, ...payload },
      });

      if (error) throw error;

      toast({ title: "Track generated!", description: `Your ${action} track is ready.` });
      fetchTracks();
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message || "Could not reach the music engine. Is your GPU server running?",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (!genPrompt.trim()) {
      toast({ title: "Enter a prompt", description: "Describe the song you want to create.", variant: "destructive" });
      return;
    }
    generateMusic("generate", {
      prompt: genPrompt,
      genre: genGenre,
      mood: genMood,
      duration: genDuration[0],
      title: genTitle || "AI Generated Track",
    });
  };

  const handleBeat = () => {
    generateMusic("beat", {
      genre: beatGenre,
      bpm: beatBpm[0],
      mood: beatMood,
      duration: beatDuration[0],
      title: beatTitle || `${beatGenre} Beat`,
    });
  };

  const handleCover = () => {
    if (!coverFile) {
      toast({ title: "Upload a song", description: "Select an audio file to create a cover.", variant: "destructive" });
      return;
    }
    // For file-based actions, we'd need FormData — simplified for now
    generateMusic("cover", {
      title: coverTitle || "Voice Cover",
    });
  };

  const handleHum = () => {
    if (!humFile) {
      toast({ title: "Record or upload", description: "Provide a hummed melody first.", variant: "destructive" });
      return;
    }
    generateMusic("hum", {
      genre: humGenre,
      mood: humMood,
      title: humTitle || "Hum-to-Song",
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setHumFile(new File([blob], "humming.webm", { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast({ title: "Mic access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const togglePlay = (track: MusicTrack) => {
    if (!track.audio_url) return;

    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(track.audio_url);
      audio.onended = () => setPlayingTrackId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingTrackId(track.id);
    }
  };

  const deleteTrack = async (id: string) => {
    await (supabase as any).from("music_tracks").delete().eq("id", id);
    if (playingTrackId === id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    }
    setTracks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Track deleted" });
  };

  const typeLabel = (t: string) =>
    ({ generate: "AI Song", cover: "Cover", hum: "Hum-to-Song", beat: "Beat" }[t] || t);

  const typeBadgeColor = (t: string) =>
    ({ generate: "default", cover: "secondary", hum: "outline", beat: "destructive" }[t] || "default") as any;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="generate" className="text-xs gap-1">
            <Wand2 className="h-3.5 w-3.5" /> Generate
          </TabsTrigger>
          <TabsTrigger value="cover" className="text-xs gap-1">
            <Mic2 className="h-3.5 w-3.5" /> Cover
          </TabsTrigger>
          <TabsTrigger value="hum" className="text-xs gap-1">
            <Music className="h-3.5 w-3.5" /> Hum
          </TabsTrigger>
          <TabsTrigger value="beat" className="text-xs gap-1">
            <Drum className="h-3.5 w-3.5" /> Beat
          </TabsTrigger>
          <TabsTrigger value="tracks" className="text-xs gap-1">
            <ListMusic className="h-3.5 w-3.5" /> Tracks
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="mt-4 space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                AI Song Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  placeholder="My awesome track"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Describe your song *</Label>
                <Textarea
                  placeholder="A chill country song about driving down a dirt road at sunset..."
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Genre</Label>
                  <Select value={genGenre} onValueChange={setGenGenre}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Any genre" /></SelectTrigger>
                    <SelectContent>
                      {GENRES.map((g) => <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Mood</Label>
                  <Select value={genMood} onValueChange={setGenMood}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Any mood" /></SelectTrigger>
                    <SelectContent>
                      {MOODS.map((m) => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Duration: {genDuration[0]}s</Label>
                <Slider value={genDuration} onValueChange={setGenDuration} min={5} max={30} step={5} className="mt-2" />
              </div>
              <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</> : "Generate Song"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cover Tab */}
        <TabsContent value="cover" className="mt-4 space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mic2 className="h-4 w-4 text-primary" />
                Voice-Swap Covers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Upload a song and we'll re-sing the vocals with your cloned voice. Uses Demucs for stem separation + XTTS-v2 for voice cloning.
              </p>
              <div>
                <Label className="text-xs">Title</Label>
                <Input placeholder="My Cover" value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Upload Song</Label>
                <div className="mt-1 border border-dashed border-border rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label htmlFor="cover-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {coverFile ? coverFile.name : "Click to upload an audio file"}
                    </span>
                  </label>
                </div>
              </div>
              <Button onClick={handleCover} disabled={isGenerating || !coverFile} className="w-full">
                {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</> : "Create Cover"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hum-to-Song Tab */}
        <TabsContent value="hum" className="mt-4 space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                Hum-to-Song
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Hum or sing a melody and AI will transform it into a polished track using MusicGen's melody conditioning.
              </p>
              <div>
                <Label className="text-xs">Title</Label>
                <Input placeholder="My Melody" value={humTitle} onChange={(e) => setHumTitle(e.target.value)} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={isRecording ? stopRecording : startRecording}
                  className="flex-1"
                >
                  {isRecording ? (
                    <><span className="h-2 w-2 rounded-full bg-destructive-foreground animate-pulse mr-2" /> Stop Recording</>
                  ) : (
                    <><Mic2 className="h-4 w-4 mr-2" /> Record</>
                  )}
                </Button>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setHumFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="hum-upload"
                  />
                  <label htmlFor="hum-upload">
                    <Button variant="outline" className="w-full" asChild>
                      <span><Upload className="h-4 w-4 mr-2" /> Upload</span>
                    </Button>
                  </label>
                </div>
              </div>
              {humFile && (
                <p className="text-xs text-muted-foreground">📎 {humFile.name}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Genre</Label>
                  <Select value={humGenre} onValueChange={setHumGenre}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GENRES.map((g) => <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Mood</Label>
                  <Select value={humMood} onValueChange={setHumMood}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MOODS.map((m) => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleHum} disabled={isGenerating || !humFile} className="w-full">
                {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Transforming...</> : "Transform to Song"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Beat Maker Tab */}
        <TabsContent value="beat" className="mt-4 space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Drum className="h-4 w-4 text-primary" />
                Beat Maker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Title</Label>
                <Input placeholder="My Beat" value={beatTitle} onChange={(e) => setBeatTitle(e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Genre</Label>
                  <Select value={beatGenre} onValueChange={setBeatGenre}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GENRES.map((g) => <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Mood</Label>
                  <Select value={beatMood} onValueChange={setBeatMood}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MOODS.map((m) => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">BPM: {beatBpm[0]}</Label>
                <Slider value={beatBpm} onValueChange={setBeatBpm} min={60} max={200} step={5} className="mt-2" />
              </div>
              <div>
                <Label className="text-xs">Duration: {beatDuration[0]}s</Label>
                <Slider value={beatDuration} onValueChange={setBeatDuration} min={5} max={30} step={5} className="mt-2" />
              </div>
              <Button onClick={handleBeat} disabled={isGenerating} className="w-full">
                {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</> : "Generate Beat"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Tracks Tab */}
        <TabsContent value="tracks" className="mt-4 space-y-3">
          {tracks.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="py-8 text-center">
                <ListMusic className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tracks yet. Generate your first one!</p>
              </CardContent>
            </Card>
          ) : (
            tracks.map((track) => (
              <Card key={track.id} className="bg-card/50 backdrop-blur-sm border-border">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8"
                        disabled={track.status !== "completed" || !track.audio_url}
                        onClick={() => togglePlay(track)}
                      >
                        {playingTrackId === track.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{track.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={typeBadgeColor(track.track_type)} className="text-[10px] px-1.5 py-0">
                            {typeLabel(track.track_type)}
                          </Badge>
                          {track.status === "processing" && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" /> Processing
                            </span>
                          )}
                          {track.status === "failed" && (
                            <span className="text-[10px] text-destructive">Failed</span>
                          )}
                          {track.duration_seconds && (
                            <span className="text-[10px] text-muted-foreground">{track.duration_seconds}s</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {track.audio_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={track.audio_url} download>
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTrack(track.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
