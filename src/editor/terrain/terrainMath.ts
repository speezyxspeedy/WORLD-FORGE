import type { TerrainData } from '../../types/world';

export type TerrainTool =
  | 'raise'
  | 'lower'
  | 'flatten'
  | 'smooth'
  | 'paint'
  | 'stamp_hill'
  | 'stamp_mountain'
  | 'stamp_lake'
  | 'stamp_flat';

export const TERRAIN_PRESET_COLORS: Record<TerrainData['groundPreset'], string> = {
  meadow: '#4d7c4f',
  desert: '#c48b56',
  alpine: '#5e736b',
  obsidian: '#2b3240',
  sky: '#4a6b82',
};

export function createTerrain(
  width = 80,
  depth = 80,
  segmentsX = 32,
  segmentsZ = 32,
  groundPreset: TerrainData['groundPreset'] = 'meadow',
  waterEnabled = false,
  waterLevel = -1.2
): TerrainData {
  const count = (segmentsX + 1) * (segmentsZ + 1);
  const baseColor = TERRAIN_PRESET_COLORS[groundPreset] || '#4d7c4f';
  return {
    width,
    depth,
    segmentsX,
    segmentsZ,
    heights: new Array<number>(count).fill(0),
    colors: new Array<string>(count).fill(baseColor),
    waterEnabled,
    waterLevel,
    groundPreset,
  };
}

export function vertexIndex(terrain: TerrainData, gx: number, gz: number): number {
  return gz * (terrain.segmentsX + 1) + gx;
}

export function gridToWorld(terrain: TerrainData, gx: number, gz: number): { x: number; z: number } {
  const u = gx / terrain.segmentsX - 0.5;
  const v = gz / terrain.segmentsZ - 0.5;
  return {
    x: u * terrain.width,
    z: v * terrain.depth,
  };
}

/**
 * Bilinear height interpolation at any world (x, z) position.
 * Used to keep props, buildings, trees, and the player grounded flush on the terrain.
 */
export function groundHeightAt(terrain: TerrainData, worldX: number, worldZ: number): number {
  const halfW = terrain.width / 2;
  const halfD = terrain.depth / 2;
  const u = Math.max(0, Math.min(1, (worldX + halfW) / terrain.width));
  const v = Math.max(0, Math.min(1, (worldZ + halfD) / terrain.depth));

  const fx = u * terrain.segmentsX;
  const fz = v * terrain.segmentsZ;

  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const x1 = Math.min(terrain.segmentsX, x0 + 1);
  const z1 = Math.min(terrain.segmentsZ, z0 + 1);

  const tx = fx - x0;
  const tz = fz - z0;

  const h00 = terrain.heights[vertexIndex(terrain, x0, z0)] ?? 0;
  const h10 = terrain.heights[vertexIndex(terrain, x1, z0)] ?? 0;
  const h01 = terrain.heights[vertexIndex(terrain, x0, z1)] ?? 0;
  const h11 = terrain.heights[vertexIndex(terrain, x1, z1)] ?? 0;

  const h0 = h00 * (1 - tx) + h10 * tx;
  const h1 = h01 * (1 - tx) + h11 * tx;
  return h0 * (1 - tz) + h1 * tz;
}

export interface BrushOptions {
  tool: TerrainTool;
  worldX: number;
  worldZ: number;
  radius: number;
  strength: number;
  paintColor?: string;
}

/**
 * Applies a sculpting or painting brush stroke immutably, returning an updated TerrainData.
 */
export function applyTerrainBrush(terrain: TerrainData, opts: BrushOptions): TerrainData {
  const { tool, worldX, worldZ, radius, strength, paintColor = '#8c7a5b' } = opts;
  const nextHeights = terrain.heights.slice();
  const nextColors = terrain.colors.slice();
  const cols = terrain.segmentsX + 1;
  const rows = terrain.segmentsZ + 1;

  const centerHeight = groundHeightAt(terrain, worldX, worldZ);
  let effectiveRadius = Math.max(1.5, radius);
  let effectiveStrength = Math.max(0.05, strength);

  if (tool === 'stamp_hill') {
    effectiveRadius = Math.max(radius, 10);
    effectiveStrength = Math.max(strength, 2.8);
  } else if (tool === 'stamp_mountain') {
    effectiveRadius = Math.max(radius, 14);
    effectiveStrength = Math.max(strength, 6.2);
  } else if (tool === 'stamp_lake') {
    effectiveRadius = Math.max(radius, 11);
    effectiveStrength = Math.max(strength, 2.6);
  } else if (tool === 'stamp_flat') {
    effectiveRadius = Math.max(radius, 12);
  }

  for (let gz = 0; gz < rows; gz++) {
    for (let gx = 0; gx < cols; gx++) {
      const { x, z } = gridToWorld(terrain, gx, gz);
      const dx = x - worldX;
      const dz = z - worldZ;
      const dist = Math.hypot(dx, dz);
      if (dist > effectiveRadius) continue;

      const t = 1 - dist / effectiveRadius;
      // Smooth cosine falloff
      const falloff = 0.5 * (1 - Math.cos(Math.PI * t));
      const idx = gz * cols + gx;
      const current = terrain.heights[idx] ?? 0;

      switch (tool) {
        case 'raise':
        case 'stamp_hill':
          nextHeights[idx] = Math.min(18, current + falloff * effectiveStrength);
          break;
        case 'stamp_mountain': {
          const ridge = Math.pow(t, 1.35);
          nextHeights[idx] = Math.min(24, current + ridge * effectiveStrength);
          if (nextHeights[idx] > 4.5) nextColors[idx] = '#7b848c';
          if (nextHeights[idx] > 8.5) nextColors[idx] = '#d9e3ec';
          break;
        }
        case 'lower':
          nextHeights[idx] = Math.max(-8, current - falloff * effectiveStrength);
          break;
        case 'stamp_lake':
          nextHeights[idx] = Math.max(-5.5, current - falloff * effectiveStrength);
          if (nextHeights[idx] < terrain.waterLevel + 0.4) {
            nextColors[idx] = '#9e8d6c';
          }
          break;
        case 'flatten':
          nextHeights[idx] = current + (centerHeight - current) * Math.min(1, falloff * 0.75);
          break;
        case 'stamp_flat':
          nextHeights[idx] = current + (0 - current) * Math.min(1, falloff * 0.9);
          break;
        case 'smooth': {
          let sum = 0;
          let n = 0;
          for (let oz = -1; oz <= 1; oz++) {
            for (let ox = -1; ox <= 1; ox++) {
              const nx = gx + ox;
              const nz = gz + oz;
              if (nx >= 0 && nx < cols && nz >= 0 && nz < rows) {
                sum += terrain.heights[nz * cols + nx] ?? 0;
                n++;
              }
            }
          }
          const avg = n > 0 ? sum / n : current;
          nextHeights[idx] = current + (avg - current) * falloff * 0.65;
          break;
        }
        case 'paint':
          if (falloff > 0.25) {
            nextColors[idx] = paintColor;
          }
          break;
      }
    }
  }

  return {
    ...terrain,
    heights: nextHeights,
    colors: nextColors,
    waterEnabled: tool === 'stamp_lake' ? true : terrain.waterEnabled,
  };
}

/**
 * Generates natural perimeter ridges so outdoor worlds never float in an empty void.
 */
export function sculptPerimeterHills(terrain: TerrainData, edgeMargin = 8, height = 5): TerrainData {
  const nextHeights = terrain.heights.slice();
  const nextColors = terrain.colors.slice();
  const cols = terrain.segmentsX + 1;
  const rows = terrain.segmentsZ + 1;
  const halfW = terrain.width / 2;
  const halfD = terrain.depth / 2;

  for (let gz = 0; gz < rows; gz++) {
    for (let gx = 0; gx < cols; gx++) {
      const { x, z } = gridToWorld(terrain, gx, gz);
      const distEdgeX = halfW - Math.abs(x);
      const distEdgeZ = halfD - Math.abs(z);
      const minEdge = Math.min(distEdgeX, distEdgeZ);
      if (minEdge < edgeMargin) {
        const factor = 1 - minEdge / edgeMargin;
        const undulation = 0.7 + 0.3 * Math.sin(x * 0.18) * Math.cos(z * 0.18);
        const h = factor * factor * height * undulation;
        const idx = gz * cols + gx;
        nextHeights[idx] = Math.max(nextHeights[idx], h);
        if (h > 2.2) {
          nextColors[idx] = '#6b757d';
        }
      }
    }
  }

  return {
    ...terrain,
    heights: nextHeights,
    colors: nextColors,
  };
}
