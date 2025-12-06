import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMediaSystem, MediaCharacter } from '@/hooks/useMediaSystem';
import { User, Plus, Edit2, Crown, Clock } from 'lucide-react';

export function CharacterManager() {
  const { toast } = useToast();
  const { characters, addCharacter, updateCharacter } = useMediaSystem();
  
  const [editingChar, setEditingChar] = useState<MediaCharacter | null>(null);
  const [editTraits, setEditTraits] = useState('');
  const [editContext, setEditContext] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPronouns, setNewPronouns] = useState('they/them');
  const [newEra, setNewEra] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTraits, setNewTraits] = useState('');
  const [newContext, setNewContext] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleEditOpen = (char: MediaCharacter) => {
    setEditingChar(char);
    setEditTraits(char.traits || '');
    setEditContext(char.context || '');
    setEditDescription(char.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingChar) return;
    await updateCharacter(editingChar.id, {
      traits: editTraits,
      context: editContext,
      description: editDescription
    });
    setEditingChar(null);
  };

  const handleAddCharacter = async () => {
    if (!newName.trim() || !newImage) {
      toast({ title: "Error", description: "Name and image are required", variant: "destructive" });
      return;
    }
    setIsAdding(true);
    try {
      await addCharacter(newName, newImage, newPronouns, newEra || undefined, newDescription || undefined, newTraits || undefined, newContext || undefined);
      setNewName(''); setNewPronouns('they/them'); setNewEra(''); setNewDescription(''); setNewTraits(''); setNewContext(''); setNewImage(null);
      setShowAddForm(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Character References</h3>
          <p className="text-sm text-muted-foreground">Manage characters for accurate generation</p>
        </div>
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Character</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add New Character</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Character name" /></div>
              <div><Label>Reference Photo *</Label><Input type="file" accept="image/*" onChange={(e) => setNewImage(e.target.files?.[0] || null)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Pronouns</Label><Input value={newPronouns} onChange={(e) => setNewPronouns(e.target.value)} /></div>
                <div><Label>Era</Label><Input value={newEra} onChange={(e) => setNewEra(e.target.value)} placeholder="e.g., 1900s Western" /></div>
              </div>
              <div><Label>Traits</Label><Textarea value={newTraits} onChange={(e) => setNewTraits(e.target.value)} rows={2} /></div>
              <div><Label>Context</Label><Textarea value={newContext} onChange={(e) => setNewContext(e.target.value)} rows={2} /></div>
              <Button onClick={handleAddCharacter} disabled={isAdding} className="w-full">{isAdding ? 'Adding...' : 'Add Character'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((char) => (
          <Card key={char.id} className={char.isPrimary ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <img src={char.referenceUrl} alt={char.name} className="w-16 h-16 rounded-lg object-cover border" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base truncate">{char.name}</CardTitle>
                    {char.isPrimary && <Crown className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{char.pronouns}</p>
                  {char.era && <Badge variant="outline" className="text-[10px] mt-1"><Clock className="h-3 w-3 mr-1" />{char.era}</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {char.traits && <p className="text-xs"><span className="font-medium">Traits:</span> {char.traits}</p>}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-muted-foreground">{char.generationCount || 0} generations</span>
                <Button size="sm" variant="ghost" onClick={() => handleEditOpen(char)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
