import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";

interface UploadedFile {
  id: number;
  name: string;
  size: number;
  type: 'mod' | 'script' | 'config';
  uploadedAt: Date;
  status: 'uploaded' | 'processing' | 'deployed';
}

export function FileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    {
      id: 1,
      name: "harvester_mod_v2.zip",
      size: 2500000,
      type: 'mod',
      uploadedAt: new Date('2024-01-15'),
      status: 'deployed'
    },
    {
      id: 2,
      name: "auto_response_script.js",
      size: 15000,
      type: 'script',
      uploadedAt: new Date('2024-01-14'),
      status: 'uploaded'
    }
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const newFile: UploadedFile = {
          id: uploadedFiles.length + Math.floor(Math.random() * 1000),
          name: file.name,
          size: file.size,
          type: file.name.includes('.zip') ? 'mod' : file.name.includes('.js') ? 'script' : 'config',
          uploadedAt: new Date(),
          status: 'uploaded'
        };
        setUploadedFiles(prev => [...prev, newFile]);
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mod': return 'bg-cyber-blue text-background';
      case 'script': return 'bg-tech-accent text-background';
      case 'config': return 'bg-green-500 text-background';
      default: return 'bg-secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-yellow-500 text-background';
      case 'processing': return 'bg-blue-500 text-background';
      case 'deployed': return 'bg-green-500 text-background';
      default: return 'bg-secondary';
    }
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
            Drop your mod files, scripts, or configs here
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            accept=".zip,.js,.json,.xml,.lua"
          />
          <label htmlFor="file-upload">
            <Button className="bg-cyber-blue hover:bg-cyber-blue-dark cursor-pointer">
              Select Files
            </Button>
          </label>
        </div>

        <div className="space-y-3">
          {uploadedFiles.map((file) => (
            <div key={file.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground truncate">{file.name}</h3>
                <div className="flex space-x-2">
                  <Badge className={getTypeColor(file.type)}>
                    {file.type.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(file.status)}>
                    {file.status}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatFileSize(file.size)}</span>
                <span>Uploaded: {file.uploadedAt.toLocaleDateString()}</span>
              </div>
              
              <div className="flex space-x-2 mt-3">
                <Button variant="outline" size="sm" className="border-cyber-blue/20 text-cyber-blue">
                  Download
                </Button>
                {file.status === 'uploaded' && (
                  <Button variant="outline" size="sm" className="border-tech-accent/20 text-tech-accent">
                    Deploy
                  </Button>
                )}
                <Button variant="outline" size="sm" className="border-red-500/20 text-red-500">
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}