import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle } from 'lucide-react';

interface AddAnimalFormProps {
  onSubmit: (data: {
    name?: string;
    species: string;
    breed?: string;
    sex?: string;
    birth_date?: string;
    color_markings?: string;
    notes?: string;
    acquisition_method?: string;
    tag_id?: string;
  }) => Promise<any>;
  onSuccess?: () => void;
  prefillTagId?: string | null;
}

const speciesOptions = [
  { value: 'cattle', label: '🐄 Cattle', breeds: ['Angus', 'Hereford', 'Holstein', 'Charolais', 'Simmental', 'Brahman', 'Limousin'] },
  { value: 'pig', label: '🐷 Pig', breeds: ['Yorkshire', 'Duroc', 'Hampshire', 'Landrace', 'Berkshire', 'Chester White'] },
  { value: 'sheep', label: '🐑 Sheep', breeds: ['Suffolk', 'Dorset', 'Hampshire', 'Merino', 'Romney', 'Texel'] },
  { value: 'goat', label: '🐐 Goat', breeds: ['Boer', 'Nubian', 'Alpine', 'Saanen', 'LaMancha', 'Kiko'] },
  { value: 'chicken', label: '🐔 Chicken', breeds: ['Rhode Island Red', 'Leghorn', 'Buff Orpington', 'Plymouth Rock', 'Australorp'] },
  { value: 'horse', label: '🐴 Horse', breeds: ['Quarter Horse', 'Thoroughbred', 'Arabian', 'Paint', 'Appaloosa'] },
];

export function AddAnimalForm({ onSubmit, onSuccess, prefillTagId }: AddAnimalFormProps) {
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [colorMarkings, setColorMarkings] = useState('');
  const [notes, setNotes] = useState('');
  const [acquisitionMethod, setAcquisitionMethod] = useState('born_on_farm');
  const [submitting, setSubmitting] = useState(false);

  const selectedSpecies = speciesOptions.find(s => s.value === species);

  const handleSubmit = async () => {
    if (!species) return;
    setSubmitting(true);
    try {
      const result = await onSubmit({
        name: name || undefined,
        species,
        breed: breed || undefined,
        sex: sex || undefined,
        birth_date: birthDate || undefined,
        color_markings: colorMarkings || undefined,
        notes: notes || undefined,
        acquisition_method: acquisitionMethod,
        tag_id: prefillTagId || undefined,
      });
      if (result) {
        setName(''); setSpecies(''); setBreed(''); setSex('');
        setBirthDate(''); setColorMarkings(''); setNotes('');
        setAcquisitionMethod('born_on_farm');
        onSuccess?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PlusCircle className="h-5 w-5" />
          Register New Animal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {prefillTagId && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
            <Badge className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">{prefillTagId}</Badge>
            <span className="text-sm text-muted-foreground">This tag will be assigned to the new animal.</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Name (optional)</Label>
            <Input placeholder="e.g. Bessie, Big Red" value={name} onChange={e => setName(e.target.value)} className="h-12" />
          </div>
          <div>
            <Label>Species *</Label>
            <Select value={species} onValueChange={v => { setSpecies(v); setBreed(''); }}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select species" /></SelectTrigger>
              <SelectContent>
                {speciesOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Breed</Label>
            <Select value={breed} onValueChange={setBreed} disabled={!species}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select breed" /></SelectTrigger>
              <SelectContent>
                {selectedSpecies?.breeds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sex</Label>
            <Select value={sex} onValueChange={setSex}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">♂ Male</SelectItem>
                <SelectItem value="female">♀ Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Birth Date</Label>
            <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="h-12" />
          </div>
          <div>
            <Label>How Acquired</Label>
            <Select value={acquisitionMethod} onValueChange={setAcquisitionMethod}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="born_on_farm">Born on Farm</SelectItem>
                <SelectItem value="purchased">Purchased</SelectItem>
                <SelectItem value="transferred">Transferred In</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label>Color / Markings</Label>
          <Input placeholder="e.g. Black with white face" value={colorMarkings} onChange={e => setColorMarkings(e.target.value)} className="h-12" />
        </div>
        
        <div>
          <Label>Notes</Label>
          <Textarea placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </div>
        
        <Button onClick={handleSubmit} disabled={!species || submitting} className="w-full h-12 text-base font-semibold">
          {submitting ? 'Registering...' : '🐮 Register Animal'}
        </Button>
      </CardContent>
    </Card>
  );
}
