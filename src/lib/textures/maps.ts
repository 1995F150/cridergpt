// Derive PBR maps (normal / roughness / AO / height) from a diffuse canvas.
// All in-browser, no AI cost.

export function canvasToHeight(diffuse: HTMLCanvasElement): HTMLCanvasElement {
  const size = diffuse.width;
  const ctx = diffuse.getContext('2d')!;
  const src = ctx.getImageData(0, 0, size, size).data;
  const out = document.createElement('canvas');
  out.width = size; out.height = size;
  const octx = out.getContext('2d')!;
  const img = octx.createImageData(size, size);
  const data = img.data;
  for (let i = 0; i < src.length; i += 4) {
    // Luminance
    const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    data[i] = data[i + 1] = data[i + 2] = lum;
    data[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}

export function heightToNormal(height: HTMLCanvasElement, strength = 2): HTMLCanvasElement {
  const size = height.width;
  const hctx = height.getContext('2d')!;
  const h = hctx.getImageData(0, 0, size, size).data;
  const out = document.createElement('canvas');
  out.width = size; out.height = size;
  const octx = out.getContext('2d')!;
  const img = octx.createImageData(size, size);
  const data = img.data;
  const get = (x: number, y: number) => {
    const xx = (x + size) % size;
    const yy = (y + size) % size;
    return h[(yy * size + xx) * 4];
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = get(x - 1, y - 1), t = get(x, y - 1), tr = get(x + 1, y - 1);
      const l = get(x - 1, y), r = get(x + 1, y);
      const bl = get(x - 1, y + 1), bb = get(x, y + 1), br = get(x + 1, y + 1);
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * bb + br) - (tl + 2 * t + tr);
      const nx = -dx * strength / 255;
      const ny = -dy * strength / 255;
      const nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const idx = (y * size + x) * 4;
      data[idx]     = ((nx / len) * 0.5 + 0.5) * 255;
      data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      data[idx + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

export function diffuseToRoughness(diffuse: HTMLCanvasElement, baseRoughness: number): HTMLCanvasElement {
  const size = diffuse.width;
  const ctx = diffuse.getContext('2d')!;
  const src = ctx.getImageData(0, 0, size, size).data;
  const out = document.createElement('canvas');
  out.width = size; out.height = size;
  const octx = out.getContext('2d')!;
  const img = octx.createImageData(size, size);
  const data = img.data;
  for (let i = 0; i < src.length; i += 4) {
    const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    // Darker spots (dirt/wear) → rougher
    const r = baseRoughness * 255 + (255 - lum) * 0.3;
    data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, r));
    data[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}

export function heightToAO(height: HTMLCanvasElement, intensity = 0.7): HTMLCanvasElement {
  const size = height.width;
  const hctx = height.getContext('2d')!;
  const h = hctx.getImageData(0, 0, size, size).data;
  const out = document.createElement('canvas');
  out.width = size; out.height = size;
  const octx = out.getContext('2d')!;
  const img = octx.createImageData(size, size);
  const data = img.data;
  const get = (x: number, y: number) => {
    const xx = (x + size) % size;
    const yy = (y + size) % size;
    return h[(yy * size + xx) * 4];
  };
  const radius = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const center = get(x, y);
      let occlusion = 0;
      let samples = 0;
      for (let oy = -radius; oy <= radius; oy += 2) {
        for (let ox = -radius; ox <= radius; ox += 2) {
          if (ox === 0 && oy === 0) continue;
          const n = get(x + ox, y + oy);
          if (n > center) occlusion += (n - center);
          samples++;
        }
      }
      const ao = 255 - (occlusion / samples) * intensity * 4;
      const idx = (y * size + x) * 4;
      data[idx] = data[idx + 1] = data[idx + 2] = Math.max(0, Math.min(255, ao));
      data[idx + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

export function packRGBA(
  rChannel: HTMLCanvasElement,
  gChannel: HTMLCanvasElement,
  bChannel: HTMLCanvasElement,
  aChannel?: HTMLCanvasElement
): HTMLCanvasElement {
  const size = rChannel.width;
  const out = document.createElement('canvas');
  out.width = size; out.height = size;
  const octx = out.getContext('2d')!;
  const img = octx.createImageData(size, size);
  const data = img.data;
  const r = rChannel.getContext('2d')!.getImageData(0, 0, size, size).data;
  const g = gChannel.getContext('2d')!.getImageData(0, 0, size, size).data;
  const b = bChannel.getContext('2d')!.getImageData(0, 0, size, size).data;
  const a = aChannel?.getContext('2d')!.getImageData(0, 0, size, size).data;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = r[i];
    data[i + 1] = g[i];
    data[i + 2] = b[i];
    data[i + 3] = a ? a[i] : 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}

export interface TextureSet {
  diffuse: HTMLCanvasElement;
  normal: HTMLCanvasElement;
  roughness: HTMLCanvasElement;
  ao: HTMLCanvasElement;
  height: HTMLCanvasElement;
  packed: HTMLCanvasElement; // R=rough G=AO B=metal(0)
}

export function buildFullTextureSet(diffuse: HTMLCanvasElement, baseRoughness: number, normalStrength = 2): TextureSet {
  const height = canvasToHeight(diffuse);
  const normal = heightToNormal(height, normalStrength);
  const roughness = diffuseToRoughness(diffuse, baseRoughness);
  const ao = heightToAO(height);
  // Metal channel as flat black canvas
  const metal = document.createElement('canvas');
  metal.width = diffuse.width; metal.height = diffuse.width;
  const mctx = metal.getContext('2d')!;
  mctx.fillStyle = '#000'; mctx.fillRect(0, 0, metal.width, metal.height);
  const packed = packRGBA(roughness, ao, metal);
  return { diffuse, normal, roughness, ao, height, packed };
}
