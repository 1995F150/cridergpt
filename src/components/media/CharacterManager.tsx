import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMediaSystem } from '@/hooks/useMediaSystem';
import { Edit2, Crown, Clock, Save, X } from 'lucide-react';

export function CharacterManager() {
  const { toast } = useToast();
  const { characters, updateCharacter } = useMediaSystem();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTraits, setEditTraits] = useState('');
  const [editContext, setEditContext] = useState('');

  const handleEditStart = (char: typeof characters[0]) => {
    setEditingId(char.id);
    setEditTraits(char.traits || '');
    setEditContext(char.context || '');
  };

  const handleSave = async (id: string) => {
    await updateCharacter(id, {
      traits: editTraits,
      context: editContext
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditTraits('');
    setEditContext('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Character References</h3>
        <p className="text-sm text-muted-foreground">
          Edit traits and context for each character. This info is used during generation for accuracy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {characters.map((char) => (
          <Card key={char.id} className={char.isPrimary ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <img 
                  src={char.referenceUrl} 
                  alt={char.name} 
                  className="w-16 h-16 rounded-lg object-cover border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base truncate">{char.name}</CardTitle>
                    {char.isPrimary && <Crown className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{char.pronouns}</p>
                  {char.era && (
                    <Badge variant="outline" className="text-[10px] mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {char.era}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editingId === char.id ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Traits</Label>
                    <Textarea 
                      value={editTraits} 
                      onChange={(e) => setEditTraits(e.target.value)}
                      rows={2}
                      className="text-xs"
                      placeholder="Physical traits, style..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Context</Label>
                    <Textarea 
                      value={editContext} 
                      onChange={(e) => setEditContext(e.target.value)}
                      rows={2}
                      className="text-xs"
                      placeholder="Additional context for AI..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(char.id)} className="flex-1">
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {char.traits && (
                    <p className="text-xs">
                      <span className="font-medium">Traits:</span> {char.traits}
                    </p>
                  )}
                  {char.context && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {char.context}
                    </p>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-muted-foreground">
                      {char.generationCount || 0} generations
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => handleEditStart(char)}>
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
