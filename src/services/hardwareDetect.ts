import type { GraphicsSettings, QualityPreset } from '../types/world';

export interface HardwareProfile {
  isSoftwareGl: boolean;
  gpuRenderer: string;
  logicalCores: number;
  deviceMemoryGb: number | null;
  recommendedPreset: QualityPreset;
  rendererBackend: 'WebGL2 Browser Engine' | 'Software WebGL Fallback';
  nativeArchitectureReady: boolean;
}

let cachedSoftwareGl: boolean | null = null;
let cachedRendererName: string | null = null;

export function detectSoftwareWebGL(): { isSoftwareGl: boolean; gpuRenderer: string } {
  if (cachedSoftwareGl !== null && cachedRendererName !== null) {
    return { isSoftwareGl: cachedSoftwareGl, gpuRenderer: cachedRendererName };
  }
  if (typeof document === 'undefined') {
    return { isSoftwareGl: false, gpuRenderer: 'Headless Node' };
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      cachedRendererName = 'Unavailable';
      return { isSoftwareGl: true, gpuRenderer: 'Unavailable' };
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || 'WebGL Renderer');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSw = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    cachedSoftwareGl = isSw;
    cachedRendererName = gpu;
    return { isSoftwareGl: isSw, gpuRenderer: gpu };
  } catch {
    cachedSoftwareGl = true;
    cachedRendererName = 'Fallback Software';
    return { isSoftwareGl: true, gpuRenderer: 'Fallback Software' };
  }
}

export function detectHardwareProfile(): HardwareProfile {
  const { isSoftwareGl, gpuRenderer } = detectSoftwareWebGL();
  const logicalCores =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4;
  const deviceMemoryGb =
    typeof navigator !== 'undefined' && 'deviceMemory' in navigator
      ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4)
      : null;

  let recommendedPreset: QualityPreset = 'MEDIUM';
  if (isSoftwareGl || logicalCores <= 4 || (deviceMemoryGb !== null && deviceMemoryGb <= 4)) {
    recommendedPreset = 'LOW';
  } else if (logicalCores >= 8 && (deviceMemoryGb === null || deviceMemoryGb >= 8)) {
    recommendedPreset = 'HIGH';
  }

  return {
    isSoftwareGl,
    gpuRenderer,
    logicalCores,
    deviceMemoryGb,
    recommendedPreset,
    rendererBackend: isSoftwareGl ? 'Software WebGL Fallback' : 'WebGL2 Browser Engine',
    nativeArchitectureReady: true,
  };
}

export function getGraphicsPresetConfig(preset: QualityPreset): GraphicsSettings {
  switch (preset) {
    case 'LOW':
      return {
        preset: 'LOW',
        resolutionScale: 0.85,
        shadowsEnabled: false,
        fogEnabled: true,
        antialiasing: false,
        maxObjects: 250,
        lodDistance: 55,
      };
    case 'MEDIUM':
      return {
        preset: 'MEDIUM',
        resolutionScale: 1.0,
        shadowsEnabled: true,
        fogEnabled: true,
        antialiasing: true,
        maxObjects: 450,
        lodDistance: 90,
      };
    case 'HIGH':
      return {
        preset: 'HIGH',
        resolutionScale: 1.25,
        shadowsEnabled: true,
        fogEnabled: true,
        antialiasing: true,
        maxObjects: 750,
        lodDistance: 140,
      };
    case 'ULTRA':
      return {
        preset: 'ULTRA',
        resolutionScale: 1.5,
        shadowsEnabled: true,
        fogEnabled: true,
        antialiasing: true,
        maxObjects: 1200,
        lodDistance: 200,
      };
    case 'CUSTOM':
    default:
      return {
        preset: 'CUSTOM',
        resolutionScale: 1.0,
        shadowsEnabled: true,
        fogEnabled: true,
        antialiasing: true,
        maxObjects: 500,
        lodDistance: 100,
      };
  }
}

/**
 * Renderer abstraction interface prepared for future native GPU clients
 * (Vulkan/DX12/Metal) while keeping the browser WebGL2 renderer independent.
 */
export interface IWorldRendererAdapter {
  readonly backendName: string;
  readonly supportsNativeRaytracing: boolean;
  setQuality(settings: GraphicsSettings): void;
  captureSnapshotDataUrl(): string | null;
  dispose(): void;
}
