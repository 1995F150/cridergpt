
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus } from 'lucide-react';

interface MaintenanceRecord {
  id: string;
  date: string;
  mileage: number;
  serviceType: string;
  description: string;
  cost: number;
  mechanic: string;
  nextServiceMileage?: number;
}

export function VehicleMaintenanceLog() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [formData, setFormData] = useState({
    date: '',
    mileage: '',
    serviceType: '',
    description: '',
    cost: '',
    mechanic: '',
    nextServiceMileage: ''
  });

  const serviceTypes = [
    'Oil Change',
    'Tire Rotation',
    'Brake Service',
    'Air Filter',
    'Transmission Service',
    'Coolant Flush',
    'Spark Plugs',
    'Battery Replacement',
    'Inspection',
    'Other'
  ];

  const addRecord = () => {
    if (!formData.date || !formData.mileage || !formData.serviceType) {
      alert('Please fill in the required fields (Date, Mileage, Service Type)');
      return;
    }

    const newRecord: MaintenanceRecord = {
      id: Date.now().toString(),
      date: formData.date,
      mileage: parseInt(formData.mileage),
      serviceType: formData.serviceType,
      description: formData.description,
      cost: parseFloat(formData.cost) || 0,
      mechanic: formData.mechanic,
      nextServiceMileage: formData.nextServiceMileage ? parseInt(formData.nextServiceMileage) : undefined
    };

    setRecords([newRecord, ...records]);
    
    // Reset form
    setFormData({
      date: '',
      mileage: '',
      serviceType: '',
      description: '',
      cost: '',
      mechanic: '',
      nextServiceMileage: ''
    });
  };

  const deleteRecord = (id: string) => {
    setRecords(records.filter(record => record.id !== id));
  };

  const totalCost = records.reduce((sum, record) => sum + record.cost, 0);

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Vehicle Maintenance Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Record Form */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Add New Maintenance Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="mileage">Mileage *</Label>
                <Input
                  id="mileage" 
                  type="number"
                  placeholder="Current mileage"
                  value={formData.mileage}
                  onChange={(e) => setFormData({...formData, mileage: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="serviceType">Service Type *</Label>
                <Select value={formData.serviceType} onValueChange={(value) => setFormData({...formData, serviceType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="Service cost"
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="mechanic">Mechanic/Shop</Label>
                <Input
                  id="mechanic"
                  placeholder="Who performed the service"
                  value={formData.mechanic}
                  onChange={(e) => setFormData({...formData, mechanic: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description">Description/Notes</Label>
                <Textarea
                  id="description"
                  placeholder="Additional details about the service"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="nextServiceMileage">Next Service Due (miles)</Label>
                <Input
                  id="nextServiceMileage"
                  type="number"
                  placeholder="When is next service due"
                  value={formData.nextServiceMileage}
                  onChange={(e) => setFormData({...formData, nextServiceMileage: e.target.value})}
                />
              </div>
            </div>

            <Button onClick={addRecord} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Maintenance Record
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        {records.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-primary">{records.length}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-green-600">${totalCost.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Spent</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600">
                {records.length > 0 ? Math.max(...records.map(r => r.mileage)).toLocaleString() : 0}
              </div>
              <div className="text-sm text-muted-foreground">Latest Mileage</div>
            </Card>
          </div>
        )}

        {/* Records List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Maintenance History</h3>
          {records.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No maintenance records yet. Add your first record above.</p>
            </Card>
          ) : (
            records.map((record) => (
              <Card key={record.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <div className="font-semibold">{record.serviceType}</div>
                      <div className="text-sm text-muted-foreground">{record.date}</div>
                    </div>
                    <div>
                      <div className="font-semibold">{record.mileage.toLocaleString()} miles</div>
                      {record.nextServiceMileage && (
                        <div className="text-sm text-muted-foreground">
                          Next: {record.nextServiceMileage.toLocaleString()} miles
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">${record.cost.toFixed(2)}</div>
                      {record.mechanic && (
                        <div className="text-sm text-muted-foreground">{record.mechanic}</div>
                      )}
                    </div>
                    <div>
                      {record.description && (
                        <div className="text-sm">{record.description}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteRecord(record.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
