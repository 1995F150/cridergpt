import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, AlertTriangle, Clock } from 'lucide-react';
import type { LivestockAnimal } from '@/hooks/useLivestock';

interface AnimalCardProps {
  animal: LivestockAnimal;
  onClick: () => void;
}

const speciesEmoji: Record<string, string> = {
  cattle: '🐄',
  pig: '🐷',
  sheep: '🐑',
  goat: '🐐',
  chicken: '🐔',
  horse: '🐴',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  sick: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  sold: 'bg-muted text-muted-foreground',
  deceased: 'bg-muted text-muted-foreground',
  transferred: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

function getAge(birthDate: string | null): string {
  if (!birthDate) return '—';
  const birth = new Date(birthDate);
  const now = new Date();
  const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months > 0 ? `${years}y ${months}mo` : `${years}y`;
}

export function AnimalCard({ animal, onClick }: AnimalCardProps) {
  const emoji = speciesEmoji[animal.species] || '🐾';
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <div>
              <h3 className="font-semibold text-foreground leading-tight">
                {animal.name || animal.animal_id}
              </h3>
              <p className="text-xs text-muted-foreground">
                {animal.animal_id} · {animal.breed || animal.species}
              </p>
            </div>
          </div>
          <Badge className={`text-xs border-0 ${statusColors[animal.status] || statusColors.active}`}>
            {animal.status}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
          {animal.sex && (
            <span>{animal.sex === 'male' ? '♂' : '♀'} {animal.sex}</span>
          )}
          {animal.birth_date && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getAge(animal.birth_date)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
