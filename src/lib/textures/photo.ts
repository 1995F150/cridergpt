// Photo texture cleanup: load image, remove lighting, make seamless.
import { makeSeamless } from './procedural';

export async function loadImageToCanvas(file: File, size = 1024): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    // Center-crop to square then scale
    const s = Math.min(img.width, img.height);
    const sx = (img.width - s) / 2;
    const sy = (img.height - s) / 2;
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Lighting flatten via large box-blur subtraction (highpass-ish).
export function flattenLighting(canvas: HTMLCanvasElement, strength = 0.7): HTMLCanvasElement {
  const size = canvas.width;
  const ctx = canvas.getContext('2d')!;
  const src = ctx.getImageData(0, 0, size, size);
  const blurred = boxBlur(src, Math.floor(size / 8));
  const out = document.createElement('canvas');
  out.width = size; out.height = size;
  const octx = out.getContext('2d')!;
  const img = octx.createImageData(size, size);
  const sd = src.data, bd = blurred.data, od = img.data;
  for (let i = 0; i < sd.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = sd[i + c];
      const blur = bd[i + c];
      // Highpass + average gray
      const hp = orig - blur + 128;
      od[i + c] = Math.max(0, Math.min(255, orig * (1 - strength) + hp * strength));
    }
    od[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}

function boxBlur(src: ImageData, radius: number): ImageData {
  const { width: w, height: h, data } = src;
  const out = new ImageData(w, h);
  const od = out.data;
  // Horizontal then vertical (separable)
  const tmp = new Uint8ClampedArray(data.length);
  const rad = Math.max(1, radius);
  // Horizontal
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let x = -rad; x <= rad; x++) {
        const xx = Math.max(0, Math.min(w - 1, x));
        sum += data[(y * w + xx) * 4 + c];
      }
      for (let x = 0; x < w; x++) {
        tmp[(y * w + x) * 4 + c] = sum / (rad * 2 + 1);
        const xAdd = Math.min(w - 1, x + rad + 1);
        const xSub = Math.max(0, x - rad);
        sum += data[(y * w + xAdd) * 4 + c] - data[(y * w + xSub) * 4 + c];
      }
    }
  }
  // Vertical
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let y = -rad; y <= rad; y++) {
        const yy = Math.max(0, Math.min(h - 1, y));
        sum += tmp[(yy * w + x) * 4 + c];
      }
      for (let y = 0; y < h; y++) {
        od[(y * w + x) * 4 + c] = sum / (rad * 2 + 1);
        const yAdd = Math.min(h - 1, y + rad + 1);
        const ySub = Math.max(0, y - rad);
        sum += tmp[(yAdd * w + x) * 4 + c] - tmp[(ySub * w + x) * 4 + c];
      }
    }
  }
  for (let i = 3; i < od.length; i += 4) od[i] = 255;
  return out;
}

export function processPhoto(file: File, opts: { size?: number; flatten?: boolean; tile?: boolean } = {}) {
  const size = opts.size ?? 1024;
  return loadImageToCanvas(file, size).then(c => {
    let out = c;
    if (opts.flatten !== false) out = flattenLighting(out, 0.6);
    if (opts.tile !== false) out = makeSeamless(out);
    return out;
  });
}
