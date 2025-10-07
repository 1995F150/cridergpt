import React, { useState } from 'react';
import { Upload, Download, FileCode, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function Model3DConverterPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const { toast } = useToast();

  const addLog = (message: string) => {
    setStatusLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validExtensions = ['.blend', '.fbx', '.obj', '.glb', '.gltf'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (validExtensions.includes(fileExt)) {
        setSelectedFile(file);
        addLog(`✅ Upload received: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload .blend, .fbx, .obj, or .glb files only",
          variant: "destructive"
        });
      }
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please upload a 3D model first",
        variant: "destructive"
      });
      return;
    }

    setConverting(true);
    addLog('🔄 Converting model to .i3d format...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Upload file to storage first
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `${user.id}/${fileName}`;

      addLog('📤 Uploading model to storage...');
      
      const { error: uploadError } = await supabase.storage
        .from('3d-models')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      addLog('✅ Upload complete');
      addLog('🔄 Initiating conversion process...');

      // Call edge function for conversion
      const { data, error } = await supabase.functions.invoke('convert-3d-model', {
        body: { 
          filePath,
          fileName: selectedFile.name,
          fileType: fileExt
        }
      });

      if (error) throw error;

      if (data.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        addLog('✅ Export complete');
        addLog('📦 Download ready');
        
        toast({
          title: "Conversion successful",
          description: "Your .i3d file is ready for download"
        });
      }
    } catch (error) {
      console.error('Conversion error:', error);
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      addLog('📥 Download initiated');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileCode className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">3D Model Converter</h1>
          <p className="text-muted-foreground">Developer Tools - Convert 3D models to GIANTS Editor .i3d format</p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Developer Only:</strong> This tool is exclusively available for Jessie Crider's development workflow.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload 3D Model</CardTitle>
          <CardDescription>
            Supported formats: .blend, .fbx, .obj, .glb, .gltf
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="w-full sm:w-auto"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload 3D Model
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".blend,.fbx,.obj,.glb,.gltf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile && (
                <span className="text-sm text-muted-foreground">
                  {selectedFile.name}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConvert}
                disabled={!selectedFile || converting}
                className="flex-1"
              >
                {converting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                    Converting...
                  </>
                ) : (
                  <>
                    <FileCode className="mr-2 h-4 w-4" />
                    Convert to .i3d
                  </>
                )}
              </Button>

              <Button
                onClick={handleDownload}
                disabled={!downloadUrl}
                variant="secondary"
              >
                <Download className="mr-2 h-4 w-4" />
                Download .i3d
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
            {statusLog.length === 0 ? (
              <p className="text-muted-foreground">Waiting for action...</p>
            ) : (
              <div className="space-y-1">
                {statusLog.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
