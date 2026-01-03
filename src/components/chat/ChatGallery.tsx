import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Trash2,
  X,
  Calendar,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  Grid3X3,
  List,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  name: string;
  url: string;
  path: string;
  type: "image" | "document" | "audio" | "video";
  size: number;
  created_at: string;
  prompt?: string;
  metadata?: any;
}

interface ChatGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatGallery({ open, onOpenChange }: ChatGalleryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [filterType, setFilterType] = useState<"all" | "image" | "document" | "audio" | "video">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (open && user) {
      loadMedia();
    }
  }, [open, user]);

  const loadMedia = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load from media_generations table
      const { data: generations, error: genError } = await supabase
        .from("media_generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (genError) throw genError;

      // Load from uploaded_files storage
      const { data: uploads, error: uploadError } = await supabase.storage
        .from("uploaded-files")
        .list(user.id);

      const mediaItems: MediaItem[] = [];

      // Process generations
      generations?.forEach((gen) => {
        if (gen.output_url) {
          mediaItems.push({
            id: gen.id,
            name: `AI Generated - ${gen.prompt?.substring(0, 30) || "Image"}...`,
            url: gen.output_url,
            path: gen.output_path || "",
            type: gen.output_type === "video" ? "video" : "image",
            size: 0,
            created_at: gen.created_at || new Date().toISOString(),
            prompt: gen.prompt,
            metadata: gen.visual_settings,
          });
        }
      });

      // Process uploads
      if (uploads) {
        for (const file of uploads) {
          const { data: urlData } = supabase.storage
            .from("uploaded-files")
            .getPublicUrl(`${user.id}/${file.name}`);

          let type: MediaItem["type"] = "document";
          if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) type = "image";
          else if (file.name.match(/\.(mp3|wav|ogg)$/i)) type = "audio";
          else if (file.name.match(/\.(mp4|webm|mov)$/i)) type = "video";

          mediaItems.push({
            id: file.id || file.name,
            name: file.name,
            url: urlData.publicUrl,
            path: `${user.id}/${file.name}`,
            type,
            size: file.metadata?.size || 0,
            created_at: file.created_at || new Date().toISOString(),
          });
        }
      }

      setItems(mediaItems);
    } catch (error) {
      console.error("Error loading media:", error);
      toast({
        title: "Error",
        description: "Failed to load media",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    try {
      if (item.path) {
        await supabase.storage.from("uploaded-files").remove([item.path]);
      }
      
      // Try to delete from media_generations too
      await supabase.from("media_generations").delete().eq("id", item.id);

      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedItem(null);
      toast({ title: "Deleted", description: "Media item removed" });
    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleDownload = async (item: MediaItem) => {
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Error", description: "Failed to download", variant: "destructive" });
    }
  };

  const filteredItems = items
    .filter((item) => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        if (item.prompt && !item.prompt.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.name.localeCompare(b.name);
    });

  const getTypeIcon = (type: MediaItem["type"]) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            AI Media Gallery
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 py-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No media found</p>
              <p className="text-sm">Generate images or upload files to see them here</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer border border-border hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  {item.type === "image" ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      {getTypeIcon(item.type)}
                      <span className="text-xs mt-2 text-muted-foreground px-2 text-center truncate w-full">
                        {item.name}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs truncate">{item.name}</p>
                      <p className="text-white/70 text-xs">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  {item.type === "image" ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                      {getTypeIcon(item.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Item Detail Modal */}
        {selectedItem && (
          <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="truncate">{selectedItem.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedItem.type === "image" ? (
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.name}
                    className="w-full rounded-lg"
                  />
                ) : selectedItem.type === "video" ? (
                  <video src={selectedItem.url} controls className="w-full rounded-lg" />
                ) : selectedItem.type === "audio" ? (
                  <audio src={selectedItem.url} controls className="w-full" />
                ) : (
                  <div className="p-8 bg-muted rounded-lg text-center">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="mt-4">{selectedItem.name}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-2 text-sm">
                  {selectedItem.prompt && (
                    <div>
                      <span className="font-medium">Prompt:</span>
                      <p className="text-muted-foreground">{selectedItem.prompt}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <span>
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {new Date(selectedItem.created_at).toLocaleString()}
                    </span>
                    <Badge>{selectedItem.type}</Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleDownload(selectedItem)} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedItem)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
