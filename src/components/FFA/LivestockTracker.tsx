import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Heart, 
  Scale, 
  Calendar, 
  Pill,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity
} from "lucide-react";

interface Animal {
  id: string;
  name: string;
  type: string;
  breed: string;
  birthDate: string;
  weight: number;
  healthStatus: string;
  lastCheckup: string;
  vaccinations: string[];
  notes: string;
}

interface HealthRecord {
  id: string;
  animalId: string;
  date: string;
  type: string;
  description: string;
  veterinarian: string;
}

export function LivestockTracker() {
  const [animals, setAnimals] = useState<Animal[]>([
    {
      id: "1",
      name: "Bessie",
      type: "Cattle",
      breed: "Holstein",
      birthDate: "2023-03-15",
      weight: 1250,
      healthStatus: "Healthy",
      lastCheckup: "2025-01-10",
      vaccinations: ["Rabies", "Blackleg", "IBR"],
      notes: "Good milk producer, calm temperament"
    },
    {
      id: "2", 
      name: "Wilbur",
      type: "Pig",
      breed: "Yorkshire",
      birthDate: "2024-08-20",
      weight: 180,
      healthStatus: "Healthy",
      lastCheckup: "2025-01-08",
      vaccinations: ["Mycoplasma", "Circovirus"],
      notes: "Fast growing, good feed conversion"
    }
  ]);

  const [newAnimal, setNewAnimal] = useState<Partial<Animal>>({
    name: "",
    type: "",
    breed: "",
    birthDate: "",
    weight: 0,
    healthStatus: "Healthy",
    notes: ""
  });

  const [healthRecords] = useState<HealthRecord[]>([
    {
      id: "1",
      animalId: "1", 
      date: "2025-01-10",
      type: "Checkup",
      description: "Routine health examination - all vitals normal",
      veterinarian: "Dr. Johnson"
    },
    {
      id: "2",
      animalId: "2",
      date: "2025-01-08", 
      type: "Vaccination",
      description: "Administered Mycoplasma vaccine",
      veterinarian: "Dr. Smith"
    }
  ]);

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  };

  const getHealthStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'sick': return 'text-red-600 bg-red-100';
      case 'recovering': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const addAnimal = () => {
    if (!newAnimal.name || !newAnimal.type) return;
    
    const animal: Animal = {
      ...newAnimal,
      id: Date.now().toString(),
      vaccinations: [],
      lastCheckup: new Date().toISOString().split('T')[0]
    } as Animal;
    
    setAnimals(prev => [...prev, animal]);
    setNewAnimal({
      name: "",
      type: "",
      breed: "",
      birthDate: "",
      weight: 0,
      healthStatus: "Healthy",
      notes: ""
    });
  };

  const animalTypes = [
    { value: "cattle", label: "Cattle", breeds: ["Holstein", "Angus", "Hereford", "Charolais"] },
    { value: "pig", label: "Pig", breeds: ["Yorkshire", "Duroc", "Hampshire", "Landrace"] },
    { value: "sheep", label: "Sheep", breeds: ["Suffolk", "Dorset", "Romney", "Merino"] },
    { value: "goat", label: "Goat", breeds: ["Boer", "Nubian", "Alpine", "Saanen"] },
    { value: "chicken", label: "Chicken", breeds: ["Rhode Island Red", "Leghorn", "Buff Orpington", "Australorp"] }
  ];

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ffa-navy">
            <Heart className="h-5 w-5" />
            Livestock Tracker
            <Badge className="bg-ffa-gold text-white">Animal Management</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track animal health, growth, and care records for your FFA projects
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="animals" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="animals">My Animals</TabsTrigger>
              <TabsTrigger value="add">Add Animal</TabsTrigger>
              <TabsTrigger value="health">Health Records</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="animals" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {animals.map((animal) => (
                  <Card key={animal.id} className="border-ffa-field/20">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-ffa-field" />
                          {animal.name}
                        </span>
                        <Badge className={`${getHealthStatusColor(animal.healthStatus)} border-0`}>
                          {animal.healthStatus}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {animal.breed} {animal.type}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Age</p>
                          <p className="font-medium">{calculateAge(animal.birthDate)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Weight</p>
                          <p className="font-medium">{animal.weight} lbs</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Checkup</p>
                          <p className="font-medium">{new Date(animal.lastCheckup).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vaccinations</p>
                          <p className="font-medium">{animal.vaccinations.length} current</p>
                        </div>
                      </div>
                      
                      {animal.notes && (
                        <div className="bg-ffa-sky/10 p-3 rounded-lg">
                          <p className="text-sm"><strong>Notes:</strong> {animal.notes}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Scale className="h-4 w-4 mr-1" />
                          Weigh
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Pill className="h-4 w-4 mr-1" />
                          Vaccinate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <Card className="border-ffa-corn/20">
                <CardHeader>
                  <CardTitle>Add New Animal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="animalName">Animal Name</Label>
                      <Input
                        id="animalName"
                        placeholder="Enter animal name"
                        value={newAnimal.name || ""}
                        onChange={(e) => setNewAnimal(prev => ({...prev, name: e.target.value}))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="animalType">Animal Type</Label>
                      <Select value={newAnimal.type} onValueChange={(value) => setNewAnimal(prev => ({...prev, type: value, breed: ""}))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select animal type" />
                        </SelectTrigger>
                        <SelectContent>
                          {animalTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="breed">Breed</Label>
                      <Select value={newAnimal.breed} onValueChange={(value) => setNewAnimal(prev => ({...prev, breed: value}))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select breed" />
                        </SelectTrigger>
                        <SelectContent>
                          {animalTypes.find(t => t.value === newAnimal.type)?.breeds.map((breed) => (
                            <SelectItem key={breed} value={breed}>
                              {breed}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="birthDate">Birth Date</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={newAnimal.birthDate || ""}
                        onChange={(e) => setNewAnimal(prev => ({...prev, birthDate: e.target.value}))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="weight">Current Weight (lbs)</Label>
                      <Input
                        id="weight"
                        type="number"
                        placeholder="Enter weight"
                        value={newAnimal.weight || ""}
                        onChange={(e) => setNewAnimal(prev => ({...prev, weight: parseFloat(e.target.value) || 0}))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="healthStatus">Health Status</Label>
                      <Select value={newAnimal.healthStatus} onValueChange={(value) => setNewAnimal(prev => ({...prev, healthStatus: value}))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select health status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Healthy">Healthy</SelectItem>
                          <SelectItem value="Sick">Sick</SelectItem>
                          <SelectItem value="Recovering">Recovering</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      className="w-full p-2 border rounded-md resize-none"
                      rows={3}
                      placeholder="Add any notes about the animal"
                      value={newAnimal.notes || ""}
                      onChange={(e) => setNewAnimal(prev => ({...prev, notes: e.target.value}))}
                    />
                  </div>
                  
                  <Button onClick={addAnimal} className="w-full">
                    Add Animal
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
              <div className="space-y-3">
                {healthRecords.map((record) => {
                  const animal = animals.find(a => a.id === record.animalId);
                  return (
                    <Card key={record.id} className="border-ffa-blue/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-ffa-blue" />
                            <span className="font-medium">{animal?.name}</span>
                            <Badge variant="outline">{record.type}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(record.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm mb-1">{record.description}</p>
                        <p className="text-xs text-muted-foreground">Veterinarian: {record.veterinarian}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-ffa-gold/20">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-ffa-gold mx-auto mb-2" />
                    <h3 className="font-semibold text-lg">{animals.length}</h3>
                    <p className="text-sm text-muted-foreground">Total Animals</p>
                  </CardContent>
                </Card>
                
                <Card className="border-green-200">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-lg">
                      {animals.filter(a => a.healthStatus === 'Healthy').length}
                    </h3>
                    <p className="text-sm text-muted-foreground">Healthy Animals</p>
                  </CardContent>
                </Card>
                
                <Card className="border-red-200">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-lg">
                      {animals.filter(a => a.healthStatus !== 'Healthy').length}
                    </h3>
                    <p className="text-sm text-muted-foreground">Need Attention</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Weight Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {animals.map((animal) => (
                      <div key={animal.id} className="flex items-center justify-between p-2 bg-ffa-sky/10 rounded">
                        <span className="font-medium">{animal.name}</span>
                        <span className="text-sm text-muted-foreground">{animal.weight} lbs</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}