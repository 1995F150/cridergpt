import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Plus, 
  X, 
  Image as ImageIcon, 
  FileArchive, 
  FileText,
  Loader2,
  Sparkles,
  Video,
  Phone
} from 'lucide-react';
import { CallModeInterface } from '@/components/CallModeInterface';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FilePreview {
  id: string;
  file: File;
  type: 'image' | 'zip' | 'document' | 'video';
  preview?: string;
  name: string;
  size: number;
}

interface ModernChatInputProps {
  onSendMessage: (message: string, files?: FilePreview[]) => Promise<void>;
  isLoading: boolean;
  placeholder?: string;
}

export const ModernChatInput: React.FC<ModernChatInputProps> = ({
  onSendMessage,
  isLoading,
  placeholder = "Message CriderGPT..."
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCallMode, setShowCallMode] = useState(false);
  const [processingPaste, setProcessingPaste] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  // Handle paste events for images
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        setProcessingPaste(true);
        
        const file = item.getAsFile();
        if (file) {
          await addImageFile(file);
          toast({
            title: "Image pasted",
            description: "Image ready to analyze",
          });
        }
        
        setProcessingPaste(false);
        break;
      }
    }
  };

  const addImageFile = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newFile: FilePreview = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type: 'image',
        preview: reader.result as string,
        name: file.name,
        size: file.size
      };
      setFiles(prev => [...prev, newFile]);
    };
    reader.readAsDataURL(file);
  };

  const addZipFile = (file: File) => {
    const newFile: FilePreview = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      type: 'zip',
      name: file.name,
      size: file.size
    };
    setFiles(prev => [...prev, newFile]);
    
    // Store upload event to memory
    if (user) {
      supabase.from('ai_memory').insert({
        user_id: user.id,
        category: 'fs_modding',
        topic: `ZIP Upload: ${file.name}`,
        details: `User uploaded ${file.name} (${formatFileSize(file.size)})`,
        source: 'conversation',
        metadata: {
          type: 'upload_event',
          filename: file.name,
          filetype: 'zip',
          timestamp: new Date().toISOString(),
          action: 'uploaded'
        }
      });
    }
  };

  const addDocumentFile = (file: File) => {
    const newFile: FilePreview = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      type: 'document',
      name: file.name,
      size: file.size
    };
    setFiles(prev => [...prev, newFile]);
  };

  const addVideoFile = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newFile: FilePreview = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type: 'video',
        preview: reader.result as string,
        name: file.name,
        size: file.size
      };
      setFiles(prev => [...prev, newFile]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'zip' | 'document' | 'video') => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach(file => {
      if (type === 'image') {
        addImageFile(file);
      } else if (type === 'zip') {
        addZipFile(file);
      } else if (type === 'video') {
        addVideoFile(file);
      } else {
        addDocumentFile(file);
      }
    });

    setShowUploadModal(false);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSend = async () => {
    if ((!message.trim() && files.length === 0) || isLoading) return;

    try {
      await onSendMessage(message, files);
      setMessage('');
      setFiles([]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    <div className="w-full space-y-2">
      {/* Call Mode Interface */}
      {showCallMode && (
        <CallModeInterface onClose={() => setShowCallMode(false)} />
      )}
      
      {/* File Preview Gallery */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg animate-in fade-in-50 duration-300">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative group bg-background border border-border rounded-lg p-2 flex items-center gap-2 animate-in fade-in-50 slide-in-from-bottom-2 duration-200"
            >
              {file.type === 'image' && file.preview && (
                <img 
                  src={file.preview} 
                  alt={file.name}
                  className="w-12 h-12 object-cover rounded"
                />
              )}
              {file.type === 'zip' && (
                <div className="w-12 h-12 bg-[#D8B142]/10 rounded flex items-center justify-center">
                  <FileArchive className="w-6 h-6 text-[#D8B142]" />
                </div>
              )}
              {file.type === 'document' && (
                <div className="w-12 h-12 bg-blue-500/10 rounded flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
              )}
              {file.type === 'video' && file.preview && (
                <div className="relative w-12 h-12 bg-purple-500/10 rounded flex items-center justify-center">
                  <Video className="w-6 h-6 text-purple-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(file.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input Container */}
      <div className="relative flex items-end gap-2 p-2 bg-background border border-border rounded-xl shadow-lg">
        {/* Plus Button */}
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 h-10 w-10 rounded-lg hover:bg-[#D8B142]/10 hover:text-[#D8B142] transition-all duration-200"
          onClick={() => setShowUploadModal(true)}
          disabled={isLoading}
        >
          <Plus className="h-5 w-5" />
        </Button>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={processingPaste ? "Processing image..." : placeholder}
          disabled={isLoading || processingPaste}
          className="min-h-[44px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
          rows={1}
        />

        {/* Call Button */}
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 h-10 w-10 rounded-lg hover:bg-green-500/10 hover:text-green-500 transition-all duration-200"
          onClick={() => setShowCallMode(!showCallMode)}
          disabled={isLoading}
        >
          <Phone className="h-5 w-5" />
        </Button>

        {/* Send Button */}
        <Button
          size="icon"
          className="shrink-0 h-10 w-10 rounded-lg bg-[#D8B142] hover:bg-[#D8B142]/90 text-[#081F35] transition-all duration-200 hover:shadow-lg hover:shadow-[#D8B142]/20"
          onClick={handleSend}
          disabled={isLoading || processingPaste || (!message.trim() && files.length === 0)}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#D8B142]" />
              Upload Files
            </DialogTitle>
            <DialogDescription>
              Choose what you'd like to upload to CriderGPT
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {/* Image Upload */}
            <Button
              variant="outline"
              className="h-auto p-4 justify-start hover:bg-blue-500/5 hover:border-blue-500/50 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'image')}
              />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ImageIcon className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Upload Image</div>
                  <div className="text-xs text-muted-foreground">PNG, JPG, WebP</div>
                </div>
              </div>
            </Button>

            {/* ZIP Upload */}
            <Button
              variant="outline"
              className="h-auto p-4 justify-start hover:bg-[#D8B142]/5 hover:border-[#D8B142]/50 transition-all"
              onClick={() => document.getElementById('zip-input')?.click()}
            >
              <input
                id="zip-input"
                type="file"
                accept=".zip,.rar,.7z"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'zip')}
              />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#D8B142]/10 rounded-lg">
                  <FileArchive className="h-5 w-5 text-[#D8B142]" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Upload ZIP / Mod File</div>
                  <div className="text-xs text-muted-foreground">ZIP, RAR, 7Z</div>
                </div>
              </div>
            </Button>

            {/* Document Upload */}
            <Button
              variant="outline"
              className="h-auto p-4 justify-start hover:bg-green-500/5 hover:border-green-500/50 transition-all"
              onClick={() => document.getElementById('doc-input')?.click()}
            >
              <input
                id="doc-input"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'document')}
              />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <FileText className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Upload Document</div>
                  <div className="text-xs text-muted-foreground">PDF, DOCX, TXT</div>
                </div>
              </div>
            </Button>

            {/* Video Upload */}
            <Button
              variant="outline"
              className="h-auto p-4 justify-start hover:bg-purple-500/5 hover:border-purple-500/50 transition-all"
              onClick={() => document.getElementById('video-input')?.click()}
            >
              <input
                id="video-input"
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'video')}
              />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Video className="h-5 w-5 text-purple-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Upload Video</div>
                  <div className="text-xs text-muted-foreground">MP4, MOV, AVI, MKV</div>
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
