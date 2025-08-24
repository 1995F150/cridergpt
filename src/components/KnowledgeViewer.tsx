
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Search, Calendar, Tag } from 'lucide-react';
import { useAILearning } from '@/hooks/useAILearning';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AIInteraction {
  id: string;
  user_input: string;
  ai_response: string;
  context_tags: string[];
  topic?: string;
  category?: string;
  created_at: string;
}

export function KnowledgeViewer() {
  const { user } = useAuth();
  const { getKnowledgeStats } = useAILearning();
  const [interactions, setInteractions] = useState<AIInteraction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [knowledgeStats, setKnowledgeStats] = useState({
    totalInteractions: 0,
    categoriesKnown: [],
    recentTopics: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInteractions();
    loadStats();
  }, [user]);

  const loadStats = async () => {
    const stats = await getKnowledgeStats();
    setKnowledgeStats(stats);
  };

  const loadInteractions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('ai_interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (searchTerm) {
        query = query.textSearch('user_input', searchTerm);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading interactions:', error);
        return;
      }

      setInteractions(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadInteractions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Knowledge Base Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{knowledgeStats.totalInteractions}</div>
              <div className="text-sm text-muted-foreground">Total Interactions</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{knowledgeStats.categoriesKnown.length}</div>
              <div className="text-sm text-muted-foreground">Categories Known</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{knowledgeStats.recentTopics.length}</div>
              <div className="text-sm text-muted-foreground">Recent Topics</div>
            </div>
          </div>
          
          {knowledgeStats.categoriesKnown.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Knowledge Areas:</div>
              <div className="flex flex-wrap gap-1">
                {knowledgeStats.categoriesKnown.map((category) => (
                  <Badge key={category} variant="secondary">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Knowledge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search past conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />

          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading interactions...
              </div>
            ) : interactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No matching interactions found.' : 'No interactions stored yet.'}
              </div>
            ) : (
              <div className="space-y-4">
                {interactions.map((interaction) => (
                  <Card key={interaction.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm text-muted-foreground">
                            {new Date(interaction.created_at).toLocaleString()}
                          </div>
                          <div className="font-medium">Q: {interaction.user_input}</div>
                        </div>
                      </div>
                      
                      <div className="pl-6">
                        <div className="text-sm bg-muted p-2 rounded">
                          A: {interaction.ai_response.substring(0, 200)}
                          {interaction.ai_response.length > 200 && '...'}
                        </div>
                      </div>
                      
                      {interaction.context_tags && interaction.context_tags.length > 0 && (
                        <div className="pl-6 flex items-center gap-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {interaction.context_tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
