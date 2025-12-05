import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trash2, Download, Loader2, Image as ImageIcon, 
  ZoomIn, Grid3X3, List, Search, Wand2, Filter
} from 'lucide-react';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  path: string;
  source: string;
  size: number;
  createdAt: string;
  metadata?: any;
}

interface MediaLibraryProps {
  onRemix?: (item: MediaItem) => void;
}

export function MediaLibrary({ onRemix }: MediaLibraryProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) loadLibrary();
  }, [user]);

  const loadLibrary = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: files, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const mediaItems: MediaItem[] = (files || []).map((f: any) => {
        const { data: urlData } = supabase.storage
          .from('user-files')
          .getPublicUrl(f.file_path);
        
        return {
          id: String(f.id),
          name: f.file_name,
          url: urlData.publicUrl,
          path: f.file_path,
          source: f.source || 'upload',
          size: f.file_size || 0,
          createdAt: f.uploaded_at || new Date().toISOString(),
          metadata: f.metadata
        };
      });

      setItems(mediaItems);
    } catch (error) {
      console.error('Error loading library:', error);
      toast({ title: "Error", description: "Failed to load library", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    try {
      await supabase.storage.from('user-files').remove([item.path]);
      await supabase.from('uploaded_files').delete().eq('file_path', item.path);
      
      toast({ title: "Deleted", description: "Media removed from library" });
      setSelectedItem(null);
      loadLibrary();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleDownload = async (item: MediaItem) => {
    try {
      const { data, error } = await supabase.storage.from('user-files').download(item.path);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Error", description: "Failed to download", variant: "destructive" });
    }
  };

  const getSourceBadge = (source: string) => {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      'ai_generated': { label: 'AI Generated', variant: 'default' },
      'character_gen': { label: 'Character', variant: 'secondary' },
      'creator_edit': { label: 'Creator Edit', variant: 'secondary' },
      'ai_edited': { label: 'AI Edited', variant: 'outline' },
      'upload': { label: 'Uploaded', variant: 'outline' }
    };
    return badges[source] || { label: source, variant: 'outline' as const };
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterSource === 'all' || item.source === filterSource;
    return matchesSearch && matchesFilter;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="bg-background border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Sources</option>
                <option value="ai_generated">AI Generated</option>
                <option value="character_gen">Character Gen</option>
                <option value="upload">Uploaded</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
            <Badge variant="secondary">{filteredItems.length} items</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">No media found</p>
            <p className="text-sm text-muted-foreground">Generate or upload images to build your library</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map((item) => {
            const badge = getSourceBadge(item.source);
            return (
              <div key={item.id} className="group relative aspect-square">
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg border border-border cursor-pointer transition-all group-hover:scale-[1.02]"
                  onClick={() => setSelectedItem(item)}
                />
                <div className="absolute top-2 left-2">
                  <Badge variant={badge.variant} className="text-xs">
                    {badge.label}
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button size="icon" variant="secondary" onClick={() => setSelectedItem(item)}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    {onRemix && (
                      <Button size="icon" variant="secondary" onClick={() => onRemix(item)}>
                        <Wand2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const badge = getSourceBadge(item.source);
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex items-center gap-4 p-3">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded border cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                      <span className="text-xs text-muted-foreground">{formatFileSize(item.size)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {onRemix && (
                      <Button size="icon" variant="ghost" onClick={() => onRemix(item)}>
                        <Wand2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => handleDownload(item)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Image Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="max-w-4xl max-h-full bg-card rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selectedItem.name}</h3>
                <Badge variant={getSourceBadge(selectedItem.source).variant} className="mt-1">
                  {getSourceBadge(selectedItem.source).label}
                </Badge>
              </div>
              <div className="flex gap-2">
                {onRemix && (
                  <Button variant="outline" size="sm" onClick={() => { onRemix(selectedItem); setSelectedItem(null); }}>
                    <Wand2 className="h-4 w-4 mr-1" /> Remix
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handleDownload(selectedItem)}>
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(selectedItem)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)}>Close</Button>
              </div>
            </div>
            <div className="p-4">
              <img src={selectedItem.url} alt={selectedItem.name} className="max-w-full max-h-[70vh] object-contain mx-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
