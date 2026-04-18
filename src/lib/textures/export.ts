import JSZip from 'jszip';
import { TextureSet } from './maps';
import { TextureParams } from './procedural';

function canvasToBlob(c: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise(res => c.toBlob(b => res(b!), type, 1.0));
}

export async function exportPng(canvas: HTMLCanvasElement, filename: string) {
  const blob = await canvasToBlob(canvas);
  triggerDownload(blob, filename);
}

export async function exportTextureSetZip(set: TextureSet, params: TextureParams, name: string, preset: 'farming-simulator' | 'unreal' | 'unity' | 'generic' = 'farming-simulator') {
  const zip = new JSZip();
  const folder = zip.folder(name)!;
  folder.file(`${name}_diffuse.png`, await canvasToBlob(set.diffuse));
  folder.file(`${name}_normal.png`, await canvasToBlob(set.normal));
  folder.file(`${name}_roughness.png`, await canvasToBlob(set.roughness));
  folder.file(`${name}_ao.png`, await canvasToBlob(set.ao));
  folder.file(`${name}_height.png`, await canvasToBlob(set.height));
  folder.file(`${name}_packed_RGBA.png`, await canvasToBlob(set.packed));

  const metadata = {
    system: 'CriderGPT Texture Generator',
    version: '1.0',
    created_by: 'Jessie Crider',
    platform: 'CriderGPT',
    generated_at: new Date().toISOString(),
    name,
    preset,
    resolution: `${set.diffuse.width}x${set.diffuse.height}`,
    generation_mode: 'procedural',
    params,
    maps: {
      diffuse: true,
      normal: true,
      roughness: true,
      ao: true,
      height: true,
      packed_rgba: { r: 'roughness', g: 'ao', b: 'metalness' },
    },
    notes: preset === 'farming-simulator'
      ? 'Optimized for FS22/FS25. Convert PNG → DDS (DXT5) using FS Modhub tools or ImageMagick before in-game use.'
      : 'PBR-ready PNG set.',
  };
  folder.file('metadata.json', JSON.stringify(metadata, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `${name}.zip`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function validateTextureSet(set: TextureSet): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const size = set.diffuse.width;
  if (size !== set.normal.width || size !== set.roughness.width) {
    issues.push('Map sizes do not match.');
  }
  if (![256, 512, 1024, 2048].includes(size)) {
    issues.push(`Resolution ${size} is not power-of-two — may break in some engines.`);
  }
  return { ok: issues.length === 0, issues };
}
