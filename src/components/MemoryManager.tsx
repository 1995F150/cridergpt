import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIMemory, type AIMemory } from '@/hooks/useAIMemory';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function MemoryManager() {
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const { getRecentMemories, deleteMemory } = useAIMemory();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadMemories();
    }
  }, [user]);

  const loadMemories = async () => {
    const data = await getRecentMemories(50);
    setMemories(data);
  };

  const handleDelete = async (memoryId: string, topic: string) => {
    const success = await deleteMemory(memoryId);
    if (success) {
      toast({
        title: "Memory Deleted",
        description: `Removed: ${topic}`,
      });
      loadMemories();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete memory",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <p>Sign in to manage your AI memories</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">AI Memory Manager</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Remove unwanted memories that appear in AI responses
      </p>
      
      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{memory.topic}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {memory.details}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {memory.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(memory.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(memory.id, memory.topic)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          
          {memories.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No memories found
            </p>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
