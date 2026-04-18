import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { TextureSet } from '@/lib/textures/maps';

type ShapeKind = 'plane' | 'cube' | 'wall' | 'floor';
type ViewMode = 'final' | 'diffuse' | 'normal' | 'roughness';

function canvasToTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function RotatingLight() {
  const ref = useRef<THREE.DirectionalLight>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * 0.4;
    ref.current.position.set(Math.cos(t) * 4, 3, Math.sin(t) * 4);
  });
  return <directionalLight ref={ref} intensity={1.2} castShadow />;
}

interface SceneProps {
  set: TextureSet;
  shape: ShapeKind;
  viewMode: ViewMode;
  tileRepeat: number;
}

function Scene({ set, shape, viewMode, tileRepeat }: SceneProps) {
  const textures = useMemo(() => {
    return {
      diffuse: canvasToTexture(set.diffuse),
      normal: canvasToTexture(set.normal),
      roughness: canvasToTexture(set.roughness),
      ao: canvasToTexture(set.ao),
    };
  }, [set]);

  useEffect(() => {
    Object.values(textures).forEach(t => {
      t.repeat.set(tileRepeat, tileRepeat);
      t.needsUpdate = true;
    });
  }, [textures, tileRepeat]);

  useEffect(() => () => {
    Object.values(textures).forEach(t => t.dispose());
  }, [textures]);

  // View mode swaps which canvas drives the diffuse channel
  const displayMap = viewMode === 'normal' ? textures.normal
    : viewMode === 'roughness' ? textures.roughness
    : viewMode === 'diffuse' ? textures.diffuse
    : textures.diffuse;

  const material = (
    <meshStandardMaterial
      map={displayMap}
      normalMap={viewMode === 'final' ? textures.normal : undefined}
      roughnessMap={viewMode === 'final' ? textures.roughness : undefined}
      aoMap={viewMode === 'final' ? textures.ao : undefined}
      metalness={0}
      roughness={1}
    />
  );

  const geometry = (() => {
    switch (shape) {
      case 'cube': return <boxGeometry args={[2, 2, 2]} />;
      case 'wall': return <planeGeometry args={[3, 2]} />;
      case 'floor': return <planeGeometry args={[4, 4]} />;
      default: return <planeGeometry args={[2, 2]} />;
    }
  })();

  const rotation: [number, number, number] =
    shape === 'floor' ? [-Math.PI / 2, 0, 0] : [0, 0, 0];

  return (
    <>
      <ambientLight intensity={0.35} />
      <RotatingLight />
      <mesh rotation={rotation}>
        {geometry}
        {material}
      </mesh>
      <OrbitControls enablePan={false} />
    </>
  );
}

export function TexturePreview3D(props: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 3.5], fov: 45 }}
      style={{ background: 'hsl(var(--muted))' }}
      shadows
    >
      <Scene {...props} />
    </Canvas>
  );
}
