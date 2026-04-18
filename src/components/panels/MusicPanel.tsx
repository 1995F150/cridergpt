import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Music, Search, Play } from 'lucide-react';
import { toast } from 'sonner';

interface Track {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt: string;
}

export function MusicPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Track[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-search', {
        body: { query: query.trim(), maxResults: 16 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data.results || []);
      if (!data.results?.length) toast.info('No results found');
    } catch (e: any) {
      toast.error(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Music</h2>
          <span className="text-xs text-muted-foreground ml-2">Powered by YouTube</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search songs, artists, albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            disabled={loading}
          />
          <Button onClick={search} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {nowPlaying && (
        <div className="border-b border-border p-4 bg-muted/30">
          <div className="text-xs text-muted-foreground mb-2 truncate">
            Now playing: <span className="text-foreground font-medium">{nowPlaying.title}</span>
          </div>
          <div className="aspect-video w-full max-w-2xl mx-auto bg-black rounded-md overflow-hidden">
            <iframe
              key={nowPlaying.videoId}
              src={`https://www.youtube.com/embed/${nowPlaying.videoId}?autoplay=1`}
              title={nowPlaying.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((t) => (
            <Card
              key={t.videoId}
              className="p-3 cursor-pointer hover:bg-accent transition-colors group"
              onClick={() => setNowPlaying(t)}
            >
              <div className="relative aspect-video rounded overflow-hidden bg-muted mb-2">
                <img src={t.thumbnail} alt={t.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-10 w-10 text-white fill-white" />
                </div>
              </div>
              <div className="text-sm font-medium line-clamp-2">{t.title}</div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{t.channel}</div>
            </Card>
          ))}
          {!loading && results.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12">
              <Music className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Search YouTube Music to start playing</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
