import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TrainingData {
  id: string;
  context: string;
  example_input?: string;
  example_response?: string;
  data_type: 'personal_info' | 'preference' | 'experience' | 'knowledge';
  tags: string[];
  created_at: string;
}

export function TrainingDataManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newEntry, setNewEntry] = useState({
    context: '',
    example_input: '',
    example_response: '',
    data_type: 'personal_info' as const,
    tags: ''
  });

  const loadTrainingData = async () => {
    if (!user) return;

    try {
      // For now, we'll store in localStorage until the DB migration is approved
      const stored = localStorage.getItem(`training_data_${user.id}`);
      if (stored) {
        setTrainingData(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading training data:', error);
    }
  };

  useEffect(() => {
    loadTrainingData();
  }, [user]);

  const saveToStorage = (data: TrainingData[]) => {
    if (!user) return;
    localStorage.setItem(`training_data_${user.id}`, JSON.stringify(data));
    setTrainingData(data);
  };

  const addTrainingEntry = () => {
    if (!newEntry.context.trim()) {
      toast({
        title: "Context Required",
        description: "Please add some context about yourself",
        variant: "destructive"
      });
      return;
    }

    const entry: TrainingData = {
      id: crypto.randomUUID(),
      context: newEntry.context,
      example_input: newEntry.example_input || undefined,
      example_response: newEntry.example_response || undefined,
      data_type: newEntry.data_type,
      tags: newEntry.tags ? newEntry.tags.split(',').map(t => t.trim()) : [],
      created_at: new Date().toISOString()
    };

    const updated = [...trainingData, entry];
    saveToStorage(updated);

    setNewEntry({
      context: '',
      example_input: '',
      example_response: '',
      data_type: 'personal_info',
      tags: ''
    });

    toast({
      title: "Training Data Added",
      description: "CriderGPT will learn from this information"
    });
  };

  const removeEntry = (id: string) => {
    const updated = trainingData.filter(entry => entry.id !== id);
    saveToStorage(updated);
    
    toast({
      title: "Entry Removed",
      description: "Training data has been deleted"
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'personal_info': return 'bg-blue-500/10 text-blue-500';
      case 'preference': return 'bg-green-500/10 text-green-500';
      case 'experience': return 'bg-purple-500/10 text-purple-500';
      case 'knowledge': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Train CriderGPT About You
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Context/Information</label>
              <Textarea
                placeholder="Tell CriderGPT something about yourself (e.g., 'I prefer Ford trucks over Chevy', 'My favorite farming technique is no-till', 'I code in TypeScript and React')"
                value={newEntry.context}
                onChange={(e) => setNewEntry(prev => ({ ...prev, context: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Example Question (Optional)</label>
                <Input
                  placeholder="What someone might ask about this"
                  value={newEntry.example_input}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, example_input: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Expected Response (Optional)</label>
                <Input
                  placeholder="How CriderGPT should respond"
                  value={newEntry.example_response}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, example_response: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  value={newEntry.data_type}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, data_type: e.target.value as any }))}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="personal_info">Personal Info</option>
                  <option value="preference">Preference</option>
                  <option value="experience">Experience</option>
                  <option value="knowledge">Knowledge</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  placeholder="farming, coding, trucks, etc."
                  value={newEntry.tags}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, tags: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <Button onClick={addTrainingEntry} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Training Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Training Data ({trainingData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {trainingData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No training data yet. Add some information about yourself above!
            </p>
          ) : (
            <div className="space-y-4">
              {trainingData.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={getTypeColor(entry.data_type)}>
                      {entry.data_type.replace('_', ' ')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(entry.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-sm mb-2">{entry.context}</p>
                  
                  {entry.example_input && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Q:</strong> {entry.example_input}
                    </div>
                  )}
                  
                  {entry.example_response && (
                    <div className="text-xs text-muted-foreground">
                      <strong>A:</strong> {entry.example_response}
                    </div>
                  )}
                  
                  {entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {entry.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}