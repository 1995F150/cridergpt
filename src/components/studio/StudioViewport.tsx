import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';

interface StudioViewportProps {
  objects: any[];
  selectedObjectId: string | null;
  onObjectSelect: (id: string | null) => void;
  onObjectTransform: (id: string, transform: any) => void;
}

function SceneObject({ object, isSelected, onSelect, onTransform }: any) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && object.rotation) {
      meshRef.current.rotation.x = object.rotation.x || 0;
      meshRef.current.rotation.y = object.rotation.y || 0;
      meshRef.current.rotation.z = object.rotation.z || 0;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onSelect(object.id);
  };

  const getMesh = () => {
    switch (object.type) {
      case 'box':
        return <boxGeometry args={[1, 1, 1]} />;
      case 'sphere':
        return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'cylinder':
        return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'plane':
        return <planeGeometry args={[2, 2]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={[object.position.x, object.position.y, object.position.z]}
      scale={[object.scale.x, object.scale.y, object.scale.z]}
      onClick={handleClick}
    >
      {getMesh()}
      <meshStandardMaterial
        color={isSelected ? '#4f46e5' : object.color || '#888888'}
        wireframe={object.wireframe || false}
      />
    </mesh>
  );
}

export function StudioViewport({ objects, selectedObjectId, onObjectSelect, onObjectTransform }: StudioViewportProps) {
  return (
    <div className="w-full h-full bg-zinc-900">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        shadows
        gl={{ preserveDrawingBuffer: true }}
        style={{ background: '#1a1a1a' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
        />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />

        {/* Grid */}
        <Grid
          cellSize={1}
          cellThickness={0.5}
          cellColor="#444444"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#666666"
          fadeDistance={50}
          fadeStrength={1}
          infiniteGrid
        />

        {/* Scene Objects */}
        {objects.map((obj) => (
          <SceneObject
            key={obj.id}
            object={obj}
            isSelected={obj.id === selectedObjectId}
            onSelect={onObjectSelect}
            onTransform={onObjectTransform}
          />
        ))}

        {/* Controls */}
        <OrbitControls makeDefault />
        
        {/* Gizmo */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={['#ff0000', '#00ff00', '#0000ff']}
            labelColor="white"
          />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}
