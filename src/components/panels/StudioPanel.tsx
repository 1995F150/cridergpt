import { useState, useRef } from 'react';
import { Download, Save, FolderOpen, Sparkles, Info, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { StudioViewport } from '@/components/studio/StudioViewport';
import { StudioToolbar } from '@/components/studio/StudioToolbar';
import { AIPromptPanel } from '@/components/studio/AIPromptPanel';
import { PropertiesPanel } from '@/components/studio/PropertiesPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CriderGPTStudioFileHandler, SceneObject } from '@/utils/studioFileHandler';
import * as THREE from 'three';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// SceneObject interface moved to studioFileHandler.ts

export function StudioPanel() {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [exportFormat, setExportFormat] = useState<'glb' | 'gltf' | 'obj' | 'fbx'>('glb');
  const sceneRef = useRef<THREE.Scene | null>(null);
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

  const handleOpen = () => {
    CriderGPTStudioFileHandler.openFile((loadedObjects, fileName) => {
      setObjects(loadedObjects);
      toast({
        title: "File Loaded",
        description: `Successfully loaded ${fileName} with ${loadedObjects.length} objects`,
      });
    });
  };

  const handleSave = () => {
    CriderGPTStudioFileHandler.saveJSON(objects);
    toast({
      title: "Project Saved",
      description: "Saved as CriderGPT JSON format",
    });
  };

  const handleExport = () => {
    if (!sceneRef.current) {
      // Create a temporary scene for export
      const tempScene = new THREE.Scene();
      
      objects.forEach(obj => {
        let geometry: THREE.BufferGeometry;
        
        switch (obj.type) {
          case 'sphere':
            geometry = new THREE.SphereGeometry(0.5, 32, 32);
            break;
          case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
            break;
          case 'plane':
            geometry = new THREE.PlaneGeometry(2, 2);
            break;
          default:
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        const material = new THREE.MeshStandardMaterial({
          color: obj.color || '#888888',
          wireframe: obj.wireframe || false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
        mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
        mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
        mesh.name = obj.name || obj.type;
        
        tempScene.add(mesh);
      });
      
      sceneRef.current = tempScene;
    }
    
    CriderGPTStudioFileHandler.autoExport(sceneRef.current, exportFormat);
    toast({
      title: "Exporting Scene",
      description: `Exporting as ${exportFormat.toUpperCase()} format...`,
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
          <Button variant="outline" size="sm" onClick={handleOpen}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Open
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <div className="flex items-center gap-2">
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="glb">GLB</SelectItem>
                <SelectItem value="gltf">GLTF</SelectItem>
                <SelectItem value="obj">OBJ</SelectItem>
                <SelectItem value="fbx">FBX</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="m-4 mb-0">
        <Info className="h-4 w-4" />
        <AlertDescription>
          CriderGPT Studio - Browser-based 3D modeling with Blender-style import/export.
          <br />
          <strong>Supported formats:</strong> .fbx, .obj, .glb, .gltf, .crider.json
          <br />
          Use <strong>Open</strong> to import models, <strong>Save</strong> for project files, and <strong>Export</strong> for production formats.
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
