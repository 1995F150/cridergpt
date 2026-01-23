import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Download, Loader2, FileText, FileImage, FileAudio, FileVideo, FileArchive, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  path: string;
}

export function FileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .list(user.id, {
          limit: 100,
          offset: 0,
        });

      if (error) throw error;

      const files: UploadedFile[] = data?.map(file => ({
        id: file.id || file.name,
        name: file.name,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'unknown',
        uploadedAt: file.created_at,
        path: `${user.id}/${file.name}`
      })) || [];

      setUploadedFiles(files);
    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
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
        description: `${files.length} file(s) uploaded successfully`,
      });

      // Reload files
      await loadFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(file.path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (file: UploadedFile) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([file.path]);

      if (storageError) throw storageError;

      // Remove from database
      await supabase
        .from('uploaded_files')
        .delete()
        .eq('file_path', file.path)
        .eq('user_id', user?.id);

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      // Reload files
      await loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const getFileTypeColor = (type: string) => {
    if (type.includes('image')) return 'bg-blue-500/20 text-blue-500';
    if (type.includes('text') || type.includes('javascript')) return 'bg-green-500/20 text-green-500';
    if (type.includes('pdf')) return 'bg-red-500/20 text-red-500';
    if (type.includes('audio')) return 'bg-yellow-500/20 text-yellow-500';
    if (type.includes('video')) return 'bg-purple-500/20 text-purple-500';
    if (type.includes('zip') || type.includes('compressed')) return 'bg-violet-500/20 text-violet-500';
    return 'bg-muted text-muted-foreground';
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return FileImage;
    if (type.includes('pdf')) return FileText;
    if (type.includes('audio')) return FileAudio;
    if (type.includes('video')) return FileVideo;
    if (type.includes('zip') || type.includes('compressed')) return FileArchive;
    return File;
  };

  const getImagePreviewUrl = (file: UploadedFile) => {
    if (!file.type.includes('image')) return null;
    const { data } = supabase.storage.from('user-files').getPublicUrl(file.path);
    return data.publicUrl;
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5 text-cyber-blue" />
          <span className="text-cyber-blue">File Manager</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            Drop your files here or click to select
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            disabled={uploading}
          />
          <Button 
            className="bg-primary hover:bg-primary/90 cursor-pointer"
            disabled={uploading}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Select Files
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading files...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No files uploaded yet
              </div>
            ) : (
              uploadedFiles.map((file) => {
                const FileIcon = getFileIcon(file.type);
                const previewUrl = getImagePreviewUrl(file);
                
                return (
                  <div key={file.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-start gap-4">
                      {/* File Preview/Icon */}
                      <div className="flex-shrink-0">
                        {previewUrl ? (
                          <img 
                            src={previewUrl} 
                            alt={file.name}
                            className="w-14 h-14 object-cover rounded-md border border-border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-14 h-14 rounded-md flex items-center justify-center ${getFileTypeColor(file.type)} ${previewUrl ? 'hidden' : ''}`}>
                          <FileIcon className="h-6 w-6" />
                        </div>
                      </div>
                      
                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{file.name}</h3>
                          <Badge className={getFileTypeColor(file.type)}>
                            {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDownload(file)}
                            className="border-primary/20 text-primary hover:bg-primary/10"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(file)}
                            className="border-destructive/20 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}