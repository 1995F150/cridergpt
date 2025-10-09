import { useState } from 'react';
import { Download, Save, FolderOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { StudioViewport } from '@/components/studio/StudioViewport';
import { StudioToolbar } from '@/components/studio/StudioToolbar';
import { AIPromptPanel } from '@/components/studio/AIPromptPanel';
import { PropertiesPanel } from '@/components/studio/PropertiesPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SceneObject {
  id: string;
  type: 'box' | 'sphere' | 'cylinder' | 'plane';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  name?: string;
  aiGenerated?: boolean;
}

export function StudioPanel() {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const { toast } = useToast();

  const handleAddObject = (type: 'box' | 'sphere' | 'cylinder' | 'plane') => {
    const newObject: SceneObject = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#888888',
      name: type.charAt(0).toUpperCase() + type.slice(1)
    };

    setObjects([...objects, newObject]);
    setSelectedObjectId(newObject.id);
  };

  const handleDeleteSelected = () => {
    if (selectedObjectId) {
      setObjects(objects.filter(obj => obj.id !== selectedObjectId));
      setSelectedObjectId(null);
    }
  };

  const handleObjectSelect = (id: string | null) => {
    setSelectedObjectId(id);
  };

  const handleObjectTransform = (id: string, transform: any) => {
    setObjects(objects.map(obj => 
      obj.id === id ? { ...obj, ...transform } : obj
    ));
  };

  const handlePropertyChange = (property: string, value: any) => {
    if (selectedObjectId) {
      setObjects(objects.map(obj =>
        obj.id === selectedObjectId ? { ...obj, [property]: value } : obj
      ));
    }
  };

  const handleAIObjectGenerated = (objectData: any) => {
    setObjects([...objects, objectData]);
    setSelectedObjectId(objectData.id);
  };

  const handleExport = () => {
    const sceneData = {
      version: '1.0',
      objects: objects.map(obj => ({
        ...obj,
        // Convert to i3d-compatible format
        transform: {
          translation: `${obj.position.x} ${obj.position.y} ${obj.position.z}`,
          rotation: `${obj.rotation.x} ${obj.rotation.y} ${obj.rotation.z}`,
          scale: `${obj.scale.x} ${obj.scale.y} ${obj.scale.z}`
        }
      }))
    };

    const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cridergpt-scene-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Scene Exported",
      description: "Your 3D scene has been exported successfully",
    });
  };

  const selectedObject = objects.find(obj => obj.id === selectedObjectId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">CriderGPT Studio</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FolderOpen className="h-4 w-4 mr-2" />
            Open
          </Button>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="m-4 mb-0">
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Use AI prompts to generate objects, or add primitives manually. Select objects to edit properties.
          Exports to JSON format compatible with FS22/i3d workflow.
        </AlertDescription>
      </Alert>

      {/* Toolbar */}
      <StudioToolbar
        onAddObject={handleAddObject}
        onDeleteSelected={handleDeleteSelected}
        transformMode={transformMode}
        onTransformModeChange={setTransformMode}
        hasSelection={!!selectedObjectId}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - AI & Tools */}
        <div className="w-80 border-r overflow-y-auto p-4 space-y-4">
          <AIPromptPanel onObjectGenerated={handleAIObjectGenerated} />
        </div>

        {/* Center - Viewport */}
        <div className="flex-1">
          <StudioViewport
            objects={objects}
            selectedObjectId={selectedObjectId}
            onObjectSelect={handleObjectSelect}
            onObjectTransform={handleObjectTransform}
          />
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-80 border-l overflow-y-auto p-4">
          <PropertiesPanel
            selectedObject={selectedObject}
            onPropertyChange={handlePropertyChange}
          />
        </div>
      </div>
    </div>
  );
}
