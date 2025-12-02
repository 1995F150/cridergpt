import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Event, NewEvent } from '@/hooks/useEvents';
import { Loader2, Trash2 } from 'lucide-react';

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  chapterId?: string | null;
  onSave: (data: NewEvent) => Promise<any>;
  onDelete?: (id: string) => Promise<boolean>;
}

const CATEGORIES = ['General', 'Competition', 'Meeting', 'Fundraiser', 'Community Service', 'Field Trip', 'Conference'];

export function EventModal({ open, onOpenChange, event, chapterId, onSave, onDelete }: EventModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [visibility, setVisibility] = useState<'personal' | 'chapter'>('personal');
  const [category, setCategory] = useState('General');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventDate(event.event_date);
      setEventTime(event.event_time || '');
      setEndTime(event.end_time || '');
      setVisibility(event.visibility);
      setCategory(event.category || 'General');
    } else {
      setTitle('');
      setDescription('');
      setEventDate('');
      setEventTime('');
      setEndTime('');
      setVisibility('personal');
      setCategory('General');
    }
  }, [event, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !eventDate) return;

    setLoading(true);
    try {
      await onSave({
        title,
        description: description || null,
        event_date: eventDate,
        event_time: eventTime || null,
        end_time: endTime || null,
        visibility,
        category,
        chapter_id: visibility === 'chapter' ? chapterId || null : null,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    
    setDeleting(true);
    try {
      const success = await onDelete(event.id);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Start Time</Label>
              <Input
                id="time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as 'personal' | 'chapter')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal (Only you can see)</SelectItem>
                <SelectItem value="chapter">Chapter (Visible to all chapter members)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between pt-4">
            {event && onDelete && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
            {!event && <div />}
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !title || !eventDate}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {event ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
