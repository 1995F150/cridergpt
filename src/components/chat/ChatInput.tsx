import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  X,
  Loader2,
  Sparkles,
  Mic,
  MicOff,
  Camera,
  Phone,
  Bot,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CameraSystem } from "@/components/CameraSystem";
import { CallModeInterface } from "@/components/CallModeInterface";
import { useToast } from "@/hooks/use-toast";

// Extend Window interface for speech recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface FilePreview {
  id: string;
  file: File;
  type: "image" | "document" | "audio" | "video";
  preview?: string;
  name: string;
  size: number;
}

interface ChatInputProps {
  onSend: (message: string, files?: FilePreview[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}

// Helper to convert data URL to File
function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export function ChatInput({ onSend, isLoading, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingPaste, setProcessingPaste] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showCallMode, setShowCallMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Initialize speech recognition
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser. Try Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak now, I'm listening!"
      });
    };

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      const transcript = results
        .map((result: any) => result[0].transcript)
        .join('');
      
      // Update message with transcript
      setMessage(prev => {
        // If there's existing text, add a space
        if (prev.trim() && !prev.endsWith(' ')) {
          return prev + ' ' + transcript;
        }
        return prev + transcript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access in your browser settings.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Speech Error",
          description: `Error: ${event.error}`,
          variant: "destructive"
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle photo captured from camera
  const handlePhotoCapture = useCallback((imageData: string) => {
    const file = dataURLtoFile(imageData, `camera-photo-${Date.now()}.jpg`);
    const preview: FilePreview = {
      id: `${Date.now()}-${Math.random()}`,
      file,
      type: 'image',
      name: file.name,
      size: file.size,
      preview: imageData,
    };
    setFiles(prev => [...prev, preview]);
    setShowCamera(false);
    toast({
      title: "Photo Added",
      description: "Your photo is ready to send!"
    });
  }, [toast]);

  // Handle paste events for images
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        setProcessingPaste(true);
        
        const file = item.getAsFile();
        if (file) {
          const preview: FilePreview = {
            id: `${Date.now()}-${Math.random()}`,
            file,
            type: 'image',
            name: file.name || 'pasted-image.png',
            size: file.size,
            preview: URL.createObjectURL(file),
          };
          setFiles((prev) => [...prev, preview]);
        }
        
        setProcessingPaste(false);
        break;
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null, type?: string) => {
      if (!selectedFiles) return;

      const newFiles: FilePreview[] = [];
      Array.from(selectedFiles).forEach((file) => {
        let fileType: FilePreview["type"] = "document";
        if (file.type.startsWith("image/")) fileType = "image";
        else if (file.type.startsWith("audio/")) fileType = "audio";
        else if (file.type.startsWith("video/")) fileType = "video";

        const preview: FilePreview = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          type: fileType,
          name: file.name,
          size: file.size,
        };

        if (fileType === "image") {
          preview.preview = URL.createObjectURL(file);
        }

        newFiles.push(preview);
      });

      setFiles((prev) => [...prev, ...newFiles]);
    },
    []
  );

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleSend = useCallback(() => {
    if ((!message.trim() && files.length === 0) || isLoading) return;
    onSend(message.trim(), files.length > 0 ? files : undefined);
    setMessage("");
    setFiles([]);
  }, [message, files, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const getFileIcon = (type: FilePreview["type"]) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "audio":
        return <Music className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check if message contains image generation keywords
  const isImageGeneration = /\b(generate|create|make|draw)\b.*\b(image|picture|photo|art)\b/i.test(message);

  return (
    <>
      {/* Call Mode Interface */}
      {showCallMode && (
        <div className="mb-4">
          <CallModeInterface onClose={() => setShowCallMode(false)} />
        </div>
      )}

      <div
        className={cn(
          "border-t border-border bg-card p-4",
          isDragging && "bg-primary/5 border-primary"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* File Previews */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="relative group flex items-center gap-2 bg-muted rounded-lg p-2 pr-8"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : (
                  <div className="h-10 w-10 bg-muted-foreground/10 rounded flex items-center justify-center">
                    {getFileIcon(file.type)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate max-w-[120px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemoveFile(file.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-2">
          {/* Attachment Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover">
              <DropdownMenuItem
                onClick={() => {
                  fileInputRef.current?.setAttribute("accept", "image/*");
                  fileInputRef.current?.click();
                }}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Upload Image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCamera(true)}>
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  fileInputRef.current?.setAttribute("accept", ".pdf,.doc,.docx,.txt");
                  fileInputRef.current?.click();
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Document (PDF, Word)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  fileInputRef.current?.setAttribute("accept", "audio/*");
                  fileInputRef.current?.click();
                }}
              >
                <Music className="h-4 w-4 mr-2" />
                Audio (MP3)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  fileInputRef.current?.setAttribute("accept", "video/*");
                  fileInputRef.current?.click();
                }}
              >
                <Video className="h-4 w-4 mr-2" />
                Video (MP4)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={processingPaste ? "Processing image..." : (isListening ? "Listening..." : (placeholder || "Type a message... (Shift+Enter for new line)"))}
              disabled={processingPaste}
              className={cn(
                "min-h-[44px] max-h-[200px] resize-none pr-12 bg-muted/50",
                isListening && "border-red-500 animate-pulse"
              )}
              rows={1}
            />
            {isImageGeneration && (
              <Badge
                variant="secondary"
                className="absolute right-2 bottom-2 text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Image
              </Badge>
            )}
          </div>

          {/* Speech-to-Text Button */}
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "shrink-0 transition-colors",
              isListening && "bg-red-500/20 text-red-500 border-red-500 animate-pulse"
            )}
            onClick={isListening ? stopListening : startListening}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          {/* Call Button */}
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "shrink-0 transition-colors hover:bg-green-500/10 hover:text-green-500 hover:border-green-500",
              showCallMode && "bg-green-500/20 text-green-500 border-green-500"
            )}
            onClick={() => setShowCallMode(!showCallMode)}
            title="Start voice call with AI"
          >
            <Phone className="h-4 w-4" />
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={isLoading || (!message.trim() && files.length === 0)}
            className="shrink-0 bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
            <p className="text-primary font-medium">Drop files here</p>
          </div>
        )}
      </div>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Take a Photo</DialogTitle>
          </DialogHeader>
          <CameraSystem
            mode="photo"
            onPhotoCapture={handlePhotoCapture}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}