import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Scale, Pill, StickyNote, Tag, Activity, TrendingUp, Smartphone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LivestockAnimal, LivestockWeight, LivestockHealthRecord, LivestockNote, LivestockTag } from '@/hooks/useLivestock';

interface AnimalProfileProps {
  animal: LivestockAnimal;
  weights: LivestockWeight[];
  healthRecords: LivestockHealthRecord[];
  notes: LivestockNote[];
  tags: LivestockTag[];
  onBack: () => void;
  onAddWeight: (animalId: string, weight: number, notes?: string) => Promise<void>;
  onAddHealth: (animalId: string, record: any) => Promise<void>;
  onAddNote: (animalId: string, content: string, noteType?: string) => Promise<void>;
  onAddTag: (animalId: string, tagNumber: string, tagType?: string, tagLocation?: string) => Promise<void>;
  onDelete?: (animalId: string) => Promise<void>;
}

const speciesEmoji: Record<string, string> = {
  cattle: '🐄', pig: '🐷', sheep: '🐑', goat: '🐐', chicken: '🐔', horse: '🐴',
};

function getAge(birthDate: string | null): string {
  if (!birthDate) return 'Unknown';
  const birth = new Date(birthDate);
  const now = new Date();
  const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} years, ${Math.floor((days % 365) / 30)} months`;
}

export function AnimalProfile({
  animal, weights, healthRecords, notes, tags,
  onBack, onAddWeight, onAddHealth, onAddNote, onAddTag, onDelete,
}: AnimalProfileProps) {
  const [newWeight, setNewWeight] = useState('');
  const [weightNotes, setWeightNotes] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [tagNumber, setTagNumber] = useState('');
  const [tagType, setTagType] = useState('visual');
  const [tagLocation, setTagLocation] = useState('');
  
  // Health record form
  const [healthType, setHealthType] = useState('checkup');
  const [healthTitle, setHealthTitle] = useState('');
  const [healthDesc, setHealthDesc] = useState('');
  const [healthMed, setHealthMed] = useState('');
  const [healthDosage, setHealthDosage] = useState('');
  const [healthVet, setHealthVet] = useState('');

  const latestWeight = weights[0]?.weight_lbs;
  const emoji = speciesEmoji[animal.species] || '🐾';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{emoji}</span>
            <h2 className="text-xl font-bold text-foreground">{animal.name || animal.animal_id}</h2>
            <Badge variant="outline" className="text-xs">{animal.animal_id}</Badge>
            {animal.tag_id && (
              <Badge className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                {animal.tag_id}
              </Badge>
            )}
            {'NDEFReader' in window && animal.tag_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={async () => {
                  try {
                    const ndef = new (window as any).NDEFReader();
                    await ndef.write({ records: [{ recordType: 'text', data: animal.tag_id }] });
                    toast.success('Tag ID written to NFC tag! 📡');
                  } catch (err) {
                    toast.error('NFC write failed. Hold tag closer.');
                  }
                }}
              >
                <Smartphone className="h-3 w-3" /> Write NFC
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {animal.breed || animal.species} · {animal.sex === 'male' ? '♂ Male' : animal.sex === 'female' ? '♀ Female' : ''} · Age: {getAge(animal.birth_date)}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Scale className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{latestWeight ? `${latestWeight}` : '—'}</p>
          <p className="text-xs text-muted-foreground">lbs</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Activity className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{healthRecords.length}</p>
          <p className="text-xs text-muted-foreground">Records</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Tag className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{tags.length}</p>
          <p className="text-xs text-muted-foreground">Tags</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{weights.length}</p>
          <p className="text-xs text-muted-foreground">Weigh-ins</p>
        </CardContent></Card>
      </div>

      {/* Tabs — 4 tabs: Health, Weight, Notes, Tags */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="health" className="text-xs sm:text-sm">💊 Health</TabsTrigger>
          <TabsTrigger value="weight" className="text-xs sm:text-sm">⚖️ Weight</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs sm:text-sm">📝 Notes</TabsTrigger>
          <TabsTrigger value="tags" className="text-xs sm:text-sm">🏷️ Tags</TabsTrigger>
        </TabsList>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4" /> Log Treatment / Checkup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={healthType} onValueChange={setHealthType}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkup">Checkup</SelectItem>
                      <SelectItem value="vaccination">Vaccination</SelectItem>
                      <SelectItem value="treatment">Treatment</SelectItem>
                      <SelectItem value="deworming">Deworming</SelectItem>
                      <SelectItem value="surgery">Surgery</SelectItem>
                      <SelectItem value="injury">Injury</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input placeholder="e.g. Annual checkup" value={healthTitle} onChange={e => setHealthTitle(e.target.value)} className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Medication</Label>
                  <Input placeholder="e.g. Penicillin" value={healthMed} onChange={e => setHealthMed(e.target.value)} className="h-11" />
                </div>
                <div>
                  <Label>Dosage</Label>
                  <Input placeholder="e.g. 10ml" value={healthDosage} onChange={e => setHealthDosage(e.target.value)} className="h-11" />
                </div>
              </div>
              <div>
                <Label>Vet Name</Label>
                <Input placeholder="Dr. Smith" value={healthVet} onChange={e => setHealthVet(e.target.value)} className="h-11" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Details..." value={healthDesc} onChange={e => setHealthDesc(e.target.value)} rows={2} />
              </div>
              <Button className="w-full h-11" disabled={!healthTitle} onClick={async () => {
                await onAddHealth(animal.id, {
                  record_type: healthType,
                  title: healthTitle,
                  description: healthDesc || undefined,
                  medication: healthMed || undefined,
                  dosage: healthDosage || undefined,
                  vet_name: healthVet || undefined,
                });
                setHealthTitle(''); setHealthDesc(''); setHealthMed(''); setHealthDosage(''); setHealthVet('');
              }}>
                Save Health Record
              </Button>
            </CardContent>
          </Card>

          {healthRecords.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">History</h3>
              {healthRecords.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{r.record_type}</Badge>
                        <span className="font-medium text-sm">{r.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.recorded_at).toLocaleDateString()}</span>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                    {r.medication && <p className="text-xs">💊 {r.medication} {r.dosage && `— ${r.dosage}`}</p>}
                    {r.vet_name && <p className="text-xs">🩺 {r.vet_name}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Weight Tab */}
        <TabsContent value="weight" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4" /> Record Weight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Weight (lbs) *</Label>
                <Input type="number" placeholder="e.g. 850" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="h-12 text-lg" />
              </div>
              <div>
                <Label>Notes</Label>
                <Input placeholder="Optional notes" value={weightNotes} onChange={e => setWeightNotes(e.target.value)} className="h-11" />
              </div>
              <Button className="w-full h-11" disabled={!newWeight} onClick={async () => {
                await onAddWeight(animal.id, parseFloat(newWeight), weightNotes || undefined);
                setNewWeight(''); setWeightNotes('');
              }}>
                Record Weight
              </Button>
            </CardContent>
          </Card>

          {weights.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Weight History</h3>
              {weights.map(w => (
                <Card key={w.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg">{w.weight_lbs} lbs</span>
                      {w.notes && <p className="text-xs text-muted-foreground">{w.notes}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(w.recorded_at).toLocaleDateString()}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-4 w-4" /> Quick Note
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="What did you observe?" value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={3} className="text-base" />
              <Button className="w-full h-11" disabled={!noteContent.trim()} onClick={async () => {
                await onAddNote(animal.id, noteContent);
                setNoteContent('');
              }}>
                Add Note
              </Button>
            </CardContent>
          </Card>

          {notes.length > 0 && (
            <div className="space-y-2">
              {notes.map(n => (
                <Card key={n.id}>
                  <CardContent className="p-3">
                    <p className="text-sm">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" /> Link Visual Tag
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Tag Number *</Label>
                <Input placeholder="Scan or type tag ID" value={tagNumber} onChange={e => setTagNumber(e.target.value)} className="h-12 text-lg font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tag Type</Label>
                  <Select value={tagType} onValueChange={setTagType}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visual">Visual Ear Tag</SelectItem>
                      <SelectItem value="rfid">RFID</SelectItem>
                      <SelectItem value="nfc">NFC</SelectItem>
                      <SelectItem value="eid">Electronic ID (EID)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Select value={tagLocation} onValueChange={setTagLocation}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Where on animal" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left_ear">Left Ear</SelectItem>
                      <SelectItem value="right_ear">Right Ear</SelectItem>
                      <SelectItem value="neck">Neck</SelectItem>
                      <SelectItem value="leg">Leg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full h-11" disabled={!tagNumber.trim()} onClick={async () => {
                await onAddTag(animal.id, tagNumber, tagType, tagLocation || undefined);
                setTagNumber(''); setTagLocation('');
              }}>
                Link Tag
              </Button>
            </CardContent>
          </Card>

          {tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Linked Tags</h3>
              {tags.map(t => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="font-mono font-medium">{t.tag_number}</span>
                      <Badge variant="outline" className="text-xs">{t.tag_type}</Badge>
                      {t.is_primary && <Badge className="text-xs bg-primary/10 text-primary border-0">Primary</Badge>}
                    </div>
                    {t.tag_location && <span className="text-xs text-muted-foreground">{t.tag_location.replace('_', ' ')}</span>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
