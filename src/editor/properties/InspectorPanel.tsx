import React from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  Mountain,
  Sun,
  Trash2,
  Unlock,
} from 'lucide-react';
import type {
  EnvironmentConfig,
  GameObject,
  MaterialPreset,
  TerrainData,
  WorldProject,
} from '../../types/world';
import type { TerrainTool } from '../terrain/terrainMath';

interface InspectorPanelProps {
  project: WorldProject;
  selectedObject: GameObject | null;
  inspectorTab: 'object' | 'terrain' | 'environment';
  onChangeTab: (tab: 'object' | 'terrain' | 'environment') => void;
  terrainTool: TerrainTool;
  terrainRadius: number;
  terrainStrength: number;
  terrainPaintColor: string;
  onChangeTerrainTool: (tool: TerrainTool) => void;
  onChangeTerrainRadius: (r: number) => void;
  onChangeTerrainStrength: (s: number) => void;
  onChangeTerrainPaintColor: (c: string) => void;
  onUpdateTerrain: (t: TerrainData) => void;
  onUpdateObject: (id: string, patch: Partial<GameObject>) => void;
  onDuplicateObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onUpdateEnvironment: (env: EnvironmentConfig) => void;
}

const MATERIAL_PRESETS: Array<{ id: MaterialPreset; label: string; rough: number; metal: number }> = [
  { id: 'matte', label: 'Matte', rough: 0.85, metal: 0.05 },
  { id: 'stone', label: 'Stone', rough: 0.9, metal: 0.06 },
  { id: 'wood', label: 'Wood', rough: 0.82, metal: 0.04 },
  { id: 'metal', label: 'Metal', rough: 0.3, metal: 0.85 },
  { id: 'plastic', label: 'Plastic', rough: 0.42, metal: 0.08 },
  { id: 'glass', label: 'Glass', rough: 0.14, metal: 0.12 },
  { id: 'emissive', label: 'Glow', rough: 0.25, metal: 0.2 },
];

const PAINT_SWATCHES = [
  { name: 'Grass', color: '#4d7c4f' },
  { name: 'Sand', color: '#c48b56' },
  { name: 'Slate', color: '#6b757d' },
  { name: 'Snow', color: '#dbe4ed' },
  { name: 'Dirt', color: '#7d5f42' },
  { name: 'Obsidian', color: '#2b3240' },
];

const TERRAIN_TOOLS: Array<{ id: TerrainTool; label: string }> = [
  { id: 'raise', label: 'Raise' },
  { id: 'lower', label: 'Lower' },
  { id: 'flatten', label: 'Flatten' },
  { id: 'smooth', label: 'Smooth' },
  { id: 'paint', label: 'Paint' },
  { id: 'stamp_hill', label: 'Hill' },
  { id: 'stamp_mountain', label: 'Mountain' },
  { id: 'stamp_lake', label: 'Lake' },
  { id: 'stamp_flat', label: 'Flat Area' },
];

const TIME_PRESETS: Record<
  EnvironmentConfig['timeOfDay'],
  Partial<EnvironmentConfig>
> = {
  dawn: {
    timeOfDay: 'dawn',
    skyColor: '#1e2f4d',
    horizonColor: '#7b8ca8',
    sunElevation: 20,
    sunIntensity: 1.15,
    ambientIntensity: 0.65,
  },
  day: {
    timeOfDay: 'day',
    skyColor: '#1d4e89',
    horizonColor: '#88b6d9',
    sunElevation: 54,
    sunIntensity: 1.5,
    ambientIntensity: 0.72,
  },
  sunset: {
    timeOfDay: 'sunset',
    skyColor: '#2d1e38',
    horizonColor: '#d97b59',
    sunElevation: 16,
    sunIntensity: 1.55,
    ambientIntensity: 0.55,
  },
  night: {
    timeOfDay: 'night',
    skyColor: '#090d1a',
    horizonColor: '#18243d',
    sunElevation: 32,
    sunIntensity: 0.55,
    ambientIntensity: 0.42,
  },
};

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  project,
  selectedObject,
  inspectorTab,
  onChangeTab,
  terrainTool,
  terrainRadius,
  terrainStrength,
  terrainPaintColor,
  onChangeTerrainTool,
  onChangeTerrainRadius,
  onChangeTerrainStrength,
  onChangeTerrainPaintColor,
  onUpdateTerrain,
  onUpdateObject,
  onDuplicateObject,
  onDeleteObject,
  onUpdateEnvironment,
}) => {
  return (
    <aside className="w-76 border-l border-white/10 bg-[#111620] flex flex-col shrink-0 overflow-hidden">
      {/* Inspector Section Tabs */}
      <div className="p-2 border-b border-white/10 grid grid-cols-3 gap-1 bg-[#0E131C]">
        <button
          type="button"
          onClick={() => onChangeTab('object')}
          className={`py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            inspectorTab === 'object'
              ? 'bg-[#1E2636] text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Object
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('terrain')}
          className={`py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            inspectorTab === 'terrain'
              ? 'bg-[#1E2636] text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Terrain
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('environment')}
          className={`py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            inspectorTab === 'environment'
              ? 'bg-[#1E2636] text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Atmosphere
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {inspectorTab === 'object' && (
          <>
            {selectedObject ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 block">Object Name</label>
                  <input
                    type="text"
                    value={selectedObject.name}
                    onChange={(e) => onUpdateObject(selectedObject.id, { name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md bg-[#0B0E14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[11px] text-slate-500">
                    {selectedObject.category} · {selectedObject.assetType}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObject(selectedObject.id, { locked: !selectedObject.locked })
                    }
                    className="py-1.5 rounded-md bg-[#161C28] hover:bg-[#1E2636] text-slate-200 flex items-center justify-center gap-1 text-[11px]"
                    title="Lock transform"
                    aria-label={selectedObject.locked ? 'Unlock object' : 'Lock object'}
                  >
                    {selectedObject.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObject(selectedObject.id, { visible: !selectedObject.visible })
                    }
                    className="py-1.5 rounded-md bg-[#161C28] hover:bg-[#1E2636] text-slate-200 flex items-center justify-center text-[11px]"
                    title="Toggle visibility"
                    aria-label="Toggle visibility"
                  >
                    {selectedObject.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateObject(selectedObject.id)}
                    className="py-1.5 rounded-md bg-[#161C28] hover:bg-[#1E2636] text-slate-200 flex items-center justify-center text-[11px]"
                    title="Duplicate object"
                    aria-label="Duplicate object"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteObject(selectedObject.id)}
                    className="py-1.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 flex items-center justify-center text-[11px]"
                    title="Delete object"
                    aria-label="Delete object"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Transform Controls */}
                {(['position', 'rotation', 'scale'] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-300 capitalize">
                      {field} {field === 'rotation' ? '(deg)' : ''}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['x', 'y', 'z'] as const).map((axis) => {
                        const rawVal = selectedObject.transform[field][axis];
                        const displayVal =
                          field === 'rotation'
                            ? Math.round((rawVal * 180) / Math.PI)
                            : Number(rawVal.toFixed(2));
                        return (
                          <div key={axis} className="flex items-center bg-[#0B0E14] rounded-md border border-white/10 px-1.5">
                            <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">
                              {axis}
                            </span>
                            <input
                              type="number"
                              step={field === 'rotation' ? 15 : 0.25}
                              disabled={selectedObject.locked}
                              value={displayVal}
                              onChange={(e) => {
                                const parsed = Number(e.target.value);
                                if (Number.isNaN(parsed)) return;
                                const stored =
                                  field === 'rotation'
                                    ? (parsed * Math.PI) / 180
                                    : field === 'scale'
                                    ? Math.max(0.15, parsed)
                                    : parsed;
                                onUpdateObject(selectedObject.id, {
                                  transform: {
                                    ...selectedObject.transform,
                                    [field]: {
                                      ...selectedObject.transform[field],
                                      [axis]: stored,
                                    },
                                  },
                                });
                              }}
                              className="w-full py-1 bg-transparent text-xs font-mono tabular-nums text-white focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Material & PBR Controls */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="text-xs font-semibold text-white">Material Lab</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">Base Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedObject.material.color}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, {
                            material: {
                              ...selectedObject.material,
                              color: e.target.value,
                              emissive:
                                selectedObject.material.preset === 'emissive'
                                  ? e.target.value
                                  : selectedObject.material.emissive,
                            },
                          })
                        }
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-slate-300">
                        {selectedObject.material.color}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {MATERIAL_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          onUpdateObject(selectedObject.id, {
                            material: {
                              ...selectedObject.material,
                              preset: preset.id,
                              roughness: preset.rough,
                              metalness: preset.metal,
                              opacity: preset.id === 'glass' ? 0.45 : 1,
                              emissive:
                                preset.id === 'emissive'
                                  ? selectedObject.material.color
                                  : '#000000',
                              emissiveIntensity: preset.id === 'emissive' ? 0.65 : 0,
                            },
                          })
                        }
                        className={`py-1 rounded text-[11px] font-medium transition-colors ${
                          selectedObject.material.preset === preset.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-[#161C28] text-slate-300 hover:bg-[#1E2636]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Roughness</span>
                      <span className="font-mono tabular-nums">
                        {selectedObject.material.roughness.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={selectedObject.material.roughness}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          material: {
                            ...selectedObject.material,
                            roughness: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Metalness</span>
                      <span className="font-mono tabular-nums">
                        {selectedObject.material.metalness.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selectedObject.material.metalness}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          material: {
                            ...selectedObject.material,
                            metalness: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Physics Controls */}
                <div className="pt-3 border-t border-white/10 space-y-2.5">
                  <div className="text-xs font-semibold text-white">Physics &amp; Collision</div>
                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Solid Collision</span>
                    <input
                      type="checkbox"
                      checked={selectedObject.physics.collidable}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          physics: { ...selectedObject.physics, collidable: e.target.checked },
                        })
                      }
                      className="accent-amber-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Trigger Volume</span>
                    <input
                      type="checkbox"
                      checked={selectedObject.physics.isTrigger}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          physics: { ...selectedObject.physics, isTrigger: e.target.checked },
                        })
                      }
                      className="accent-amber-500"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 space-y-2 py-6 text-center">
                <p className="text-slate-200 font-medium">No Object Selected</p>
                <p>
                  Click any 3D object in the viewport or Scene Hierarchy to edit its transform, PBR material, and collision settings.
                </p>
              </div>
            )}
          </>
        )}

        {inspectorTab === 'terrain' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Mountain className="w-4 h-4 text-amber-400" />
              Terrain Sculpt &amp; Paint
            </div>
            <p className="text-[11px] text-slate-400">
              Click and drag directly on the 3D ground to sculpt hills, valleys, lakes, or paint biomes.
            </p>

            <div className="grid grid-cols-3 gap-1.5">
              {TERRAIN_TOOLS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeTerrainTool(t.id)}
                  className={`py-2 px-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                    terrainTool === t.id
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'bg-[#161C28] text-slate-300 hover:bg-[#1E2636]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Brush Radius</span>
                <span className="font-mono tabular-nums">{terrainRadius}m</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={terrainRadius}
                onChange={(e) => onChangeTerrainRadius(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Brush Strength</span>
                <span className="font-mono tabular-nums">{terrainStrength.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={4.0}
                step={0.2}
                value={terrainStrength}
                onChange={(e) => onChangeTerrainStrength(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-300">Paint Surface Color</div>
              <div className="grid grid-cols-3 gap-1.5">
                {PAINT_SWATCHES.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      onChangeTerrainPaintColor(s.color);
                      onChangeTerrainTool('paint');
                    }}
                    className={`flex items-center gap-1.5 p-1.5 rounded-md border text-[11px] ${
                      terrainPaintColor === s.color && terrainTool === 'paint'
                        ? 'border-amber-400 bg-[#1E2636] text-white'
                        : 'border-white/10 bg-[#161C28] text-slate-300'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-sm shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="text-xs font-semibold text-white">Water System</div>
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Enable Water Plane</span>
                <input
                  type="checkbox"
                  checked={project.terrain.waterEnabled}
                  onChange={(e) =>
                    onUpdateTerrain({ ...project.terrain, waterEnabled: e.target.checked })
                  }
                  className="accent-amber-500"
                />
              </label>
              {project.terrain.waterEnabled && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Water Level</span>
                    <span className="font-mono tabular-nums">
                      {project.terrain.waterLevel.toFixed(1)}m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-4.5}
                    max={4.0}
                    step={0.2}
                    value={project.terrain.waterLevel}
                    onChange={(e) =>
                      onUpdateTerrain({
                        ...project.terrain,
                        waterLevel: Number(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {inspectorTab === 'environment' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Sun className="w-4 h-4 text-amber-400" />
              Lighting &amp; Atmosphere
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-slate-400">Time of Day Preset</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['dawn', 'day', 'sunset', 'night'] as const).map((tod) => (
                  <button
                    key={tod}
                    type="button"
                    onClick={() =>
                      onUpdateEnvironment({ ...project.environment, ...TIME_PRESETS[tod] })
                    }
                    className={`py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                      project.environment.timeOfDay === tod
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-[#161C28] text-slate-300 hover:bg-[#1E2636]'
                    }`}
                  >
                    {tod}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-slate-400">Weather</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['clear', 'rain', 'snow'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onUpdateEnvironment({ ...project.environment, weather: w })}
                    className={`py-1.5 rounded-md text-xs font-medium capitalize ${
                      project.environment.weather === w
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-[#161C28] text-slate-300 hover:bg-[#1E2636]'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Sky &amp; Horizon Color</span>
              <input
                type="color"
                value={project.environment.horizonColor}
                onChange={(e) =>
                  onUpdateEnvironment({
                    ...project.environment,
                    horizonColor: e.target.value,
                    skyColor: e.target.value,
                  })
                }
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
              />
            </div>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Atmospheric Fog</span>
              <input
                type="checkbox"
                checked={project.environment.fogEnabled}
                onChange={(e) =>
                  onUpdateEnvironment({ ...project.environment, fogEnabled: e.target.checked })
                }
                className="accent-amber-500"
              />
            </label>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Fog Density</span>
                <span className="font-mono tabular-nums">
                  {project.environment.fogDensity.toFixed(3)}
                </span>
              </div>
              <input
                type="range"
                min={0.002}
                max={0.025}
                step={0.001}
                value={project.environment.fogDensity}
                onChange={(e) =>
                  onUpdateEnvironment({
                    ...project.environment,
                    fogDensity: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Sun Intensity</span>
                <span className="font-mono tabular-nums">
                  {project.environment.sunIntensity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={2.4}
                step={0.1}
                value={project.environment.sunIntensity}
                onChange={(e) =>
                  onUpdateEnvironment({
                    ...project.environment,
                    sunIntensity: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Ambient Fill</span>
                <span className="font-mono tabular-nums">
                  {project.environment.ambientIntensity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.4}
                step={0.05}
                value={project.environment.ambientIntensity}
                onChange={(e) =>
                  onUpdateEnvironment({
                    ...project.environment,
                    ambientIntensity: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>World Boundary</span>
                <span className="font-mono tabular-nums">
                  ±{project.environment.worldBoundary}m
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={60}
                step={2}
                value={project.environment.worldBoundary}
                onChange={(e) =>
                  onUpdateEnvironment({
                    ...project.environment,
                    worldBoundary: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
