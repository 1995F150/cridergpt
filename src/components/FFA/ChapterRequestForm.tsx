import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Send, ArrowLeft } from 'lucide-react';

const chapterRequestSchema = z.object({
  chapterName: z.string().trim().min(2, 'Chapter name must be at least 2 characters').max(100, 'Chapter name must be less than 100 characters'),
  city: z.string().trim().max(100, 'City must be less than 100 characters').optional(),
  schoolName: z.string().trim().max(100, 'School name must be less than 100 characters').optional(),
});

interface ChapterRequestFormProps {
  state: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function ChapterRequestForm({ state, onBack, onSuccess }: ChapterRequestFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [chapterName, setChapterName] = useState('');
  const [city, setCity] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to request a new chapter.',
        variant: 'destructive',
      });
      return;
    }

    // Validate input
    const result = chapterRequestSchema.safeParse({
      chapterName,
      city: city || undefined,
      schoolName: schoolName || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { error } = await supabase.from('chapter_requests').insert({
        user_id: user.id,
        chapter_name: chapterName.trim(),
        state,
        city: city.trim() || null,
        school_name: schoolName.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Request Submitted!',
        description: 'Your chapter request has been submitted for admin review.',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error submitting chapter request:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit chapter request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground">Request New Chapter for {state}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="chapterName">Chapter Name *</Label>
        <Input
          id="chapterName"
          placeholder="e.g., Springfield FFA"
          value={chapterName}
          onChange={(e) => setChapterName(e.target.value)}
          maxLength={100}
        />
        {errors.chapterName && (
          <p className="text-sm text-destructive">{errors.chapterName}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City (Optional)</Label>
        <Input
          id="city"
          placeholder="e.g., Springfield"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={100}
        />
        {errors.city && (
          <p className="text-sm text-destructive">{errors.city}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="schoolName">School Name (Optional)</Label>
        <Input
          id="schoolName"
          placeholder="e.g., Springfield High School"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          maxLength={100}
        />
        {errors.schoolName && (
          <p className="text-sm text-destructive">{errors.schoolName}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Your request will be reviewed by an administrator. You'll be notified once it's approved.
      </p>

      <Button type="submit" className="w-full" disabled={loading || !chapterName.trim()}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit Request
          </>
        )}
      </Button>
    </form>
  );
}
