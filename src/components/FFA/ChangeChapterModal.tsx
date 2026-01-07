import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFFAProfile } from '@/hooks/useFFAProfile';
import { Loader2, Wheat } from 'lucide-react';

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

interface ChangeChapterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeChapterModal({ open, onOpenChange }: ChangeChapterModalProps) {
  const { chapters, profile, chapter, updateProfile, refetch } = useFFAProfile();
  const [loading, setLoading] = useState(false);
  
  const [selectedState, setSelectedState] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');

  // Initialize with current values when modal opens
  useEffect(() => {
    if (open && profile) {
      setSelectedState(profile.state || '');
      setSelectedChapter(profile.chapter_id || '');
    }
  }, [open, profile]);

  const filteredChapters = chapters.filter(c => c.state === selectedState);

  const handleSubmit = async () => {
    if (!selectedChapter || !selectedState) return;

    setLoading(true);
    try {
      await updateProfile({
        chapter_id: selectedChapter,
        state: selectedState,
      });
      await refetch();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = selectedChapter !== profile?.chapter_id || selectedState !== profile?.state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-primary" />
            Change Chapter
          </DialogTitle>
          <DialogDescription>
            Update your FFA chapter assignment
          </DialogDescription>
        </DialogHeader>

        {chapter && (
          <div className="p-3 bg-muted/50 rounded-lg mb-2">
            <p className="text-xs text-muted-foreground">Current Chapter</p>
            <p className="font-medium text-sm">{chapter.name}</p>
            <p className="text-xs text-muted-foreground">
              {chapter.city && `${chapter.city}, `}{chapter.state}
            </p>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select value={selectedState} onValueChange={(value) => {
              setSelectedState(value);
              setSelectedChapter(''); // Reset chapter when state changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chapter">Chapter</Label>
            <Select value={selectedChapter} onValueChange={setSelectedChapter}>
              <SelectTrigger>
                <SelectValue placeholder="Select your chapter" />
              </SelectTrigger>
              <SelectContent>
                {filteredChapters
                  .filter(c => c.id)
                  .map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.city && `- ${c.city}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedChapter || !hasChanges || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
