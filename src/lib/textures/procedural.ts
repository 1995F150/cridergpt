// Procedural texture generators — pure canvas, zero AI cost.
// Each generator paints a 1024² (or chosen size) diffuse map onto a canvas.

export type MaterialCategory =
  | 'wood' | 'metal' | 'concrete' | 'fabric' | 'plastic'
  | 'glass' | 'ground' | 'agriculture' | 'industrial' | 'decals';

export interface TextureParams {
  size: number;            // 256 / 512 / 1024 / 2048
  category: MaterialCategory;
  subtype: string;         // e.g. 'oak', 'rusted', 'hay'
  // Common sliders
  roughness: number;       // 0..1
  wear: number;            // 0..1
  scale: number;           // 0.25..4
  contrast: number;        // 0..2
  brightness: number;      // 0..2
  tintR: number;           // 0..255
  tintG: number;
  tintB: number;
  tintAmount: number;      // 0..1
  patternDensity: number;  // 0..2
  damage: number;          // 0..1
  dirt: number;            // 0..1
  grainDirection: number;  // 0..360 deg
  seamless: boolean;
}

export const DEFAULT_PARAMS: TextureParams = {
  size: 1024,
  category: 'wood',
  subtype: 'oak',
  roughness: 0.6,
  wear: 0.3,
  scale: 1,
  contrast: 1,
  brightness: 1,
  tintR: 200, tintG: 160, tintB: 110, tintAmount: 0.4,
  patternDensity: 1,
  damage: 0.2,
  dirt: 0.2,
  grainDirection: 0,
  seamless: true,
};

export const SUBTYPES: Record<MaterialCategory, string[]> = {
  wood: ['oak', 'pine', 'painted', 'barnwood', 'walnut'],
  metal: ['chrome', 'gold', 'rusted', 'brushed', 'galvanized'],
  concrete: ['smooth', 'rough', 'cracked', 'wet'],
  fabric: ['canvas', 'denim', 'burlap', 'leather'],
  plastic: ['matte', 'glossy', 'scratched', 'rubber'],
  glass: ['clean', 'dirty', 'scratched', 'frosted'],
  ground: ['asphalt', 'gravel', 'dirt', 'mud', 'tracks'],
  agriculture: ['hay', 'straw', 'silage', 'manure', 'soil', 'grass'],
  industrial: ['workshop_floor', 'rubber_mat', 'diamond_plate', 'painted_steel'],
  decals: ['logo', 'poster', 'sign', 'sticker'],
};

export const PRESETS: Record<string, Partial<TextureParams>> = {
  'Polished Metal':  { category: 'metal', subtype: 'chrome', roughness: 0.05, wear: 0, dirt: 0, tintR: 200, tintG: 200, tintB: 210, tintAmount: 0.3 },
  'Rusted Metal':    { category: 'metal', subtype: 'rusted', roughness: 0.85, wear: 0.8, dirt: 0.6, tintR: 140, tintG: 70, tintB: 35, tintAmount: 0.7 },
  'Painted Wood':    { category: 'wood',  subtype: 'painted', roughness: 0.5, wear: 0.4, tintR: 200, tintG: 220, tintB: 230, tintAmount: 0.6 },
  'Dirty Concrete':  { category: 'concrete', subtype: 'rough', roughness: 0.9, dirt: 0.7, wear: 0.5, tintR: 130, tintG: 130, tintB: 125, tintAmount: 0.4 },
  'Wet Mud':         { category: 'ground', subtype: 'mud', roughness: 0.3, dirt: 0.9, tintR: 75, tintG: 55, tintB: 35, tintAmount: 0.8 },
  'Chrome Finish':   { category: 'metal', subtype: 'chrome', roughness: 0.02, wear: 0, dirt: 0, tintR: 220, tintG: 225, tintB: 235, tintAmount: 0.2 },
  'Gold Finish':     { category: 'metal', subtype: 'gold', roughness: 0.15, wear: 0.1, tintR: 220, tintG: 180, tintB: 70, tintAmount: 0.7 },
  'Clean Glass':     { category: 'glass', subtype: 'clean', roughness: 0.05, dirt: 0, tintR: 200, tintG: 220, tintB: 230, tintAmount: 0.2 },
  'Dirty Glass':     { category: 'glass', subtype: 'dirty', roughness: 0.3, dirt: 0.6, tintR: 180, tintG: 190, tintB: 180, tintAmount: 0.3 },
  'Hay Bale':        { category: 'agriculture', subtype: 'hay', roughness: 0.95, dirt: 0.2, tintR: 215, tintG: 180, tintB: 90, tintAmount: 0.7 },
  'Workshop Floor':  { category: 'industrial', subtype: 'workshop_floor', roughness: 0.7, dirt: 0.6, wear: 0.5, tintR: 110, tintG: 110, tintB: 115, tintAmount: 0.5 },
};

// --- Noise helpers ---
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise2D(x: number, y: number, rand: () => number, cache: Map<string, number>) {
  const key = `${x}|${y}`;
  let v = cache.get(key);
  if (v === undefined) { v = rand(); cache.set(key, v); }
  return v;
}

function fbm(x: number, y: number, octaves: number, persistence: number, rand: () => number) {
  let total = 0, freq = 1, amp = 1, max = 0;
  const cache = new Map<string, number>();
  for (let i = 0; i < octaves; i++) {
    const xi = Math.floor(x * freq);
    const yi = Math.floor(y * freq);
    const fx = x * freq - xi;
    const fy = y * freq - yi;
    const a = valueNoise2D(xi, yi, rand, cache);
    const b = valueNoise2D(xi + 1, yi, rand, cache);
    const c = valueNoise2D(xi, yi + 1, rand, cache);
    const d = valueNoise2D(xi + 1, yi + 1, rand, cache);
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const n = a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
    total += n * amp;
    max += amp;
    amp *= persistence;
    freq *= 2;
  }
  return total / max;
}

function clamp(v: number, lo = 0, hi = 255) { return Math.max(lo, Math.min(hi, v)); }

// --- Main generator ---
export function generateProceduralDiffuse(p: TextureParams, seed = 1337): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = p.size;
  canvas.height = p.size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(p.size, p.size);
  const data = img.data;
  const rand = mulberry32(seed);

  const angle = (p.grainDirection * Math.PI) / 180;
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const baseScale = 0.012 / p.scale;

  // Per-category base color
  const baseCol = baseColorFor(p);

  for (let y = 0; y < p.size; y++) {
    for (let x = 0; x < p.size; x++) {
      // Rotate UV for grain direction
      const u = (x * cosA - y * sinA) * baseScale * p.patternDensity;
      const v = (x * sinA + y * cosA) * baseScale * p.patternDensity;

      let r = baseCol.r, g = baseCol.g, b = baseCol.b;
      let mod = 1;

      switch (p.category) {
        case 'wood': {
          const rings = Math.sin(u * 28 + fbm(u * 2, v * 0.4, 4, 0.55, rand) * 6);
          const grain = fbm(u * 12, v * 0.6, 5, 0.5, rand);
          mod = 0.7 + rings * 0.18 + grain * 0.25;
          break;
        }
        case 'metal': {
          const brushed = Math.sin(v * 800) * 0.06;
          const noise = fbm(u * 6, v * 6, 4, 0.5, rand);
          mod = 0.85 + brushed + noise * 0.1;
          if (p.subtype === 'rusted') {
            const rust = fbm(u * 3, v * 3, 5, 0.6, rand);
            if (rust > 0.55) { r = 130 + rust * 60; g = 65 + rust * 40; b = 30 + rust * 20; }
          }
          break;
        }
        case 'concrete': {
          const speckle = fbm(u * 18, v * 18, 5, 0.55, rand);
          const cracks = Math.abs(fbm(u * 4, v * 4, 4, 0.5, rand) - 0.5);
          mod = 0.75 + speckle * 0.3;
          if (cracks < 0.04) mod *= 0.55;
          break;
        }
        case 'fabric': {
          const weaveU = Math.sin(x * 0.45) * 0.08;
          const weaveV = Math.sin(y * 0.45) * 0.08;
          const fuzz = fbm(u * 30, v * 30, 4, 0.5, rand);
          mod = 0.85 + weaveU + weaveV + fuzz * 0.1;
          break;
        }
        case 'plastic': {
          const n = fbm(u * 8, v * 8, 3, 0.4, rand);
          mod = 0.92 + n * 0.12;
          break;
        }
        case 'glass': {
          const n = fbm(u * 15, v * 15, 3, 0.4, rand);
          mod = 0.95 + n * 0.08;
          break;
        }
        case 'ground': {
          const pebbles = fbm(u * 12, v * 12, 5, 0.6, rand);
          const big = fbm(u * 3, v * 3, 4, 0.5, rand);
          mod = 0.6 + pebbles * 0.4 + big * 0.2;
          if (p.subtype === 'asphalt') mod *= 0.7;
          if (p.subtype === 'mud') { r *= 0.9; g *= 0.85; b *= 0.7; }
          break;
        }
        case 'agriculture': {
          const strands = Math.sin(u * 80 + fbm(u, v, 3, 0.5, rand) * 8) * 0.2;
          const clumps = fbm(u * 6, v * 6, 5, 0.55, rand);
          mod = 0.7 + strands + clumps * 0.3;
          break;
        }
        case 'industrial': {
          if (p.subtype === 'diamond_plate') {
            const dx = (x % 60) - 30, dy = (y % 60) - 30;
            const d = Math.sqrt(dx * dx + dy * dy);
            mod = d < 14 ? 1.15 : 0.8;
          } else {
            const n = fbm(u * 8, v * 8, 4, 0.5, rand);
            mod = 0.8 + n * 0.25;
          }
          break;
        }
        case 'decals': {
          mod = 1;
          break;
        }
      }

      // Apply contrast/brightness
      mod = (mod - 0.5) * p.contrast + 0.5;
      mod *= p.brightness;

      r *= mod; g *= mod; b *= mod;

      // Tint blend
      r = r * (1 - p.tintAmount) + p.tintR * p.tintAmount * mod;
      g = g * (1 - p.tintAmount) + p.tintG * p.tintAmount * mod;
      b = b * (1 - p.tintAmount) + p.tintB * p.tintAmount * mod;

      // Wear: lighten random spots
      if (p.wear > 0) {
        const w = fbm(u * 5, v * 5, 3, 0.5, rand);
        if (w > 1 - p.wear * 0.5) { r += 30; g += 30; b += 30; }
      }

      // Damage: dark scratches
      if (p.damage > 0) {
        const sc = Math.abs(fbm(u * 20, v * 2, 3, 0.5, rand) - 0.5);
        if (sc < p.damage * 0.05) { r *= 0.4; g *= 0.4; b *= 0.4; }
      }

      // Dirt overlay
      if (p.dirt > 0) {
        const d = fbm(u * 4, v * 4, 4, 0.6, rand);
        const da = d * p.dirt * 0.6;
        r = r * (1 - da) + 60 * da;
        g = g * (1 - da) + 50 * da;
        b = b * (1 - da) + 35 * da;
      }

      const idx = (y * p.size + x) * 4;
      data[idx]     = clamp(r);
      data[idx + 1] = clamp(g);
      data[idx + 2] = clamp(b);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  if (p.seamless) {
    return makeSeamless(canvas);
  }
  return canvas;
}

function baseColorFor(p: TextureParams) {
  switch (p.category) {
    case 'wood':        return { r: 165, g: 115, b: 75 };
    case 'metal':       return { r: 175, g: 175, b: 180 };
    case 'concrete':    return { r: 150, g: 150, b: 145 };
    case 'fabric':      return { r: 180, g: 165, b: 140 };
    case 'plastic':     return { r: 180, g: 180, b: 185 };
    case 'glass':       return { r: 200, g: 215, b: 220 };
    case 'ground':      return { r: 110, g: 95, b: 75 };
    case 'agriculture': return { r: 200, g: 170, b: 90 };
    case 'industrial':  return { r: 130, g: 130, b: 135 };
    case 'decals':      return { r: 230, g: 230, b: 230 };
  }
}

// Seamless tiling via offset-and-blend
export function makeSeamless(src: HTMLCanvasElement): HTMLCanvasElement {
  const size = src.width;
  const out = document.createElement('canvas');
  out.width = size; out.height = size;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(src, 0, 0);

  // Offset copy
  const offset = Math.floor(size / 2);
  const tmp = document.createElement('canvas');
  tmp.width = size; tmp.height = size;
  const tctx = tmp.getContext('2d')!;
  // Wrap
  tctx.drawImage(src, offset, offset);
  tctx.drawImage(src, offset - size, offset);
  tctx.drawImage(src, offset, offset - size);
  tctx.drawImage(src, offset - size, offset - size);

  // Soft blend the seams (cross gradient mask)
  const blendW = Math.floor(size * 0.15);
  ctx.save();
  // Vertical seam
  const gradV = ctx.createLinearGradient(offset - blendW, 0, offset + blendW, 0);
  gradV.addColorStop(0, 'rgba(0,0,0,0)');
  gradV.addColorStop(0.5, 'rgba(0,0,0,1)');
  gradV.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradV;
  ctx.globalCompositeOperation = 'source-over';
  // Use tmp masked over base
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = size; maskCanvas.height = size;
  const mctx = maskCanvas.getContext('2d')!;
  mctx.drawImage(tmp, 0, 0);
  mctx.globalCompositeOperation = 'destination-in';
  mctx.fillStyle = gradV;
  mctx.fillRect(offset - blendW, 0, blendW * 2, size);
  // Horizontal seam
  const gradH = ctx.createLinearGradient(0, offset - blendW, 0, offset + blendW);
  gradH.addColorStop(0, 'rgba(0,0,0,0)');
  gradH.addColorStop(0.5, 'rgba(0,0,0,1)');
  gradH.addColorStop(1, 'rgba(0,0,0,0)');
  mctx.fillStyle = gradH;
  mctx.fillRect(0, offset - blendW, size, blendW * 2);
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.restore();

  return out;
}
