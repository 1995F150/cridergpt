
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface Preset {
  id: string;
  name: string;
  type: 'tax' | 'tip' | 'interest' | 'discount' | 'other';
  value: number;
  description: string;
}

const PRESET_TYPES = [
  { value: 'tax', label: 'Tax Rate' },
  { value: 'tip', label: 'Tip Percentage' },
  { value: 'interest', label: 'Interest Rate' },
  { value: 'discount', label: 'Discount Percentage' },
  { value: 'other', label: 'Other' }
];

const DEFAULT_PRESETS: Preset[] = [
  { id: '1', name: 'Standard Tax', type: 'tax', value: 8.25, description: 'Default sales tax rate' },
  { id: '2', name: 'Good Service Tip', type: 'tip', value: 18, description: 'Standard tip for good service' },
  { id: '3', name: 'Great Service Tip', type: 'tip', value: 20, description: 'Tip for exceptional service' },
  { id: '4', name: 'Mortgage Rate', type: 'interest', value: 6.5, description: 'Current mortgage interest rate' },
  { id: '5', name: 'Standard Discount', type: 'discount', value: 10, description: 'Common retail discount' }
];

export function UserPresets() {
  const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPreset, setNewPreset] = useState({
    name: '',
    type: 'other' as Preset['type'],
    value: '',
    description: ''
  });

  useEffect(() => {
    const savedPresets = localStorage.getItem('financial-presets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  const savePresets = (updatedPresets: Preset[]) => {
    localStorage.setItem('financial-presets', JSON.stringify(updatedPresets));
    setPresets(updatedPresets);
  };

  const addPreset = () => {
    if (newPreset.name && newPreset.value) {
      const preset: Preset = {
        id: Date.now().toString(),
        name: newPreset.name,
        type: newPreset.type,
        value: parseFloat(newPreset.value),
        description: newPreset.description
      };

      savePresets([...presets, preset]);
      setNewPreset({ name: '', type: 'other', value: '', description: '' });
      toast.success('Preset added successfully');
    }
  };

  const updatePreset = (id: string, updatedPreset: Partial<Preset>) => {
    const updatedPresets = presets.map(preset =>
      preset.id === id ? { ...preset, ...updatedPreset } : preset
    );
    savePresets(updatedPresets);
    setEditingId(null);
    toast.success('Preset updated successfully');
  };

  const removePreset = (id: string) => {
    const updatedPresets = presets.filter(preset => preset.id !== id);
    savePresets(updatedPresets);
    toast.success('Preset removed');
  };

  const applyPreset = (preset: Preset) => {
    // Copy the preset value to clipboard for easy use
    navigator.clipboard.writeText(preset.value.toString());
    toast.success(`${preset.name} (${preset.value}%) copied to clipboard`);
  };

  const resetToDefaults = () => {
    savePresets(DEFAULT_PRESETS);
    toast.success('Reset to default presets');
  };

  const getTypeColor = (type: Preset['type']) => {
    switch (type) {
      case 'tax': return 'bg-red-100 text-red-800';
      case 'tip': return 'bg-green-100 text-green-800';
      case 'interest': return 'bg-blue-100 text-blue-800';
      case 'discount': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Preset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={newPreset.name}
                onChange={(e) => setNewPreset({...newPreset, name: e.target.value})}
                placeholder="My Custom Rate"
              />
            </div>
            <div>
              <Label htmlFor="preset-type">Type</Label>
              <Select value={newPreset.type} onValueChange={(value: Preset['type']) => setNewPreset({...newPreset, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="preset-value">Value (%)</Label>
              <Input
                id="preset-value"
                type="number"
                step="0.01"
                value={newPreset.value}
                onChange={(e) => setNewPreset({...newPreset, value: e.target.value})}
                placeholder="15.5"
              />
            </div>
            <div>
              <Label htmlFor="preset-description">Description (Optional)</Label>
              <Input
                id="preset-description"
                value={newPreset.description}
                onChange={(e) => setNewPreset({...newPreset, description: e.target.value})}
                placeholder="Brief description"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={addPreset} className="flex-1">Add Preset</Button>
            <Button variant="outline" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map((preset) => (
              <Card key={preset.id} className="p-4">
                {editingId === preset.id ? (
                  <EditPresetForm
                    preset={preset}
                    onSave={(updatedPreset) => updatePreset(preset.id, updatedPreset)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{preset.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${getTypeColor(preset.type)}`}>
                          {PRESET_TYPES.find(t => t.value === preset.type)?.label}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(preset.id)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePreset(preset.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-center py-3">
                      <span className="text-2xl font-bold text-primary">{preset.value}%</span>
                    </div>
                    
                    {preset.description && (
                      <p className="text-xs text-muted-foreground mb-3">{preset.description}</p>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => applyPreset(preset)}
                    >
                      Apply & Copy
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
          
          {presets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No presets yet. Add your first preset above!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface EditPresetFormProps {
  preset: Preset;
  onSave: (updatedPreset: Partial<Preset>) => void;
  onCancel: () => void;
}

function EditPresetForm({ preset, onSave, onCancel }: EditPresetFormProps) {
  const [editData, setEditData] = useState({
    name: preset.name,
    type: preset.type,
    value: preset.value.toString(),
    description: preset.description
  });

  const handleSave = () => {
    onSave({
      name: editData.name,
      type: editData.type,
      value: parseFloat(editData.value),
      description: editData.description
    });
  };

  return (
    <div className="space-y-3">
      <Input
        value={editData.name}
        onChange={(e) => setEditData({...editData, name: e.target.value})}
        placeholder="Preset name"
      />
      
      <Select value={editData.type} onValueChange={(value: Preset['type']) => setEditData({...editData, type: value})}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESET_TYPES.map(type => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Input
        type="number"
        step="0.01"
        value={editData.value}
        onChange={(e) => setEditData({...editData, value: e.target.value})}
        placeholder="Value"
      />
      
      <Input
        value={editData.description}
        onChange={(e) => setEditData({...editData, description: e.target.value})}
        placeholder="Description"
      />
      
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave}>
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
