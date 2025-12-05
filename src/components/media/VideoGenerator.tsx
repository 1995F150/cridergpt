import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Video, Play, Download, Loader2, Film, 
  Volume2, Timer, Sparkles, AlertCircle
} from 'lucide-react';

export function VideoGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState([3]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Video settings
  const [includeAudio, setIncludeAudio] = useState(false);
  const [loop, setLoop] = useState(false);
  const [slowMotion, setSlowMotion] = useState(false);
  const [cinematicStyle, setCinematicStyle] = useState('standard');

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: "Error", description: "Please sign in", variant: "destructive" });
      return;
    }
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Enter a description", variant: "destructive" });
      return;
    }

    // Video generation is limited - show info
    toast({
      title: "Video Generation",
      description: "Full video generation requires external APIs. Currently, you can create video exports from generated images.",
    });
  };

  // Export canvas as video (static image to video)
  const exportAsVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsGenerating(true);
      
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);

        const a = document.createElement('a');
        a.href = url;
        a.download = `cridergpt_video_${Date.now()}.webm`;
        a.click();
        
        toast({ title: "Exported", description: "Video saved!" });
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), duration[0] * 1000);
      
      toast({ title: "Recording", description: `Creating ${duration[0]}s video...` });
    } catch (error) {
      toast({ title: "Error", description: "Video export failed", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">Video Generation Beta</p>
            <p className="text-sm text-muted-foreground">
              Full AI video generation with motion, gestures, and dialogue is coming soon. 
              Currently, you can export generated images as video clips.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              Video Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-sm font-medium mb-2 block">Scene Description</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video scene, motion, and any dialogue..."
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Duration: {duration[0]}s
              </Label>
              <Slider
                value={duration}
                onValueChange={setDuration}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max recommended: 10 seconds
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Cinematic Style</Label>
              <Select value={cinematicStyle} onValueChange={setCinematicStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="vintage">Vintage Film</SelectItem>
                  <SelectItem value="blackwhite">Black & White</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Options</Label>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <span className="text-sm">Include Audio</span>
                  </div>
                  <Switch checked={includeAudio} onCheckedChange={setIncludeAudio} />
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    <span className="text-sm">Slow Motion</span>
                  </div>
                  <Switch checked={slowMotion} onCheckedChange={setSlowMotion} />
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    <span className="text-sm">Loop</span>
                  </div>
                  <Switch checked={loop} onCheckedChange={setLoop} />
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Video (Coming Soon)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className="border-2 border-dashed border-border rounded-lg max-w-full h-auto"
                style={{ backgroundColor: 'hsl(var(--muted))' }}
              />
            </div>

            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                loop={loop}
                className="w-full rounded-lg border"
              />
            )}

            <Button
              onClick={exportAsVideo}
              variant="outline"
              className="w-full"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Export as Video
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Video Tips</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Generate an image first in the Media Generator tab</li>
            <li>• Export it as a video clip with the duration you want</li>
            <li>• Use slow motion for dramatic effect</li>
            <li>• Loop option creates seamless repeating videos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
