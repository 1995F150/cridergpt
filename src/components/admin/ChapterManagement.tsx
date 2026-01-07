import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Edit2, 
  Search,
  MapPin,
  X,
  Check,
  Wheat
} from 'lucide-react';

interface Chapter {
  id: string;
  name: string;
  state: string;
  city: string | null;
  created_at: string;
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

export function ChapterManagement() {
  const { toast } = useToast();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Add form state
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterState, setNewChapterState] = useState('');
  const [newChapterCity, setNewChapterCity] = useState('');
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .order('state', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setChapters((data as Chapter[]) || []);
    } catch (error: any) {
      console.error('Error fetching chapters:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chapters.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, []);

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newChapterName.trim() || !newChapterState) {
      toast({
        title: 'Missing Fields',
        description: 'Please enter a chapter name and select a state.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('chapters').insert({
        name: newChapterName.trim(),
        state: newChapterState,
        city: newChapterCity.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Chapter Added',
        description: `${newChapterName} has been added successfully.`,
      });

      setNewChapterName('');
      setNewChapterState('');
      setNewChapterCity('');
      fetchChapters();
    } catch (error: any) {
      console.error('Error adding chapter:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add chapter.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChapter = async (chapter: Chapter) => {
    if (!confirm(`Are you sure you want to delete "${chapter.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapter.id);

      if (error) throw error;

      toast({
        title: 'Chapter Deleted',
        description: `${chapter.name} has been removed.`,
      });

      fetchChapters();
    } catch (error: any) {
      console.error('Error deleting chapter:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete chapter.',
        variant: 'destructive',
      });
    }
  };

  const startEdit = (chapter: Chapter) => {
    setEditingId(chapter.id);
    setEditName(chapter.name);
    setEditCity(chapter.city || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCity('');
  };

  const saveEdit = async (chapter: Chapter) => {
    if (!editName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Chapter name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          name: editName.trim(),
          city: editCity.trim() || null,
        })
        .eq('id', chapter.id);

      if (error) throw error;

      toast({
        title: 'Chapter Updated',
        description: 'Chapter details have been saved.',
      });

      cancelEdit();
      fetchChapters();
    } catch (error: any) {
      console.error('Error updating chapter:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update chapter.',
        variant: 'destructive',
      });
    }
  };

  // Filter chapters
  const filteredChapters = chapters.filter(chapter => {
    const matchesSearch = chapter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chapter.city?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesState = filterState === 'all' || chapter.state === filterState;
    return matchesSearch && matchesState;
  });

  // Get unique states from chapters for filter
  const statesWithChapters = [...new Set(chapters.map(c => c.state))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Chapter Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Chapter
          </CardTitle>
          <CardDescription>
            Directly add a new FFA chapter by state and city
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddChapter} className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="chapter-name">Chapter Name *</Label>
              <Input
                id="chapter-name"
                placeholder="e.g., Lincoln High FFA"
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapter-state">State *</Label>
              <Select value={newChapterState} onValueChange={setNewChapterState}>
                <SelectTrigger id="chapter-state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapter-city">City (Optional)</Label>
              <Input
                id="chapter-city"
                placeholder="e.g., Springfield"
                value={newChapterCity}
                onChange={(e) => setNewChapterCity(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Chapter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Chapters List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Wheat className="h-5 w-5 text-primary" />
              <CardTitle>All Chapters</CardTitle>
              <Badge variant="outline">{chapters.length} total</Badge>
            </div>
          </div>
          <CardDescription>
            Manage existing FFA chapters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {statesWithChapters.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chapters Grid */}
          {filteredChapters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No chapters found matching your criteria.
            </div>
          ) : (
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {filteredChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  {editingId === chapter.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        placeholder="Chapter name"
                      />
                      <Input
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        className="w-32"
                        placeholder="City"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{chapter.name}</span>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {chapter.city ? `${chapter.city}, ` : ''}{chapter.state}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    {editingId === chapter.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => saveEdit(chapter)}
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEdit}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(chapter)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteChapter(chapter)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
