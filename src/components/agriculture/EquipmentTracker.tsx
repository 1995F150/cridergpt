import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Tractor, 
  Wrench, 
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Plus
} from "lucide-react";

interface Equipment {
  id: number;
  name: string;
  type: string;
  model: string;
  year: string;
  hours: number;
  purchasePrice: number;
  status: string;
}

interface MaintenanceRecord {
  id: number;
  equipmentId: string;
  type: string;
  date: string;
  cost: number;
  description: string;
  nextDue?: string;
  hoursAtService?: number;
}

interface FuelRecord {
  id: number;
  equipmentId: string;
  date: string;
  gallons: number;
  cost: number;
  hours?: number;
  operation?: string;
}

export function EquipmentTracker() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [fuelData, setFuelData] = useState<FuelRecord[]>([]);
  
  const [newEquipment, setNewEquipment] = useState({
    name: "",
    type: "",
    model: "",
    year: "",
    hours: "",
    purchasePrice: "",
    status: "operational"
  });

  const [newMaintenance, setNewMaintenance] = useState({
    equipmentId: "",
    date: "",
    type: "",
    description: "",
    cost: "",
    nextDue: "",
    hoursAtService: ""
  });

  const [newFuelEntry, setNewFuelEntry] = useState({
    equipmentId: "",
    date: "",
    gallons: "",
    cost: "",
    hours: "",
    operation: ""
  });

  const equipmentTypes = [
    "Tractor", "Combine", "Planter", "Cultivator", "Disk", "Sprayer",
    "Mower", "Rake", "Baler", "Spreader", "Tillage", "Truck"
  ];

  const maintenanceTypes = [
    "Oil Change", "Filter Replacement", "Hydraulic Service", "Greasing",
    "Tire Replacement", "Belt Replacement", "Repair", "Inspection", "Tune-up"
  ];

  const addEquipment = () => {
    if (newEquipment.name && newEquipment.type) {
      const equipment = {
        id: Date.now(),
        ...newEquipment,
        hours: parseInt(newEquipment.hours) || 0,
        purchasePrice: parseFloat(newEquipment.purchasePrice) || 0
      };
      setEquipment(prev => [...prev, equipment]);
      setNewEquipment({
        name: "",
        type: "",
        model: "",
        year: "",
        hours: "",
        purchasePrice: "",
        status: "operational"
      });
    }
  };

  const addMaintenance = () => {
    if (newMaintenance.equipmentId && newMaintenance.date && newMaintenance.type) {
      const maintenance = {
        id: Date.now(),
        ...newMaintenance,
        cost: parseFloat(newMaintenance.cost) || 0,
        hoursAtService: parseInt(newMaintenance.hoursAtService) || 0
      };
      setMaintenance(prev => [...prev, maintenance]);
      setNewMaintenance({
        equipmentId: "",
        date: "",
        type: "",
        description: "",
        cost: "",
        nextDue: "",
        hoursAtService: ""
      });
    }
  };

  const addFuelEntry = () => {
    if (newFuelEntry.equipmentId && newFuelEntry.date && newFuelEntry.gallons) {
      const fuelEntry = {
        id: Date.now(),
        ...newFuelEntry,
        gallons: parseFloat(newFuelEntry.gallons),
        cost: parseFloat(newFuelEntry.cost) || 0,
        hours: parseInt(newFuelEntry.hours) || 0
      };
      setFuelData(prev => [...prev, fuelEntry]);
      setNewFuelEntry({
        equipmentId: "",
        date: "",
        gallons: "",
        cost: "",
        hours: "",
        operation: ""
      });
    }
  };

  const getEquipmentEfficiency = (equipmentId: number) => {
    const equipmentIdStr = String(equipmentId);
    const fuelEntries = fuelData.filter(f => f.equipmentId === equipmentIdStr);
    if (fuelEntries.length === 0) return null;
    
    const totalGallons = fuelEntries.reduce((sum, entry) => sum + entry.gallons, 0);
    const totalHours = fuelEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    
    return totalHours > 0 ? (totalHours / totalGallons).toFixed(2) : null;
  };

  const getMaintenanceCost = (equipmentId: number) => {
    const equipmentIdStr = String(equipmentId);
    return maintenance
      .filter(m => m.equipmentId === equipmentIdStr)
      .reduce((sum, m) => sum + m.cost, 0);
  };

  const getOperatingCost = (equipmentId: number) => {
    const equipmentIdStr = String(equipmentId);
    const fuelCost = fuelData
      .filter(f => f.equipmentId === equipmentIdStr)
      .reduce((sum, f) => sum + f.cost, 0);
    const maintenanceCost = getMaintenanceCost(equipmentId);
    return fuelCost + maintenanceCost;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ffa-navy">
            <Tractor className="h-5 w-5" />
            Equipment & Fuel Tracker
            <Badge className="bg-ffa-blue text-white">Farm Management</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track maintenance, fuel efficiency, and operating costs for all farm equipment
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="equipment" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="equipment">Equipment</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="fuel">Fuel Tracking</TabsTrigger>
              <TabsTrigger value="analysis">Cost Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="equipment" className="space-y-4">
              <Card className="border-ffa-blue/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add Equipment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="equipmentName">Equipment Name</Label>
                      <Input
                        id="equipmentName"
                        placeholder="John Deere 8320"
                        value={newEquipment.name}
                        onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="equipmentType">Type</Label>
                      <Select value={newEquipment.type} onValueChange={(value) => setNewEquipment({...newEquipment, type: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="model">Model/Year</Label>
                      <Input
                        id="model"
                        placeholder="2018"
                        value={newEquipment.year}
                        onChange={(e) => setNewEquipment({...newEquipment, year: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hours">Current Hours</Label>
                      <Input
                        id="hours"
                        type="number"
                        placeholder="2150"
                        value={newEquipment.hours}
                        onChange={(e) => setNewEquipment({...newEquipment, hours: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="purchasePrice">Purchase Price</Label>
                      <Input
                        id="purchasePrice"
                        type="number"
                        placeholder="125000"
                        value={newEquipment.purchasePrice}
                        onChange={(e) => setNewEquipment({...newEquipment, purchasePrice: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={newEquipment.status} onValueChange={(value) => setNewEquipment({...newEquipment, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="maintenance">In Maintenance</SelectItem>
                          <SelectItem value="repair">Needs Repair</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={addEquipment} className="bg-ffa-blue hover:bg-ffa-navy text-white">
                    Add Equipment
                  </Button>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipment.map((item) => (
                  <Card key={item.id} className="border-ffa-field/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{item.name}</h3>
                        <Badge variant={item.status === 'operational' ? 'default' : 'destructive'}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Type:</span> {item.type}</p>
                        <p><span className="font-medium">Year:</span> {item.year}</p>
                        <p><span className="font-medium">Hours:</span> {item.hours.toLocaleString()}</p>
                        <p><span className="font-medium">Purchase Price:</span> ${item.purchasePrice.toLocaleString()}</p>
                        {getEquipmentEfficiency(item.id) && (
                          <p><span className="font-medium">Efficiency:</span> {getEquipmentEfficiency(item.id)} hrs/gal</p>
                        )}
                        <p><span className="font-medium">Operating Cost:</span> ${getOperatingCost(item.id).toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Log Maintenance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maintenanceEquipment">Equipment</Label>
                      <Select value={newMaintenance.equipmentId} onValueChange={(value) => setNewMaintenance({...newMaintenance, equipmentId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select equipment" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipment.map(item => (
                            <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="maintenanceDate">Date</Label>
                      <Input
                        id="maintenanceDate"
                        type="date"
                        value={newMaintenance.date}
                        onChange={(e) => setNewMaintenance({...newMaintenance, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maintenanceType">Service Type</Label>
                      <Select value={newMaintenance.type} onValueChange={(value) => setNewMaintenance({...newMaintenance, type: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {maintenanceTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="maintenanceCost">Cost</Label>
                      <Input
                        id="maintenanceCost"
                        type="number"
                        placeholder="250.00"
                        value={newMaintenance.cost}
                        onChange={(e) => setNewMaintenance({...newMaintenance, cost: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hoursAtService">Hours at Service</Label>
                      <Input
                        id="hoursAtService"
                        type="number"
                        placeholder="2150"
                        value={newMaintenance.hoursAtService}
                        onChange={(e) => setNewMaintenance({...newMaintenance, hoursAtService: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nextDue">Next Service Due</Label>
                      <Input
                        id="nextDue"
                        type="date"
                        value={newMaintenance.nextDue}
                        onChange={(e) => setNewMaintenance({...newMaintenance, nextDue: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="maintenanceDescription">Description/Notes</Label>
                    <Textarea
                      id="maintenanceDescription"
                      placeholder="Service details, parts replaced, etc."
                      value={newMaintenance.description}
                      onChange={(e) => setNewMaintenance({...newMaintenance, description: e.target.value})}
                    />
                  </div>
                  <Button onClick={addMaintenance} className="bg-orange-600 hover:bg-orange-700 text-white">
                    Log Maintenance
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {maintenance.map((record) => {
                  const equipmentItem = equipment.find(e => e.id.toString() === record.equipmentId);
                  return (
                    <Card key={record.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{equipmentItem?.name}</h3>
                          <Badge className="bg-orange-100 text-orange-800">{record.type}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <p><span className="font-medium">Date:</span> {record.date}</p>
                          <p><span className="font-medium">Cost:</span> ${record.cost}</p>
                          <p><span className="font-medium">Hours:</span> {record.hoursAtService?.toLocaleString()}</p>
                        </div>
                        {record.description && (
                          <p className="text-sm text-muted-foreground mt-2">{record.description}</p>
                        )}
                        {record.nextDue && (
                          <p className="text-sm text-blue-600 mt-1">Next service due: {record.nextDue}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="fuel" className="space-y-4">
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Fuel Entry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="fuelEquipment">Equipment</Label>
                      <Select value={newFuelEntry.equipmentId} onValueChange={(value) => setNewFuelEntry({...newFuelEntry, equipmentId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select equipment" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipment.map(item => (
                            <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="fuelDate">Date</Label>
                      <Input
                        id="fuelDate"
                        type="date"
                        value={newFuelEntry.date}
                        onChange={(e) => setNewFuelEntry({...newFuelEntry, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gallons">Gallons</Label>
                      <Input
                        id="gallons"
                        type="number"
                        step="0.1"
                        placeholder="25.5"
                        value={newFuelEntry.gallons}
                        onChange={(e) => setNewFuelEntry({...newFuelEntry, gallons: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fuelCost">Total Cost</Label>
                      <Input
                        id="fuelCost"
                        type="number"
                        step="0.01"
                        placeholder="89.25"
                        value={newFuelEntry.cost}
                        onChange={(e) => setNewFuelEntry({...newFuelEntry, cost: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fuelHours">Hours Operated</Label>
                      <Input
                        id="fuelHours"
                        type="number"
                        placeholder="8"
                        value={newFuelEntry.hours}
                        onChange={(e) => setNewFuelEntry({...newFuelEntry, hours: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="operation">Operation</Label>
                      <Input
                        id="operation"
                        placeholder="Planting corn"
                        value={newFuelEntry.operation}
                        onChange={(e) => setNewFuelEntry({...newFuelEntry, operation: e.target.value})}
                      />
                    </div>
                  </div>
                  <Button onClick={addFuelEntry} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Log Fuel Usage
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="text-center p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {equipment.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Equipment</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-2xl font-bold text-green-600">
                    ${maintenance.reduce((sum, m) => sum + m.cost, 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Maintenance Cost</div>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    ${fuelData.reduce((sum, f) => sum + f.cost, 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Fuel Cost</div>
                </Card>
              </div>

              {equipment.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Equipment Cost Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {equipment.map((item) => {
                        const maintenanceCost = getMaintenanceCost(item.id);
                        const fuelCost = fuelData
                          .filter(f => f.equipmentId === item.id.toString())
                          .reduce((sum, f) => sum + f.cost, 0);
                        const totalOperatingCost = maintenanceCost + fuelCost;
                        const efficiency = getEquipmentEfficiency(item.id);

                        return (
                          <div key={item.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{item.name}</h3>
                              <Badge variant={item.status === 'operational' ? 'default' : 'destructive'}>
                                {item.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Fuel Cost:</span>
                                <p className="font-bold">${fuelCost.toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Maintenance:</span>
                                <p className="font-bold">${maintenanceCost.toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total Operating:</span>
                                <p className="font-bold">${totalOperatingCost.toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Efficiency:</span>
                                <p className="font-bold">{efficiency ? `${efficiency} hrs/gal` : 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}