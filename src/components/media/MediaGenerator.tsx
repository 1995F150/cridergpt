import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaSystem, DEFAULT_CHARACTERS, GenerationSettings } from '@/hooks/useMediaSystem';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, Image, Sparkles, User, Camera, 
  Download, Palette, Sun, Moon, Film
} from 'lucide-react';

interface MediaGeneratorProps {
  remixSource?: { url: string; path: string } | null;
  onClearRemix?: () => void;
}

export function MediaGenerator({ remixSource, onClearRemix }: MediaGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { generateWithCharacters, saveToLibrary, getImageAsBase64 } = useMediaSystem();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [prompt, setPrompt] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Character selection
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(['jessie']);
  
  // Style settings
  const [style, setStyle] = useState<GenerationSettings['style']>('realistic');
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const [vintageTexture, setVintageTexture] = useState(false);
  const [filmGrain, setFilmGrain] = useState(false);
  const [mood, setMood] = useState('neutral');
  const [lighting, setLighting] = useState('natural');
  
  // DALL-E settings for pure generation
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('standard');
  const [dalleStyle, setDalleStyle] = useState('vivid');

  const toggleCharacter = (id: string) => {
    setSelectedCharacters(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

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

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: "Error", description: "Please sign in", variant: "destructive" });
      return;
    }
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Enter a prompt", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const settings: GenerationSettings = {
        characters: selectedCharacters,
        style,
        blackAndWhite,
        vintageTexture,
        filmGrain,
        mood: mood !== 'neutral' ? mood : undefined,
        lighting: lighting !== 'natural' ? lighting : undefined
      };

      // If using character references, use the character generation
      if (selectedCharacters.length > 0) {
        const result = await generateWithCharacters(prompt, settings);
        if (result?.imageData) {
          setImageData(result.imageData);
          setRevisedPrompt(result.revisedPrompt || prompt);
          drawToCanvas(result.imageData);
        }
      } else {
        // Pure DALL-E generation
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { 
            prompt: prompt.trim(), 
            size, 
            quality, 
            style: dalleStyle,
            mode: 'generate'
          }
        });

        if (error) throw error;

        if (data?.imageData) {
          setImageData(data.imageData);
          setRevisedPrompt(data.revisedPrompt || prompt);
          drawToCanvas(data.imageData);
          await saveToLibrary(data.imageData, 'ai_generated', { style });
          toast({ title: "Success", description: "Image generated!" });
        }
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemix = async () => {
    if (!remixSource || !prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const base64 = await getImageAsBase64(remixSource.url);
      
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: prompt.trim(),
          mode: 'edit',
          imageUrl: base64,
          settings: { style, blackAndWhite, vintageTexture, filmGrain }
        }
      });

      if (error) throw error;

      if (data?.imageData) {
        setImageData(data.imageData);
        setRevisedPrompt(data.revisedPrompt || prompt);
        drawToCanvas(data.imageData);
        await saveToLibrary(data.imageData, 'ai_edited', { style });
        toast({ title: "Remixed!", description: "Image edited and saved" });
        onClearRemix?.();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!imageData) return;
    const link = document.createElement('a');
    link.download = `cridergpt_${Date.now()}.png`;
    link.href = `data:image/png;base64,${imageData}`;
    link.click();
  };

  // Auto-apply vintage settings for historical characters
  const handleStyleChange = (newStyle: GenerationSettings['style']) => {
    setStyle(newStyle);
    if (newStyle === 'rdr2' || newStyle === 'vintage') {
      setVintageTexture(true);
      setFilmGrain(true);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Remix indicator */}
          {remixSource && (
            <div className="p-3 bg-accent/20 rounded-lg border border-accent/30 flex items-center gap-3">
              <img src={remixSource.url} alt="Source" className="w-12 h-12 object-cover rounded" />
              <div className="flex-1">
                <p className="text-sm font-medium">Remix Mode</p>
                <p className="text-xs text-muted-foreground">Editing selected image</p>
              </div>
              <Button size="sm" variant="ghost" onClick={onClearRemix}>Cancel</Button>
            </div>
          )}

          {/* Character Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Characters</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CHARACTERS.map(char => (
                <Button
                  key={char.id}
                  variant={selectedCharacters.includes(char.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCharacter(char.id)}
                  className="gap-2"
                >
                  <img src={char.referenceUrl} alt={char.name} className="w-5 h-5 rounded-full object-cover" />
                  {char.name}
                  {char.isPrimary && <Badge variant="secondary" className="text-[10px]">Primary</Badge>}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Selected characters will be used as reference for generation
            </p>
          </div>

          {/* Prompt */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {remixSource ? 'Edit Instructions' : 'Scene Description'}
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={remixSource 
                ? "Describe how to edit this image (e.g., 'make it black and white, add Dr. Harman')"
                : "Describe the scene (e.g., 'standing on a farm at sunset, wearing overalls')"
              }
              className="min-h-[100px]"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">{prompt.length}/1000</p>
          </div>

          {/* Style */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Style</Label>
              <Select value={style} onValueChange={(v) => handleStyleChange(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realistic">Realistic</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="vintage">Vintage Photo</SelectItem>
                  <SelectItem value="rdr2">RDR2 Portrait</SelectItem>
                  <SelectItem value="cartoon">Cartoon</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Mood</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="dramatic">Dramatic</SelectItem>
                  <SelectItem value="warm">Warm & Cozy</SelectItem>
                  <SelectItem value="moody">Dark & Moody</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cinematic toggles */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Cinematic Effects</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span className="text-sm">Black & White</span>
                </div>
                <Switch checked={blackAndWhite} onCheckedChange={setBlackAndWhite} />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span className="text-sm">Vintage Texture</span>
                </div>
                <Switch checked={vintageTexture} onCheckedChange={setVintageTexture} />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  <span className="text-sm">Film Grain</span>
                </div>
                <Switch checked={filmGrain} onCheckedChange={setFilmGrain} />
              </div>
            </div>
          </div>

          {/* Pure generation settings (when no characters) */}
          {selectedCharacters.length === 0 && !remixSource && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Size</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024x1024">Square</SelectItem>
                    <SelectItem value="1792x1024">Landscape</SelectItem>
                    <SelectItem value="1024x1792">Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Quality</Label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hd">HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Style</Label>
                <Select value={dalleStyle} onValueChange={setDalleStyle}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vivid">Vivid</SelectItem>
                    <SelectItem value="natural">Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button
            onClick={remixSource ? handleRemix : handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {remixSource ? 'Remixing...' : 'Generating...'}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {remixSource ? 'Remix Image' : 'Generate Image'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Preview
          </CardTitle>
          {revisedPrompt && revisedPrompt !== prompt && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              AI revised: {revisedPrompt}
            </p>
          )}
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

          {imageData && (
            <Button onClick={downloadImage} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
