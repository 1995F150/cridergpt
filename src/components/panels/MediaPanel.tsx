import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Image, Download, Video, Palette, Sparkles } from 'lucide-react';

export function MediaPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('standard');
  const [style, setStyle] = useState('vivid');
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateImage = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to generate images",
        variant: "destructive",
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for image generation",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: prompt.trim(),
          size,
          quality,
          style
        }
      });

      if (error) throw error;

      if (data?.imageData) {
        setImageData(data.imageData);
        setRevisedPrompt(data.revisedPrompt || prompt);
        
        // Draw image to canvas
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
        img.src = `data:image/png;base64,${data.imageData}`;

        toast({
          title: "Success",
          description: "Image generated successfully!",
        });
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPNG = () => {
    if (!imageData) return;
    
    const link = document.createElement('a');
    link.download = 'cridergpt_generated_image.png';
    link.href = `data:image/png;base64,${imageData}`;
    link.click();
  };

  const downloadMP4 = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoURL(url);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'cridergpt_generated_video.webm';
        a.click();
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 3000); // 3 second recording
      
      toast({
        title: "Recording",
        description: "Recording 3-second video...",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record video. This feature may not be supported in your browser.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 p-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            CriderGPT AI Media Generator
          </CardTitle>
          <p className="text-muted-foreground">
            Generate stunning images with AI and export them as PNG or video formats
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Prompt</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter a detailed description of what you want to generate (e.g., 'a futuristic robot farming hay in a cyberpunk style')"
                className="min-h-[100px]"
                maxLength={1000}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {prompt.length}/1000 characters
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Size</label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                    <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                    <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Quality</label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hd">HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Style</label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vivid">Vivid</SelectItem>
                    <SelectItem value="natural">Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={generateImage}
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Generated Image
            </CardTitle>
            {revisedPrompt && revisedPrompt !== prompt && (
              <Badge variant="secondary" className="w-fit">
                Revised: {revisedPrompt}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className="border-2 border-border rounded-lg max-w-full h-auto"
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            {imageData && (
              <div className="flex gap-2">
                <Button onClick={downloadPNG} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export PNG
                </Button>
                <Button onClick={downloadMP4} variant="outline" className="flex-1">
                  <Video className="h-4 w-4 mr-2" />
                  Export Video
                </Button>
              </div>
            )}

            {videoURL && (
              <div className="mt-4">
                <video 
                  src={videoURL} 
                  controls 
                  className="w-full rounded-lg border-2 border-border"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips Card */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">💡 Pro Tips for Better Results:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Be specific and descriptive in your prompts</li>
            <li>• Include style keywords like "photorealistic", "cartoon", "cyberpunk", etc.</li>
            <li>• Mention colors, lighting, and composition details</li>
            <li>• Use "HD" quality for more detailed images</li>
            <li>• "Vivid" style creates more dramatic, hyper-real images</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}