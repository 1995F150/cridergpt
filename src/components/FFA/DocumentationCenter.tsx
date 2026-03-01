import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Camera, 
  FileText, 
  Trophy, 
  BookOpen, 
  Plus, 
  Upload, 
  Calendar,
  Download,
  Trash2,
  Eye,
  ArrowLeft,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFFAProfile } from "@/hooks/useFFAProfile";

type DocSection = 'photos' | 'minutes' | 'awards' | 'history' | null;

interface ChapterDocument {
  id: string;
  title: string;
  description: string | null;
  document_type: string;
  file_url: string | null;
  created_at: string;
  created_by: string;
  is_public: boolean;
}

interface ChapterAward {
  id: string;
  title: string;
  description: string | null;
  award_type: string | null;
  award_date: string | null;
  created_at: string;
}

export function DocumentationCenter() {
  const { profile, chapter, isOfficer, isAdvisor } = useFFAProfile();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<DocSection>(null);
  const [documents, setDocuments] = useState<ChapterDocument[]>([]);
  const [awards, setAwards] = useState<ChapterAward[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAwardType, setNewAwardType] = useState('');
  const [newAwardDate, setNewAwardDate] = useState('');

  const canEdit = isOfficer || isAdvisor;

  useEffect(() => {
    if (activeSection && profile?.chapter_id) {
      fetchData();
    }
  }, [activeSection, profile?.chapter_id]);

  const fetchData = async () => {
    if (!profile?.chapter_id) return;
    
    setLoading(true);
    try {
      if (activeSection === 'awards') {
        const { data, error } = await supabase
          .from('chapter_awards')
          .select('*')
          .eq('chapter_id', profile.chapter_id)
          .order('award_date', { ascending: false });
        
        if (error) throw error;
        setAwards(data || []);
      } else if (activeSection) {
        const docType = activeSection === 'photos' ? 'photo' : 
                        activeSection === 'minutes' ? 'minutes' : 'history';
        
        const { data, error } = await (supabase as any)
          .from('chapter_documents')
          .select('*')
          .eq('chapter_id', profile.chapter_id)
          .eq('document_type', docType)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setDocuments(data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newTitle.trim() || !profile?.chapter_id) return;

    try {
      if (activeSection === 'awards') {
        const { error } = await supabase
          .from('chapter_awards')
          .insert({
            chapter_id: profile.chapter_id,
            title: newTitle,
            description: newDescription || null,
            award_type: newAwardType || null,
            award_date: newAwardDate || null,
            user_id: profile.user_id
          });
        
        if (error) throw error;
      } else {
        const docType = activeSection === 'photos' ? 'photo' : 
                        activeSection === 'minutes' ? 'minutes' : 'history';
        
        const { error } = await (supabase as any)
          .from('chapter_documents')
          .insert({
            chapter_id: profile.chapter_id,
            title: newTitle,
            description: newDescription || null,
            document_type: docType,
            created_by: profile.user_id
          });
        
        if (error) throw error;
      }

      toast({ title: "Success", description: "Item added successfully" });
      setAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (id: string, type: 'document' | 'award') => {
    try {
      const table = type === 'award' ? 'chapter_awards' : 'chapter_documents';
      const { error } = await (supabase as any).from(table).delete().eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Deleted", description: "Item deleted successfully" });
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewAwardType('');
    setNewAwardDate('');
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'photos': return 'Photo Archive';
      case 'minutes': return 'Meeting Minutes';
      case 'awards': return 'Awards & Recognition';
      case 'history': return 'Chapter History';
      default: return 'Documentation Center';
    }
  };

  const getSectionIcon = () => {
    switch (activeSection) {
      case 'photos': return Camera;
      case 'minutes': return FileText;
      case 'awards': return Trophy;
      case 'history': return BookOpen;
      default: return FileText;
    }
  };

  // Main grid view
  if (!activeSection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentation Center
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage chapter records, photos, and historical documents
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => setActiveSection('photos')}
            >
              <Camera className="h-8 w-8 text-primary" />
              <span className="font-medium">Photo Archive</span>
              <span className="text-xs text-muted-foreground">Chapter photos and memories</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => setActiveSection('minutes')}
            >
              <FileText className="h-8 w-8 text-primary" />
              <span className="font-medium">Meeting Minutes</span>
              <span className="text-xs text-muted-foreground">Official meeting records</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => setActiveSection('awards')}
            >
              <Trophy className="h-8 w-8 text-primary" />
              <span className="font-medium">Awards & Recognition</span>
              <span className="text-xs text-muted-foreground">Chapter achievements</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => setActiveSection('history')}
            >
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="font-medium">Chapter History</span>
              <span className="text-xs text-muted-foreground">Historical documents</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const SectionIcon = getSectionIcon();

  // Section detail view
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setActiveSection(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <SectionIcon className="h-5 w-5" />
                  {getSectionTitle()}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {chapter?.name || 'Your Chapter'}
                </p>
              </div>
            </div>
            {canEdit && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add {activeSection === 'awards' ? 'Award' : 'Document'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : activeSection === 'awards' ? (
            // Awards view
            awards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No awards recorded yet</p>
                {canEdit && (
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Award
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {awards.map((award) => (
                  <div key={award.id} className="p-4 border rounded-lg flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{award.title}</h4>
                        {award.description && (
                          <p className="text-sm text-muted-foreground mt-1">{award.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {award.award_type && (
                            <Badge variant="secondary">{award.award_type}</Badge>
                          )}
                          {award.award_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(award.award_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteItem(award.id, 'award')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            // Documents view
            documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <SectionIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No {activeSection} recorded yet</p>
                {canEdit && (
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Entry
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 border rounded-lg flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {activeSection === 'photos' ? (
                          <ImageIcon className="h-5 w-5 text-primary" />
                        ) : (
                          <FileText className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{doc.title}</h4>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.file_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {canEdit && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteItem(doc.id, 'document')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {activeSection === 'awards' ? 'Award' : 'Document'}
            </DialogTitle>
            <DialogDescription>
              {activeSection === 'awards' 
                ? 'Record a new chapter award or recognition'
                : 'Add a new document to your chapter records'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={activeSection === 'awards' ? 'Award name' : 'Document title'}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            {activeSection === 'awards' && (
              <>
                <div>
                  <label className="text-sm font-medium">Award Type</label>
                  <Input 
                    value={newAwardType}
                    onChange={(e) => setNewAwardType(e.target.value)}
                    placeholder="e.g., State Award, CDE, SAE"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Award Date</label>
                  <Input 
                    type="date"
                    value={newAwardDate}
                    onChange={(e) => setNewAwardDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={!newTitle.trim()}>
              Add {activeSection === 'awards' ? 'Award' : 'Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
