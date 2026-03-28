import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useLivestock } from '@/hooks/useLivestock';
import { AnimalCard } from '@/components/livestock/AnimalCard';
import { AnimalProfile } from '@/components/livestock/AnimalProfile';
import { AddAnimalForm } from '@/components/livestock/AddAnimalForm';
import { TagScanner } from '@/components/livestock/TagScanner';
import { useAuth } from '@/contexts/AuthContext';

export function LivestockPanel() {
  const { user } = useAuth();
  const {
    animals, loading, selectedAnimal, weights, healthRecords, notes, tags, sharedAccess, accessLoading,
    addAnimal, addWeight, addHealthRecord, addNote, addTag, deleteAnimal,
    selectAnimal, setSelectedAnimal, scanCard, grantAccessToAnimal, revokeAccess,
  } = useLivestock();
  
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('herd');
  const [prefillTagId, setPrefillTagId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <span className="text-5xl mb-4 block">🐮</span>
            <h2 className="text-xl font-bold mb-2">Livestock Smart ID</h2>
            <p className="text-muted-foreground mb-4">Sign in to manage your herd, track health, and scan tags.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedAnimal) {
    return (
      <ScrollArea className="h-full">
        <div className="max-w-2xl mx-auto p-4">
          <AnimalProfile
            animal={selectedAnimal}
            weights={weights}
            healthRecords={healthRecords}
            notes={notes}
            tags={tags}
            onBack={() => setSelectedAnimal(null)}
            onAddWeight={addWeight}
            onAddHealth={addHealthRecord}
            onAddNote={addNote}
            onAddTag={addTag}
            onDelete={deleteAnimal}
            sharedAccess={sharedAccess}
            accessLoading={accessLoading}
            onGrantAccess={grantAccessToAnimal}
            onRevokeAccess={revokeAccess}
          />
        </div>
      </ScrollArea>
    );
  }

  // Show AddAnimalForm only when triggered from scan
  if (showAddForm && prefillTagId) {
    return (
      <ScrollArea className="h-full">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <Button variant="outline" onClick={() => { setShowAddForm(false); setPrefillTagId(null); setActiveTab('scan'); }}>
            ← Back to Scanner
          </Button>
          <AddAnimalForm
            onSubmit={addAnimal}
            prefillTagId={prefillTagId}
            onSuccess={() => {
              setPrefillTagId(null);
              setShowAddForm(false);
              setActiveTab('herd');
            }}
          />
        </div>
      </ScrollArea>
    );
  }

  const filtered = animals.filter(a => {
    return speciesFilter === 'all' || a.species === speciesFilter;
  });

  const speciesCounts = animals.reduce((acc, a) => {
    acc[a.species] = (acc[a.species] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ScrollArea className="h-full">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              🐮 Livestock Smart ID
            </h1>
            <p className="text-sm text-muted-foreground">
              {animals.length} animal{animals.length !== 1 ? 's' : ''} registered · Scan a tag to add new animals
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="herd" className="text-xs sm:text-sm">🐄 Herd</TabsTrigger>
            <TabsTrigger value="scan" className="text-xs sm:text-sm">📡 Scan</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs sm:text-sm">📊 Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="herd" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button variant={speciesFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSpeciesFilter('all')}>
                All ({animals.length})
              </Button>
              {Object.entries(speciesCounts).map(([species, count]) => (
                <Button key={species} variant={speciesFilter === species ? 'default' : 'outline'} size="sm" onClick={() => setSpeciesFilter(species)}>
                  {species} ({count})
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading your herd...</div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <span className="text-5xl mb-4 block">🌾</span>
                  <h3 className="text-lg font-semibold mb-2">
                    {animals.length === 0 ? 'No Animals Yet' : 'No matches found'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {animals.length === 0 ? 'Scan a tag to register your first animal!' : 'Try a different search term.'}
                  </p>
                  {animals.length === 0 && (
                    <Button onClick={() => setActiveTab('scan')}>📡 Go to Scanner</Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map(animal => (
                  <AnimalCard key={animal.id} animal={animal} onClick={() => selectAnimal(animal)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="scan">
            <TagScanner
              onTagScanned={scanCard}
              onRegisterAnimal={(tagId) => {
                setPrefillTagId(tagId);
                setShowAddForm(true);
              }}
            />
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{animals.length}</p>
                  <p className="text-sm text-muted-foreground">Total Animals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{animals.filter(a => a.status === 'active').length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </CardContent>
              </Card>
            </div>

            {Object.entries(speciesCounts).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">By Species</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(speciesCounts).map(([species, count]) => (
                    <div key={species} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="capitalize font-medium">{species}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
