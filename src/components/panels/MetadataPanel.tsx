import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Image as ImageIcon, Upload, Sparkles, Trash2, Download, MapPin, Camera, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import exifr from 'exifr';

interface AIImage {
  id: string;
  prompt: string | null;
  image_url: string | null;
  character_ids: string[] | null;
  model: string | null;
  created_at: string;
  metadata: any;
}

export function MetadataPanel() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inspector tab
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null);
  const [parsing, setParsing] = useState(false);

  // AI history tab
  const [aiImages, setAiImages] = useState<AIImage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedAi, setSelectedAi] = useState<AIImage | null>(null);

  useEffect(() => {
    if (user) loadAiHistory();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAiHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await (supabase as any)
        .from('media_generations')
        .select('id, prompt, image_url, character_ids, model, created_at, metadata')
        .eq('user_id', user.id)
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      setAiImages(data || []);
    } catch (err: any) {
      console.error('Load AI history error:', err);
      toast.error('Could not load AI image history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFileName(file.name);
    setFileSize(file.size);
    setMetadata(null);
    setParsing(true);

    try {
      const data = await exifr.parse(file, {
        tiff: true,
        exif: true,
        gps: true,
        xmp: true,
        iptc: true,
        icc: false,
      });
      setMetadata(data || {});
      if (!data || Object.keys(data).length === 0) {
        toast.info('No EXIF/XMP metadata found in this image');
      } else {
        toast.success(`Found ${Object.keys(data).length} metadata fields`);
      }
    } catch (err: any) {
      console.error('EXIF parse error:', err);
      toast.error('Could not parse metadata');
      setMetadata({});
    } finally {
      setParsing(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const stripAndDownload = async () => {
    if (!previewUrl || !fileName) return;
    try {
      // Re-encode through canvas to drop all metadata
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = previewUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        const cleanUrl = URL.createObjectURL(blob);
        a.href = cleanUrl;
        a.download = `clean-${fileName.replace(/\.[^.]+$/, '')}.png`;
        a.click();
        URL.revokeObjectURL(cleanUrl);
        toast.success('Downloaded metadata-stripped copy');
      }, 'image/png');
    } catch (err: any) {
      console.error('Strip error:', err);
      toast.error('Failed to strip metadata');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const renderValue = (v: any): string => {
    if (v == null) return '—';
    if (v instanceof Date) return v.toLocaleString();
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  const hasGps = metadata && (metadata.latitude != null || metadata.GPSLatitude != null);
  const hasCamera = metadata && (metadata.Make || metadata.Model);
  const hasDate = metadata && (metadata.DateTimeOriginal || metadata.CreateDate);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <ImageIcon className="h-7 w-7 text-primary" />
          Metadata Editor
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Inspect EXIF data on any image, or trace where your AI-generated images came from.
        </p>
      </div>

      <Tabs defaultValue="inspector" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="inspector" className="gap-2">
            <Upload className="h-4 w-4" /> Image Inspector
          </TabsTrigger>
          <TabsTrigger value="ai-history" className="gap-2">
            <Sparkles className="h-4 w-4" /> AI History
          </TabsTrigger>
        </TabsList>

        {/* ─── Inspector ─── */}
        <TabsContent value="inspector" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload an image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="preview" className="mx-auto max-h-64 rounded" />
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Click or drop an image</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, HEIC, WEBP — EXIF / XMP / GPS</p>
                    </>
                  )}
                </div>

                {previewUrl && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">File</span><span className="font-mono truncate ml-2">{fileName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{formatBytes(fileSize)}</span></div>
                    <Separator />
                    <div className="flex flex-wrap gap-2">
                      {hasCamera && <Badge variant="outline" className="gap-1"><Camera className="h-3 w-3" />{metadata?.Make} {metadata?.Model}</Badge>}
                      {hasDate && <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" />{renderValue(metadata?.DateTimeOriginal || metadata?.CreateDate)}</Badge>}
                      {hasGps && <Badge variant="destructive" className="gap-1"><MapPin className="h-3 w-3" />GPS present</Badge>}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={stripAndDownload} variant="default" size="sm" className="gap-1.5">
                        <Download className="h-4 w-4" /> Download cleaned copy
                      </Button>
                      <Button
                        onClick={() => {
                          if (previewUrl) URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(null);
                          setMetadata(null);
                          setFileName('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                      >
                        <Trash2 className="h-4 w-4" /> Clear
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metadata fields</CardTitle>
              </CardHeader>
              <CardContent>
                {parsing ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Reading EXIF…
                  </div>
                ) : metadata && Object.keys(metadata).length > 0 ? (
                  <ScrollArea className="h-[400px] pr-3">
                    <div className="space-y-1 text-xs font-mono">
                      {Object.entries(metadata).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-2 gap-2 py-1 border-b border-border/40">
                          <span className="text-muted-foreground truncate">{k}</span>
                          <span className="break-all">{renderValue(v)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-12 text-sm">
                    {previewUrl ? 'No metadata found in this image.' : 'Upload an image to inspect.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── AI History ─── */}
        <TabsContent value="ai-history" className="mt-4">
          {!user ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Sign in to view your AI image history.</CardContent></Card>
          ) : loadingHistory ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : aiImages.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No AI-generated images yet.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
              <Card>
                <CardHeader><CardTitle className="text-base">Your AI images ({aiImages.length})</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-2">
                    <div className="grid grid-cols-3 gap-2">
                      {aiImages.map((img) => (
                        <button
                          key={img.id}
                          onClick={() => setSelectedAi(img)}
                          className={`aspect-square rounded overflow-hidden border-2 transition-all ${
                            selectedAi?.id === img.id ? 'border-primary' : 'border-transparent hover:border-border'
                          }`}
                        >
                          <img src={img.image_url || ''} alt={img.prompt || ''} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Source details</CardTitle></CardHeader>
                <CardContent>
                  {selectedAi ? (
                    <div className="space-y-3">
                      <img src={selectedAi.image_url || ''} alt="" className="w-full max-h-72 object-contain rounded" />
                      <div className="space-y-2 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Prompt</Label>
                          <p className="text-sm mt-1 p-2 bg-muted/50 rounded font-mono text-xs">{selectedAi.prompt || '—'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><Label className="text-muted-foreground">Model</Label><p>{selectedAi.model || '—'}</p></div>
                          <div><Label className="text-muted-foreground">Created</Label><p>{new Date(selectedAi.created_at).toLocaleString()}</p></div>
                        </div>
                        {selectedAi.character_ids && selectedAi.character_ids.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Characters used</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedAi.character_ids.map((c) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                            </div>
                          </div>
                        )}
                        {selectedAi.metadata && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Extra metadata</Label>
                            <pre className="text-xs p-2 bg-muted/50 rounded mt-1 overflow-auto max-h-32">{JSON.stringify(selectedAi.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-12 text-sm">Pick an image to see its source.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MetadataPanel;
