import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useFFAProfile, Chapter } from '@/hooks/useFFAProfile';
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

const OFFICER_ROLES = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Reporter',
  'Sentinel',
  'Historian',
  'Parliamentarian',
  'Chaplain',
];

interface FFASetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FFASetupModal({ open, onOpenChange }: FFASetupModalProps) {
  const { chapters, createProfile } = useFFAProfile();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [selectedState, setSelectedState] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [officerRole, setOfficerRole] = useState('');
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [graduationYear, setGraduationYear] = useState('');

  const filteredChapters = chapters.filter(c => c.state === selectedState);
  
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const handleSubmit = async () => {
    if (!selectedChapter || !selectedState) return;

    setLoading(true);
    try {
      await createProfile({
        chapter_id: selectedChapter,
        state: selectedState,
        officer_role: officerRole || undefined,
        is_advisor: isAdvisor,
        graduation_year: graduationYear ? parseInt(graduationYear) : undefined,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = step === 1 ? !!selectedState : !!selectedChapter;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-primary" />
            FFA Chapter Setup
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Select your state to find your FFA chapter"
              : "Complete your FFA profile setup"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 1 && (
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={selectedState} onValueChange={setSelectedState}>
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
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="chapter">Chapter</Label>
                <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredChapters.map(chapter => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.name} {chapter.city && `- ${chapter.city}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredChapters.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No chapters found for {selectedState}. Contact your advisor to add your chapter.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="officer">Officer Role (Optional)</Label>
                <Select value={officerRole} onValueChange={setOfficerRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select if you're an officer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not an officer</SelectItem>
                    {OFFICER_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="advisor">Are you an Advisor?</Label>
                  <p className="text-xs text-muted-foreground">
                    Advisors have additional permissions
                  </p>
                </div>
                <Switch
                  id="advisor"
                  checked={isAdvisor}
                  onCheckedChange={setIsAdvisor}
                />
              </div>

              {!isAdvisor && (
                <div className="space-y-2">
                  <Label htmlFor="graduation">Graduation Year (Optional)</Label>
                  <Select value={graduationYear} onValueChange={setGraduationYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select graduation year" />
                    </SelectTrigger>
                    <SelectContent>
                      {graduationYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-between">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          {step === 1 && <div />}
          
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!canProceed}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
