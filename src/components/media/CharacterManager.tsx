import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DEFAULT_CHARACTERS, MediaCharacter } from '@/hooks/useMediaSystem';
import { User, Crown, Clock, Trash2 } from 'lucide-react';

interface CharacterManagerProps {
  characters?: MediaCharacter[];
  onRemoveCharacter?: (id: string) => void;
}

export function CharacterManager({ 
  characters = DEFAULT_CHARACTERS,
  onRemoveCharacter 
}: CharacterManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Characters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {characters.map(char => (
          <div 
            key={char.id} 
            className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg border"
          >
            <img 
              src={char.referenceUrl} 
              alt={char.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{char.name}</span>
                {char.isPrimary && (
                  <Badge variant="default" className="gap-1">
                    <Crown className="h-3 w-3" />
                    Primary
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{char.pronouns}</p>
              {char.era && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{char.era}</span>
                </div>
              )}
              {char.description && (
                <p className="text-xs text-muted-foreground mt-1">{char.description}</p>
              )}
            </div>
            {!char.isPrimary && onRemoveCharacter && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-destructive"
                onClick={() => onRemoveCharacter(char.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        
        <p className="text-xs text-muted-foreground pt-2">
          Characters are used as references when generating images. Select them in the generator to include them in your creations.
        </p>
      </CardContent>
    </Card>
  );
}
