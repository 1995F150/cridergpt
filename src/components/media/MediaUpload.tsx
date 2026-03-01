import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaSystem } from '@/hooks/useMediaSystem';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, Loader2, User, ImagePlus, Trash2, Check, X
} from 'lucide-react';

export function MediaUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addCharacter, getImageAsBase64 } = useMediaSystem();
  
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  // Character mode
  const [isCharacterUpload, setIsCharacterUpload] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [characterPronouns, setCharacterPronouns] = useState('he/him');
  const [characterEra, setCharacterEra] = useState('');
  const [characterDescription, setCharacterDescription] = useState('');
  
  // Background removal indicator
  const [processingBgRemoval, setProcessingBgRemoval] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (selected.length === 0) return;
    
    setFiles(selected);
    
    // Generate previews
    Promise.all(selected.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    })).then(setPreviews);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user || files.length === 0) return;
    
    setUploading(true);
    try {
      if (isCharacterUpload && characterName.trim()) {
        // Upload as new character reference
        const result = await addCharacter(
          characterName.trim(),
          files[0],
          characterPronouns,
          characterEra || undefined,
          characterDescription || undefined
        );
        
        if (result) {
          toast({ 
            title: "Character Added", 
            description: `${characterName} is now available for image generation` 
          });
          // Reset form
          setCharacterName('');
          setCharacterEra('');
          setCharacterDescription('');
        }
      } else {
        // Regular upload to library
        for (const file of files) {
          const filePath = `${user.id}/${file.name}`;
          
          const { error } = await supabase.storage
            .from('user-files')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

          if (error) throw error;

          await (supabase as any).from('uploaded_files').insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: 'image',
            source: 'upload'
          });
        }

        toast({ 
          title: "Uploaded", 
          description: `${files.length} image(s) added to library` 
        });
      }

      // Clear files
      setFiles([]);
      setPreviews([]);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const processBackgroundRemoval = async () => {
    if (files.length === 0) return;
    
    setProcessingBgRemoval(true);
    try {
      // For now, show a message that this feature uses the generation API
      toast({
        title: "Background Removal",
        description: "Use the generator with prompt 'extract subject, remove background' to process uploaded images",
      });
    } finally {
      setProcessingBgRemoval(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <ImagePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Drag & drop images or click to browse
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="media-upload-input"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('media-upload-input')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Select Images
            </Button>
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="space-y-3">
              <Label>Selected Files ({files.length})</Label>
              <div className="grid grid-cols-4 gap-3">
                {previews.map((preview, i) => (
                  <div key={i} className="relative group">
                    <img 
                      src={preview} 
                      alt={files[i]?.name} 
                      className="w-full aspect-square object-cover rounded-lg border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs text-muted-foreground truncate mt-1">{files[i]?.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Character toggle */}
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Add as Character Reference</span>
            </div>
            <Switch checked={isCharacterUpload} onCheckedChange={setIsCharacterUpload} />
          </div>

          {/* Character details */}
          {isCharacterUpload && previews.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium">New Character</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name *</Label>
                    <Input
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                      placeholder="e.g., Dr. Harman"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pronouns</Label>
                    <Input
                      value={characterPronouns}
                      onChange={(e) => setCharacterPronouns(e.target.value)}
                      placeholder="he/him, she/her, they/them"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs">Era (optional)</Label>
                  <Input
                    value={characterEra}
                    onChange={(e) => setCharacterEra(e.target.value)}
                    placeholder="e.g., 1900s Western, Modern"
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Description (optional)</Label>
                  <Textarea
                    value={characterDescription}
                    onChange={(e) => setCharacterDescription(e.target.value)}
                    placeholder="Brief description of this character..."
                    className="min-h-[60px]"
                  />
                </div>

                <div className="p-2 bg-muted rounded text-xs text-muted-foreground">
                  <strong>Note:</strong> The AI will extract the subject from the photo and use it as a reference for future generations. Backgrounds, watermarks, and UI overlays will be ignored.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {files.length > 0 && (
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={uploading || (isCharacterUpload && !characterName.trim())}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {isCharacterUpload ? 'Add Character' : 'Upload to Library'}
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => { setFiles([]); setPreviews([]); }}
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Guidelines */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <ImagePlus className="h-4 w-4" />
            Upload Guidelines
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Regular uploads</strong> go directly to your Library for future use</li>
            <li>• <strong>Character uploads</strong> are saved as references for AI generation</li>
            <li>• AI automatically extracts subjects from photos</li>
            <li>• Backgrounds, watermarks, and TikTok UI are filtered out</li>
            <li>• Historical photos will auto-apply vintage textures in generation</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
