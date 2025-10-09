import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PropertiesPanelProps {
  selectedObject: any | null;
  onPropertyChange: (property: string, value: any) => void;
}

export function PropertiesPanel({ selectedObject, onPropertyChange }: PropertiesPanelProps) {
  if (!selectedObject) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">No object selected</p>
      </Card>
    );
  }

  const handleVectorChange = (vector: 'position' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', value: string) => {
    const numValue = parseFloat(value) || 0;
    onPropertyChange(vector, {
      ...selectedObject[vector],
      [axis]: numValue
    });
  };

  return (
    <Card className="p-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
      <div>
        <h3 className="font-semibold mb-2">Properties</h3>
        <p className="text-sm text-muted-foreground">{selectedObject.name || selectedObject.type}</p>
      </div>

      <Separator />

      {/* Position */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Position</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">X</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedObject.position.x}
              onChange={(e) => handleVectorChange('position', 'x', e.target.value)}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Y</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedObject.position.y}
              onChange={(e) => handleVectorChange('position', 'y', e.target.value)}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Z</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedObject.position.z}
              onChange={(e) => handleVectorChange('position', 'z', e.target.value)}
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Rotation</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">X</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedObject.rotation.x}
              onChange={(e) => handleVectorChange('rotation', 'x', e.target.value)}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Y</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedObject.rotation.y}
              onChange={(e) => handleVectorChange('rotation', 'y', e.target.value)}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Z</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedObject.rotation.z}
              onChange={(e) => handleVectorChange('rotation', 'z', e.target.value)}
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* Scale */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Scale</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">X</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedObject.scale.x}
              onChange={(e) => handleVectorChange('scale', 'x', e.target.value)}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Y</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedObject.scale.y}
              onChange={(e) => handleVectorChange('scale', 'y', e.target.value)}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Z</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedObject.scale.z}
              onChange={(e) => handleVectorChange('scale', 'z', e.target.value)}
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Color</Label>
        <Input
          type="color"
          value={selectedObject.color || '#888888'}
          onChange={(e) => onPropertyChange('color', e.target.value)}
          className="h-10"
        />
      </div>
    </Card>
  );
}
