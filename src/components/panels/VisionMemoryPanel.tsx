import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Eye, Trash2, Calendar, Filter, Image as ImageIcon } from "lucide-react";
import { useVisionMemory, VisionMemoryEntry } from "@/hooks/useVisionMemory";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const CATEGORIES = [
  "All Categories",
  "Receipt",
  "Document",
  "Meme",
  "FFA Project",
  "Field Photo",
  "Farm Equipment",
  "general"
];

export function VisionMemoryPanel() {
  const [memories, setMemories] = useState<VisionMemoryEntry[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<VisionMemoryEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedMemory, setSelectedMemory] = useState<VisionMemoryEntry | null>(null);
  
  const { getRecentMemories, getMemoriesByCategory, deleteMemory, isLoading } = useVisionMemory();
  const { toast } = useToast();

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    filterMemories();
  }, [memories, selectedCategory, dateFilter]);

  const loadMemories = async () => {
    const data = await getRecentMemories(50);
    setMemories(data);
  };

  const filterMemories = () => {
    let filtered = memories;

    // Category filter
    if (selectedCategory !== "All Categories") {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(m => {
        const memoryDate = format(new Date(m.created_at), 'yyyy-MM-dd');
        return memoryDate === dateFilter;
      });
    }

    setFilteredMemories(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory(id);
      toast({
        title: "Memory Deleted",
        description: "Vision memory entry removed successfully.",
      });
      loadMemories();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete memory entry.",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Receipt": "bg-green-500/20 text-green-700 border-green-500/30",
      "Document": "bg-blue-500/20 text-blue-700 border-blue-500/30",
      "Meme": "bg-purple-500/20 text-purple-700 border-purple-500/30",
      "FFA Project": "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
      "Field Photo": "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
      "Farm Equipment": "bg-orange-500/20 text-orange-700 border-orange-500/30",
      "general": "bg-gray-500/20 text-gray-700 border-gray-500/30"
    };
    return colors[category] || colors["general"];
  };

  if (isLoading && memories.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading vision memory...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Vision Memory Dashboard
            <Badge variant="secondary" className="ml-auto">
              {memories.length} memories
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Filter className="h-4 w-4" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Calendar className="h-4 w-4" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Filter by date"
              />
            </div>

            {(selectedCategory !== "All Categories" || dateFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory("All Categories");
                  setDateFilter("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Memory Grid */}
          <ScrollArea className="h-[600px]">
            {filteredMemories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No vision memories found.</p>
                <p className="text-sm mt-2">Upload images in the main chat to start building your memory!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMemories.map((memory) => (
                  <Card key={memory.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={memory.thumbnail_url || memory.image_url}
                        alt="Memory thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <Badge 
                        className={`absolute top-2 right-2 ${getCategoryColor(memory.category)}`}
                      >
                        {memory.category}
                      </Badge>
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(memory.created_at), 'MMM dd, yyyy')}
                        </span>
                        <span>{format(new Date(memory.created_at), 'h:mm a')}</span>
                      </div>
                      
                      <p className="text-sm line-clamp-3">{memory.ai_response}</p>
                      
                      {memory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {memory.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setSelectedMemory(memory)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(memory.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedMemory && (
        <Card className="fixed inset-4 z-50 overflow-auto">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Vision Memory Detail</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(selectedMemory.created_at), 'MMMM dd, yyyy - h:mm a')}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMemory(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge className={getCategoryColor(selectedMemory.category)}>
                {selectedMemory.category}
              </Badge>
              {selectedMemory.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline">{tag}</Badge>
              ))}
            </div>
            
            <img
              src={selectedMemory.image_url}
              alt="Full resolution"
              className="w-full rounded-lg"
            />
            
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">AI Analysis:</h4>
              <p className="whitespace-pre-wrap">{selectedMemory.ai_response}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
