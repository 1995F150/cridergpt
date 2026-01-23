
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  Trash2, 
  Download, 
  Loader2, 
  Image as ImageIcon,
  ZoomIn,
  Grid3X3,
  List
} from 'lucide-react';

interface GalleryImage {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
  path: string;
}

export function GalleryPanel() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadImages();
    }
  }, [user]);

  const loadImages = async () => {
    if (!user) return;
    
    try {
      // First try to load from uploaded_files database
      const { data: dbFiles, error: dbError } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (dbError) {
        console.error('Error loading from database:', dbError);
      }

      const imagesWithUrls: GalleryImage[] = [];
      
      if (dbFiles && dbFiles.length > 0) {
        for (const file of dbFiles) {
          const { data: urlData } = supabase.storage
            .from('user-files')
            .getPublicUrl(file.file_path);
          
          imagesWithUrls.push({
            id: String(file.id),
            name: file.file_name,
            url: urlData.publicUrl,
            size: file.file_size || 0,
            uploadedAt: file.uploaded_at || new Date().toISOString(),
            path: file.file_path
          });
        }
      } else {
        // Fallback to storage listing
        const { data, error } = await supabase.storage
          .from('user-files')
          .list(user.id, { limit: 100 });

        if (!error && data) {
          for (const file of data) {
            if (file.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
              const { data: urlData } = supabase.storage
                .from('user-files')
                .getPublicUrl(`${user.id}/${file.name}`);
              
              imagesWithUrls.push({
                id: file.id || file.name,
                name: file.name,
                url: urlData.publicUrl,
                size: file.metadata?.size || 0,
                uploadedAt: file.created_at || new Date().toISOString(),
                path: `${user.id}/${file.name}`
              });
            }
          }
        }
      }

      setImages(imagesWithUrls);
    } catch (error) {
      console.error('Error loading images:', error);
      toast({
        title: "Error",
        description: "Failed to load gallery images",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    setUploading(true);

    try {
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );

      if (imageFiles.length === 0) {
        toast({
          title: "No Images Selected",
          description: "Please select valid image files.",
          variant: "destructive",
        });
        return;
      }

      for (const file of imageFiles) {
        const filePath = `${user.id}/${file.name}`;
        
        const { error } = await supabase.storage
          .from('user-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Update database record
        await supabase.from('uploaded_files').insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size
        });
      }

      toast({
        title: "Success",
        description: `${imageFiles.length} image(s) uploaded successfully`,
      });

      await loadImages();
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (image: GalleryImage) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([image.path]);

      if (storageError) throw storageError;

      await supabase
        .from('uploaded_files')
        .delete()
        .eq('file_path', image.path)
        .eq('user_id', user?.id);

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });

      await loadImages();
      setSelectedImage(null);
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (image: GalleryImage) => {
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(image.path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Image downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="panel h-full w-full p-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-primary" />
              Gallery
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              <Badge variant="secondary">{images.length} images</Badge>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardContent className="p-6">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Upload images to your gallery
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
              disabled={uploading}
            />
            <Button 
              className="bg-primary hover:bg-primary/90"
              disabled={uploading}
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Content */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading gallery...</span>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No images in your gallery yet</p>
              <p className="text-sm">Upload some images to get started</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="group relative aspect-square">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover rounded-lg border border-border cursor-pointer transition-all group-hover:scale-105"
                        onClick={() => setSelectedImage(image)}
                        onError={(e) => {
                          console.error('Failed to load image:', image.url);
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {images.map((image) => (
                    <div key={image.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 border border-border">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-16 h-16 object-cover rounded border border-border cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                        onError={(e) => {
                          console.error('Failed to load image:', image.url);
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground truncate">{image.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(image.size)} • Uploaded: {new Date(image.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDownload(image)}
                          className="border-blue-500/20 text-blue-500 hover:bg-blue-500/10"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(image)}
                          className="border-red-500/20 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl max-h-full bg-card rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{selectedImage.name}</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownload(selectedImage)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDelete(selectedImage)}
                  className="border-red-500/20 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedImage(null)}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-w-full max-h-[70vh] object-contain mx-auto"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {formatFileSize(selectedImage.size)} • Uploaded: {new Date(selectedImage.uploadedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
