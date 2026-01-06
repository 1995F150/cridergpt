import { useState, useRef, useCallback } from "react";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

export function ChatInput({ onSend, isLoading, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingPaste, setProcessingPaste] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => {
                fileInputRef.current?.setAttribute("accept", "image/*");
                fileInputRef.current?.click();
              }}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Image
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
            placeholder={processingPaste ? "Processing image..." : (placeholder || "Type a message... (Shift+Enter for new line)")}
            disabled={processingPaste}
            className="min-h-[44px] max-h-[200px] resize-none pr-12 bg-muted/50"
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
  );
}
