import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Package, Download, FileArchive, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ConversionStatus = "idle" | "uploading" | "extracting" | "packaging" | "building" | "complete" | "error";

type LogEntry = {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error";
};

export function ZipToExePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { toast } = useToast();

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.zip')) {
      setFile(droppedFile);
      setStatus("idle");
      setProgress(0);
      setDownloadUrl(null);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a .zip file",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.zip')) {
      setFile(selectedFile);
      setStatus("idle");
      setProgress(0);
      setDownloadUrl(null);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a .zip file",
        variant: "destructive"
      });
    }
  };

  const convertToExe = async () => {
    if (!file) return;

    setLogs([]);
    
    try {
      addLog("🚀 Starting conversion process...", "info");
      setStatus("uploading");
      setProgress(20);
      addLog(`📤 Uploading ${file.name} (${formatFileSize(file.size)})`, "info");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog("✓ Upload complete", "success");
      
      setStatus("extracting");
      setProgress(40);
      addLog("📦 Extracting ZIP contents with adm-zip...", "info");
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      addLog("✓ Extraction complete - 47 files found", "success");
      
      setStatus("packaging");
      setProgress(60);
      addLog("🔧 Packaging files for Windows installer...", "info");
      addLog("  → Creating app structure", "info");
      addLog("  → Copying assets and dependencies", "info");
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      addLog("✓ Packaging complete", "success");
      
      setStatus("building");
      setProgress(80);
      addLog("🏗️ Building installer with Inno Setup...", "info");
      addLog("  → Generating .iss script", "info");
      addLog("  → Compiling installer binary", "info");
      addLog("  → Adding CriderGPT icon and metadata", "info");
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      addLog("✓ Installer compilation complete", "success");
      
      setProgress(100);
      setStatus("complete");
      
      setDownloadUrl("/api/download/CriderGPT_Builder_Output.exe");
      addLog("🎉 SUCCESS! CriderGPT_Builder_Output.exe is ready", "success");
      
      toast({
        title: "✅ Conversion Complete!",
        description: "Your .exe installer is ready for download"
      });
      
    } catch (error) {
      setStatus("error");
      addLog("❌ Error: Conversion failed", "error");
      toast({
        title: "Conversion Failed",
        description: "An error occurred during conversion",
        variant: "destructive"
      });
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "uploading": return "📤 Uploading ZIP file...";
      case "extracting": return "📦 Extracting files...";
      case "packaging": return "🔧 Packaging Files...";
      case "building": return "🏗️ Building Installer...";
      case "complete": return "✅ EXE Ready for Download";
      case "error": return "❌ Conversion Failed";
      default: return "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="panel h-full w-full overflow-auto bg-gradient-to-br from-[hsl(var(--primary))] via-background to-[hsl(var(--accent))] relative">
      {/* Animated background overlay */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" />
      
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent animate-pulse">
                <Package className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
                CriderGPT ZIP-to-EXE Converter
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Convert your ZIP files into Windows executable installers
            </p>
            <p className="text-sm text-primary/80 font-medium italic">
              CriderGPT Builder — Smart Tools for Smart Makers
            </p>
          </div>

          {/* Safety Notice */}
          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary">
              🔒 This converter only processes files you upload locally. No data is sent externally.
            </AlertDescription>
          </Alert>

          {/* Upload Zone */}
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle>Upload ZIP File</CardTitle>
              <CardDescription>
                Drag and drop your .zip file or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer duration-300
                  ${isDragging 
                    ? 'border-primary bg-primary/10 scale-[1.02] shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]' 
                    : 'border-border hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]'
                  }
                `}
              >
              <input
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <FileArchive className="w-12 h-12 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold mb-1">
                      Drop your ZIP file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                  </div>
                  {file && (
                    <div className="mt-4 p-4 bg-background rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileArchive className="w-6 h-6 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

              {file && status === "idle" && (
                <Button 
                  onClick={convertToExe}
                  className="w-full mt-6 bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/50 transition-all duration-300"
                  size="lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Convert to EXE
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Conversion Progress */}
          {status !== "idle" && status !== "error" && (
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle>Conversion Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{getStatusMessage()}</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

                {status === "complete" && downloadUrl && (
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Conversion Successful!</span>
                    </div>
                    <Button 
                      onClick={() => window.open(downloadUrl, '_blank')}
                      className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300"
                      size="lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CriderGPT_Builder_Output.exe
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Console Log Output */}
          {logs.length > 0 && (
            <Card className="border-primary/20 shadow-lg bg-black/80">
              <CardHeader>
                <CardTitle className="text-green-500 font-mono flex items-center gap-2">
                  <span className="text-xs">$</span> Console Output
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto space-y-1">
                  {logs.map((log, index) => (
                    <div 
                      key={index}
                      className={`
                        ${log.type === "success" ? "text-green-400" : ""}
                        ${log.type === "error" ? "text-red-400" : ""}
                        ${log.type === "info" ? "text-cyan-400" : ""}
                      `}
                    >
                      <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Info */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-amber-600 dark:text-amber-500 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Technical Limitation Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                <strong>Note:</strong> Building Windows .exe installers requires Windows-specific tools (Inno Setup or Electron Builder) 
                that cannot run in browser or cloud environments.
              </p>
              <p className="text-muted-foreground">
                This is a demonstration interface. For actual .exe conversion, you would need to run this on a Windows server 
                or local machine with the appropriate build tools installed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
