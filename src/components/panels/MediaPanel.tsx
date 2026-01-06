import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, FolderOpen, Sparkles, Video, Upload, Users } from 'lucide-react';
import { MediaLibrary } from '@/components/media/MediaLibrary';
import { MediaGenerator } from '@/components/media/MediaGenerator';
import { VideoGenerator } from '@/components/media/VideoGenerator';
import { MediaUpload } from '@/components/media/MediaUpload';
import { CharacterManager } from '@/components/media/CharacterManager';

export function MediaPanel() {
  const [activeTab, setActiveTab] = useState('library');
  const [remixSource, setRemixSource] = useState<{ url: string; path: string } | null>(null);

  const handleRemix = (item: { url: string; path: string }) => {
    setRemixSource(item);
    setActiveTab('generator');
  };

  return (
    <div className="flex-1 p-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            CriderGPT Media Studio
          </CardTitle>
          <p className="text-muted-foreground">
            Generate, edit, and manage AI-powered media with character references
          </p>
        </CardHeader>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="library" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </TabsTrigger>
          <TabsTrigger value="generator" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Generator</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Video</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="characters" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Characters</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-6">
          <MediaLibrary onRemix={handleRemix} />
        </TabsContent>

        <TabsContent value="generator" className="mt-6">
          <MediaGenerator 
            remixSource={remixSource} 
            onClearRemix={() => setRemixSource(null)} 
          />
        </TabsContent>

        <TabsContent value="video" className="mt-6">
          <VideoGenerator />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <MediaUpload />
        </TabsContent>

        <TabsContent value="characters" className="mt-6">
          <CharacterManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
