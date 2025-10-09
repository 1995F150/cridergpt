import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { GLTFExporter } from 'three-stdlib';
import { OBJLoader } from 'three-stdlib';
import { FBXLoader } from 'three-stdlib';

/**
 * CriderGPT Studio File Handler
 * Handles import/export of 3D models in various formats
 * Supports: .fbx, .obj, .glb, .gltf, .json (CriderGPT native)
 */

export interface SceneObject {
  id: string;
  type: string;
  name?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color?: string;
  wireframe?: boolean;
  aiGenerated?: boolean;
}

export class CriderGPTStudioFileHandler {
  
  /**
   * Open File Dialog - Blender-style file picker
   */
  static openFile(onLoad: (objects: SceneObject[], fileName: string) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.fbx,.obj,.glb,.gltf,.json,.crider.json';
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (!file) return;
      
      console.log(`📂 Opening file: ${file.name}`);
      
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      try {
        let objects: SceneObject[] = [];
        
        switch (extension) {
          case 'fbx':
            objects = await this.loadFBX(file);
            break;
          case 'obj':
            objects = await this.loadOBJ(file);
            break;
          case 'glb':
          case 'gltf':
            objects = await this.loadGLTF(file);
            break;
          case 'json':
            objects = await this.loadJSON(file);
            break;
          default:
            alert(`❌ Unsupported file format: .${extension}`);
            return;
        }
        
        console.log(`✅ Loaded model: ${file.name} (${objects.length} objects)`);
        onLoad(objects, file.name);
        
      } catch (error) {
        console.error(`❌ Error loading file: ${file.name}`, error);
        alert(`Failed to load ${file.name}: ${error}`);
      }
    };
    
    input.click();
  }

  /**
   * Load FBX file
   */
  private static loadFBX(file: File): Promise<SceneObject[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const loader = new FBXLoader();
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const group = loader.parse(arrayBuffer, '');
          
          const objects = this.extractObjectsFromGroup(group);
          resolve(objects);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read FBX file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Load OBJ file
   */
  private static loadOBJ(file: File): Promise<SceneObject[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const loader = new OBJLoader();
          const text = e.target?.result as string;
          const group = loader.parse(text);
          
          const objects = this.extractObjectsFromGroup(group);
          resolve(objects);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read OBJ file'));
      reader.readAsText(file);
    });
  }

  /**
   * Load GLTF/GLB file
   */
  private static loadGLTF(file: File): Promise<SceneObject[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const loader = new GLTFLoader();
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          loader.parse(arrayBuffer, '', (gltf) => {
            const objects = this.extractObjectsFromGroup(gltf.scene);
            resolve(objects);
          }, reject);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read GLTF file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Load CriderGPT JSON format
   */
  private static loadJSON(file: File): Promise<SceneObject[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);
          
          if (data.objects && Array.isArray(data.objects)) {
            resolve(data.objects);
          } else {
            reject(new Error('Invalid CriderGPT JSON format'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read JSON file'));
      reader.readAsText(file);
    });
  }

  /**
   * Extract SceneObjects from Three.js Group/Object3D
   */
  private static extractObjectsFromGroup(group: THREE.Object3D): SceneObject[] {
    const objects: SceneObject[] = [];
    
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        let type = 'box'; // default
        
        // Try to determine geometry type
        if (geometry instanceof THREE.SphereGeometry) {
          type = 'sphere';
        } else if (geometry instanceof THREE.CylinderGeometry) {
          type = 'cylinder';
        } else if (geometry instanceof THREE.PlaneGeometry) {
          type = 'plane';
        }
        
        const material = child.material as THREE.MeshStandardMaterial;
        const color = material.color ? `#${material.color.getHexString()}` : '#888888';
        
        objects.push({
          id: child.uuid,
          type,
          name: child.name || `imported_${type}`,
          position: {
            x: child.position.x,
            y: child.position.y,
            z: child.position.z
          },
          rotation: {
            x: child.rotation.x,
            y: child.rotation.y,
            z: child.rotation.z
          },
          scale: {
            x: child.scale.x,
            y: child.scale.y,
            z: child.scale.z
          },
          color,
          wireframe: false
        });
      }
    });
    
    return objects;
  }

  /**
   * Save as CriderGPT JSON format (.crider.json)
   */
  static saveJSON(objects: SceneObject[]): void {
    console.log('💾 Saving project as CriderGPT JSON...');
    
    const data = {
      version: '1.0.0',
      application: 'CriderGPT Studio',
      timestamp: new Date().toISOString(),
      objects
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `crider_project_${Date.now()}.crider.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log(`✅ Saved: ${a.download}`);
  }

  /**
   * Export scene as FBX
   */
  static exportFBX(scene: THREE.Scene): void {
    console.log('📤 Exporting as FBX...');
    
    try {
      // Note: FBXExporter is not available in three-stdlib
      // For true FBX export, you'd need a backend service
      alert('ℹ️ FBX export requires a backend converter. Use GLB export instead for full compatibility.');
      console.log('⚠️ FBX export not available in browser. Use exportGLTF() instead.');
    } catch (error) {
      console.error('❌ FBX export failed:', error);
      alert('FBX export failed. Try GLB format instead.');
    }
  }

  /**
   * Export scene as GLTF/GLB
   */
  static exportGLTF(scene: THREE.Scene, binary = true): void {
    console.log(`📤 Exporting as ${binary ? 'GLB' : 'GLTF'}...`);
    
    const exporter = new GLTFExporter();
    
    exporter.parse(
      scene,
      (result) => {
        if (binary) {
          // GLB (binary)
          const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = `crider_export_${Date.now()}.glb`;
          a.click();
          
          URL.revokeObjectURL(url);
          console.log(`✅ Exported: ${a.download}`);
        } else {
          // GLTF (JSON)
          const json = JSON.stringify(result, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = `crider_export_${Date.now()}.gltf`;
          a.click();
          
          URL.revokeObjectURL(url);
          console.log(`✅ Exported: ${a.download}`);
        }
      },
      (error) => {
        console.error('❌ GLTF export failed:', error);
        alert('GLTF export failed: ' + error);
      },
      { binary }
    );
  }

  /**
   * Export scene as OBJ (geometry only)
   */
  static exportOBJ(scene: THREE.Scene): void {
    console.log('📤 Exporting as OBJ...');
    
    try {
      let objContent = '# CriderGPT Studio Export\n';
      objContent += `# Exported: ${new Date().toISOString()}\n\n`;
      
      let vertexOffset = 0;
      
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const geometry = object.geometry;
          const position = geometry.attributes.position;
          
          if (position) {
            objContent += `o ${object.name || 'mesh'}\n`;
            
            // Vertices
            for (let i = 0; i < position.count; i++) {
              const x = position.getX(i);
              const y = position.getY(i);
              const z = position.getZ(i);
              objContent += `v ${x} ${y} ${z}\n`;
            }
            
            // Faces
            const index = geometry.index;
            if (index) {
              for (let i = 0; i < index.count; i += 3) {
                const a = index.getX(i) + vertexOffset + 1;
                const b = index.getX(i + 1) + vertexOffset + 1;
                const c = index.getX(i + 2) + vertexOffset + 1;
                objContent += `f ${a} ${b} ${c}\n`;
              }
            } else {
              for (let i = 0; i < position.count; i += 3) {
                const a = i + vertexOffset + 1;
                const b = i + 1 + vertexOffset + 1;
                const c = i + 2 + vertexOffset + 1;
                objContent += `f ${a} ${b} ${c}\n`;
              }
            }
            
            vertexOffset += position.count;
            objContent += '\n';
          }
        }
      });
      
      const blob = new Blob([objContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `crider_export_${Date.now()}.obj`;
      a.click();
      
      URL.revokeObjectURL(url);
      console.log(`✅ Exported: ${a.download}`);
      
    } catch (error) {
      console.error('❌ OBJ export failed:', error);
      alert('OBJ export failed: ' + error);
    }
  }

  /**
   * Auto-detect and export to best format
   */
  static autoExport(scene: THREE.Scene, format: 'fbx' | 'glb' | 'gltf' | 'obj' = 'glb'): void {
    switch (format) {
      case 'fbx':
        this.exportFBX(scene);
        break;
      case 'glb':
        this.exportGLTF(scene, true);
        break;
      case 'gltf':
        this.exportGLTF(scene, false);
        break;
      case 'obj':
        this.exportOBJ(scene);
        break;
      default:
        this.exportGLTF(scene, true);
    }
  }
}
