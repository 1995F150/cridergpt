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
import { useMediaSystem, GenerationSettings } from '@/hooks/useMediaSystem';
import { 
  Video, Play, Download, Loader2, Film, 
  Volume2, Timer, Sparkles, AlertCircle, User
} from 'lucide-react';

export function VideoGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { characters, generateWithCharacters, getImageAsBase64 } = useMediaSystem();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState([3]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Character selection - same as image generator
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(['jessie']);
  
  // Video settings
  const [includeAudio, setIncludeAudio] = useState(false);
  const [loop, setLoop] = useState(false);
  const [slowMotion, setSlowMotion] = useState(false);
  const [cinematicStyle, setCinematicStyle] = useState('standard');
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const [vintageTexture, setVintageTexture] = useState(false);

  const toggleCharacter = (slug: string) => {
    setSelectedCharacters(prev => 
      prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug]
    );
  };

  // Auto-apply vintage for historical characters
  React.useEffect(() => {
    const hasHistorical = selectedCharacters.some(slug => {
      const char = characters.find(c => c.slug === slug);
      return char?.era?.includes('1900') || char?.era?.includes('Western');
    });
    if (hasHistorical) {
      setVintageTexture(true);
    }
  }, [selectedCharacters, characters]);

  const drawToCanvas = (base64: string) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      }
    };
    img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  };

  const handleGenerateFrame = async () => {
    if (!user) {
      toast({ title: "Error", description: "Please sign in", variant: "destructive" });
      return;
    }
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Enter a description", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const settings: GenerationSettings = {
        characters: selectedCharacters,
        style: cinematicStyle === 'vintage' ? 'vintage' : 
               cinematicStyle === 'blackwhite' ? 'vintage' : 
               cinematicStyle === 'cinematic' ? 'cinematic' : 'realistic',
        blackAndWhite: blackAndWhite || cinematicStyle === 'blackwhite',
        vintageTexture,
        filmGrain: vintageTexture,
        outputType: 'video'
      };

      // Generate a frame using the same character references
      const result = await generateWithCharacters(prompt, settings);
      
      if (result?.imageData) {
        setGeneratedImage(result.imageData);
        drawToCanvas(result.imageData);
        toast({ title: "Frame Generated", description: "Now you can export as video" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Export canvas as video
  const exportAsVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast({ title: "Error", description: "Generate a frame first", variant: "destructive" });
      return;
    }

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
      const recordDuration = slowMotion ? duration[0] * 2 : duration[0];
      setTimeout(() => mediaRecorder.stop(), recordDuration * 1000);
      
      toast({ title: "Recording", description: `Creating ${recordDuration}s video...` });
    } catch (error) {
      toast({ title: "Error", description: "Video export failed", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">Video Generation</p>
            <p className="text-sm text-muted-foreground">
              Video uses the same character references as image generation. Generate a frame, then export as video.
              Full AI motion video is coming soon.
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
            {/* Character Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Characters</Label>
              <div className="flex flex-wrap gap-2">
                {characters.map(char => (
                  <Button
                    key={char.id}
                    variant={selectedCharacters.includes(char.slug) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCharacter(char.slug)}
                    className="gap-2"
                  >
                    <img 
                      src={char.referenceUrl} 
                      alt={char.name} 
                      className="w-5 h-5 rounded-full object-cover" 
                    />
                    {char.name}
                    {char.isPrimary && <Badge variant="secondary" className="text-[10px]">Primary</Badge>}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Same references as image generator for consistency
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Scene Description</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video scene, motion, setting..."
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Duration: {duration[0]}s {slowMotion && '(slow-mo)'}
              </Label>
              <Slider
                value={duration}
                onValueChange={setDuration}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              {duration[0] > 5 && (
                <p className="text-xs text-amber-500 mt-1">
                  Longer videos may take more time to export
                </p>
              )}
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

            <div className="flex gap-2">
              <Button
                onClick={handleGenerateFrame}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Frame
                  </>
                )}
              </Button>
            </div>
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
              disabled={isGenerating || !generatedImage}
            >
              <Download className="h-4 w-4 mr-2" />
              Export as Video ({duration[0]}s)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
