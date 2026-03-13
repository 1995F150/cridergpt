import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, Upload, Play, Square, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceProfile {
  id: string;
  name: string;
  description: string | null;
  sample_url: string | null;
  status: string;
  is_default: boolean;
  created_at: string;
}

interface VoiceClonerProps {
  onProfileCreated?: () => void;
}

export function VoiceCloner({ onProfileCreated }: VoiceClonerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [testText, setTestText] = useState("Hey, this is a test of my cloned voice.");
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({ title: "🎙️ Recording", description: "Speak clearly for 10-30 seconds" });
    } catch {
      toast({ title: "Error", description: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const previewAudio = () => {
    const source = selectedFile
      ? URL.createObjectURL(selectedFile)
      : recordedBlob
      ? URL.createObjectURL(recordedBlob)
      : null;
    if (!source) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(source);
    audioRef.current = audio;
    audio.onplay = () => setIsPreviewPlaying(true);
    audio.onended = () => {
      setIsPreviewPlaying(false);
      URL.revokeObjectURL(source);
    };
    audio.play();
  };

  const stopPreview = () => {
    audioRef.current?.pause();
    setIsPreviewPlaying(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setRecordedBlob(null);
    }
  };

  const uploadAndCreateProfile = async () => {
    if (!user || !name.trim()) {
      toast({ title: "Error", description: "Please enter a name for this voice", variant: "destructive" });
      return;
    }

    const audioSource = selectedFile || (recordedBlob ? new File([recordedBlob], "recording.wav", { type: "audio/wav" }) : null);
    if (!audioSource) {
      toast({ title: "Error", description: "Please upload or record a voice sample", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const ext = audioSource.name.split(".").pop() || "mp3";
      const path = `${user.id}/${Date.now()}.${ext}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from("voice-samples")
        .upload(path, audioSource);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      const { data: urlData } = supabase.storage
        .from("voice-samples")
        .getPublicUrl(path);

      setUploadProgress(80);

      const { error: insertError } = await (supabase as any)
        .from("voice_profiles")
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          sample_url: urlData.publicUrl,
          sample_path: path,
          status: "ready",
          is_default: false,
        });

      if (insertError) throw insertError;

      setUploadProgress(100);

      toast({ title: "✅ Voice Profile Created", description: `"${name}" is ready to use` });

      setName("");
      setDescription("");
      setSelectedFile(null);
      setRecordedBlob(null);
      onProfileCreated?.();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Error", description: err.message || "Failed to create voice profile", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const testVoice = async () => {
    if (!testText.trim()) return;
    setIsTestingVoice(true);
    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text: testText.trim() },
      });
      if (error) throw error;
      if (data?.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
          { type: "audio/mpeg" }
        );
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        audio.play();
      }
    } catch {
      toast({ title: "Error", description: "Voice engine not connected yet", variant: "destructive" });
    } finally {
      setIsTestingVoice(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-cyber-blue flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Create Voice Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Voice Name</Label>
            <Input
              placeholder="e.g. Jessie's Voice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              placeholder="e.g. Natural speaking voice"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label>Voice Sample</Label>
            <p className="text-xs text-muted-foreground">
              Upload an MP3/WAV (10-30 seconds of clear speech) or record live
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              <Button
                variant={isRecording ? "destructive" : "outline"}
                onClick={isRecording ? stopRecording : startRecording}
                className="flex-1"
              >
                {isRecording ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Record
                  </>
                )}
              </Button>
            </div>

            {(selectedFile || recordedBlob) && (
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-foreground">
                  {selectedFile ? selectedFile.name : "Recording ready"}
                </span>
                <Button variant="ghost" size="sm" onClick={isPreviewPlaying ? stopPreview : previewAudio}>
                  {isPreviewPlaying ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
              </div>
            )}
          </div>

          {isUploading && <Progress value={uploadProgress} className="h-2" />}

          <Button
            onClick={uploadAndCreateProfile}
            disabled={isUploading || !name.trim() || (!selectedFile && !recordedBlob)}
            className="w-full bg-cyber-blue hover:bg-cyber-blue-dark text-background"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Profile...
              </>
            ) : (
              "Create Voice Profile"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Test Voice Engine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Type something to test..."
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="bg-background/50 min-h-[60px]"
          />
          <Button
            onClick={testVoice}
            disabled={isTestingVoice || !testText.trim()}
            variant="outline"
            className="w-full"
          >
            {isTestingVoice ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Test Voice Engine
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Requires your voice engine server to be running
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
