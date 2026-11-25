import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Grid3X3,
  Layers,
  Maximize2,
  MousePointer2,
  Mountain,
  Move,
  Play,
  Plus,
  Redo2,
  Rocket,
  RotateCw,
  Save,
  Search,
  Undo2,
} from 'lucide-react';
import type {
  AssetCategory,
  AssetType,
  GameCategory,
  GameObject,
  GraphicsSettings,
  StudioTier,
  TemplateType,
  Transform,
  WorldProject,
} from '../types/world';
import {
  ASSET_CATALOG,
  ASSET_CATEGORIES,
  createGameObjectFromCatalog,
} from './assets/assetCatalog';
import {
  WorldViewport,
  type EditorInteractionMode,
  type PlaytestHudSnapshot,
  type TransformGizmoMode,
} from './viewport/WorldViewport';
import { InspectorPanel } from './properties/InspectorPanel';
import { VisualLogicStudio } from './logic/VisualLogicStudio';
import {
  GameplayAndStudiosPanel,
  type StudioWorkspaceTab,
} from './properties/GameplayAndStudiosPanel';
import { PlaytestHud } from '../gameplay/PlaytestHud';
import { groundHeightAt, type TerrainTool } from './terrain/terrainMath';
import { createProjectFromTemplate } from '../world-format/templates';
import { audioSynth } from '../services/audioSynth';

interface WorldStudioProps {
  project: WorldProject;
  graphics: GraphicsSettings;
  studioTier: StudioTier;
  onChangeStudioTier: (tier: StudioTier) => void;
  onSaveProject: (project: WorldProject) => void;
  onPublishProject: (
    project: WorldProject,
    opts: {
      title: string;
      description: string;
      category: GameCategory;
      thumbnail: string;
      visibility: 'public' | 'unlisted';
    }
  ) => void;
  onTrackBuildTime: (activeDeltaSec: number, idleDeltaSec: number) => void;
  onUnlockAchievement: (id: string) => void;
  onBackToProjects: () => void;
}

const STUDIO_TABS: Array<{ id: StudioWorkspaceTab; label: string }> = [
  { id: 'world', label: 'World Builder' },
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'logic', label: 'Visual Logic' },
  { id: 'character_ui', label: 'Character & UI' },
  { id: 'cinematic_audio', label: 'Cinematic & Audio' },
  { id: 'multiplayer_publish', label: 'Multiplayer & Publish' },
];

export const WorldStudio: React.FC<WorldStudioProps> = ({
  project: initialProject,
  graphics,
  studioTier,
  onChangeStudioTier,
  onSaveProject,
  onPublishProject,
  onTrackBuildTime,
  onUnlockAchievement,
  onBackToProjects,
}) => {
  const [project, setProject] = useState<WorldProject>(initialProject);
  const [historyPast, setHistoryPast] = useState<WorldProject[]>([]);
  const [historyFuture, setHistoryFuture] = useState<WorldProject[]>([]);
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  const [studioTab, setStudioTab] = useState<StudioWorkspaceTab>('world');
  const [isPlaytesting, setIsPlaytesting] = useState(false);
  const [cinematicPreview, setCinematicPreview] = useState(false);

  const [leftTab, setLeftTab] = useState<'assets' | 'hierarchy'>('assets');
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('Buildings');
  const [assetSearch, setAssetSearch] = useState('');
  const [placeAssetType, setPlaceAssetType] = useState<AssetType>('house');

  const [editorTool, setEditorTool] = useState<EditorInteractionMode>('select');
  const [transformMode, setTransformMode] = useState<TransformGizmoMode>('translate');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(
    initialProject.objects[0]?.id || null
  );
  const [inspectorTab, setInspectorTab] = useState<'object' | 'terrain' | 'environment'>('object');
  const [showGrid, setShowGrid] = useState(true);

  const [terrainTool, setTerrainTool] = useState<TerrainTool>('raise');
  const [terrainRadius, setTerrainRadius] = useState(7);
  const [terrainStrength, setTerrainStrength] = useState(1.2);
  const [terrainPaintColor, setTerrainPaintColor] = useState('#8c7a5b');

  const [playHud, setPlayHud] = useState<PlaytestHudSnapshot>({
    health: initialProject.gameplay.playerHealth,
    maxHealth: initialProject.gameplay.playerHealth,
    score: 0,
    timeRemaining: initialProject.gameplay.matchDuration,
    inventory: [...initialProject.gameplay.startingInventory],
    notifications: [],
    cameraView: 'third',
    paused: false,
    outcome: null,
    nearbyInteractPrompt: null,
    playerPos: { x: 0, y: 0, z: 0 },
  });

  const lastActivityRef = useRef<number>(Date.now());
  const projectRef = useRef(project);
  projectRef.current = project;

  // Sync if user opens a different project ID
  useEffect(() => {
    if (initialProject.id !== projectRef.current.id) {
      setProject(initialProject);
      setHistoryPast([]);
      setHistoryFuture([]);
      setSelectedObjectId(initialProject.objects[0]?.id || null);
      setSaveState('saved');
    }
  }, [initialProject]);

  // Track active creation time vs idle time (10s ticks)
  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('pointerdown', markActive);
    window.addEventListener('keydown', markActive);
    const interval = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs < 20000) {
        onTrackBuildTime(10, 0);
      } else {
        onTrackBuildTime(0, 10);
      }
    }, 10000);
    return () => {
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('keydown', markActive);
      window.clearInterval(interval);
    };
  }, [onTrackBuildTime]);

  const commitChange = useCallback(
    (updater: (prev: WorldProject) => WorldProject, pushHistory = true) => {
      lastActivityRef.current = Date.now();
      setProject((prev) => {
        const next = {
          ...updater(prev),
          updatedAt: new Date().toISOString(),
        };
        if (pushHistory) {
          setHistoryPast((h) => [...h.slice(-29), prev]);
          setHistoryFuture([]);
        }
        return next;
      });
      setSaveState('unsaved');
    },
    []
  );

  // Debounced autosave to IndexedDB
  useEffect(() => {
    if (saveState !== 'unsaved') return;
    const timer = window.setTimeout(() => {
      setSaveState('saving');
      onSaveProject(projectRef.current);
      setSaveState('saved');
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [saveState, project, onSaveProject]);

  const handleManualSave = useCallback(() => {
    setSaveState('saving');
    onSaveProject(projectRef.current);
    setSaveState('saved');
    audioSynth.playClick();
  }, [onSaveProject]);

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((h) => h.slice(0, -1));
    setHistoryFuture((f) => [projectRef.current, ...f.slice(0, 29)]);
    setProject(previous);
    setSaveState('unsaved');
  }, [historyPast]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((f) => f.slice(1));
    setHistoryPast((h) => [...h.slice(-29), projectRef.current]);
    setProject(next);
    setSaveState('unsaved');
  }, [historyFuture]);

  // Editor keyboard shortcuts (W/E/R gizmo, Ctrl+Z/Y, Delete)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isPlaytesting || studioTab !== 'world') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          commitChange((p) => ({
            ...p,
            objects: p.objects.filter((o) => o.id !== selectedObjectId),
          }));
          setSelectedObjectId(null);
        }
        return;
      }
      if (e.key.toLowerCase() === 'w') {
        setEditorTool('select');
        setTransformMode('translate');
      } else if (e.key.toLowerCase() === 'e') {
        setEditorTool('select');
        setTransformMode('rotate');
      } else if (e.key.toLowerCase() === 'r') {
        setEditorTool('select');
        setTransformMode('scale');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaytesting, studioTab, selectedObjectId, handleManualSave, handleUndo, handleRedo, commitChange]);

  const selectedObject = useMemo(
    () => project.objects.find((o) => o.id === selectedObjectId) || null,
    [project.objects, selectedObjectId]
  );

  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    return ASSET_CATALOG.filter((item) => {
      if (q) {
        return (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.tags.some((t) => t.includes(q))
        );
      }
      return item.category === assetCategory;
    });
  }, [assetCategory, assetSearch]);

  const handlePlaceObject = useCallback(
    (assetType: AssetType, x: number, y: number, z: number) => {
      const obj = createGameObjectFromCatalog(assetType, { x, y, z });
      commitChange((p) => ({ ...p, objects: [...p.objects, obj] }));
      setSelectedObjectId(obj.id);
      setInspectorTab('object');
    },
    [commitChange]
  );

  const handleQuickSpawnCenter = (assetType: AssetType) => {
    const offset = (project.objects.length % 7) * 2.2 - 6;
    const y = groundHeightAt(project.terrain, offset, 2);
    handlePlaceObject(assetType, Number(offset.toFixed(1)), Number(y.toFixed(2)), 2);
    setEditorTool('select');
    audioSynth.playPlaceObject();
  };

  const handleTransformObject = useCallback(
    (id: string, transform: Transform) => {
      commitChange((p) => ({
        ...p,
        objects: p.objects.map((o) => (o.id === id ? { ...o, transform } : o)),
      }));
    },
    [commitChange]
  );

  const handleUpdateObject = useCallback(
    (id: string, patch: Partial<GameObject>) => {
      commitChange((p) => ({
        ...p,
        objects: p.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      }));
    },
    [commitChange]
  );

  const handleDuplicateObject = useCallback(
    (id: string) => {
      const src = project.objects.find((o) => o.id === id);
      if (!src) return;
      const copy: GameObject = {
        ...JSON.parse(JSON.stringify(src)),
        id: `obj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        name: `${src.name} Copy`,
        transform: {
          ...src.transform,
          position: {
            x: Number((src.transform.position.x + 2.5).toFixed(2)),
            y: src.transform.position.y,
            z: src.transform.position.z,
          },
        },
      };
      commitChange((p) => ({ ...p, objects: [...p.objects, copy] }));
      setSelectedObjectId(copy.id);
    },
    [project.objects, commitChange]
  );

  const handleDeleteObject = useCallback(
    (id: string) => {
      commitChange((p) => ({
        ...p,
        objects: p.objects.filter((o) => o.id !== id),
      }));
      if (selectedObjectId === id) setSelectedObjectId(null);
    },
    [selectedObjectId, commitChange]
  );

  const handleApplyTemplate = (template: TemplateType) => {
    const fresh = createProjectFromTemplate(template, project.title);
    commitChange((p) => ({
      ...fresh,
      id: p.id,
      createdAt: p.createdAt,
      status: p.status,
      publishedGameId: p.publishedGameId,
      publishedVersion: p.publishedVersion,
    }));
    setSelectedObjectId(fresh.objects[0]?.id || null);
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0B0E14] text-slate-100 overflow-hidden">
      {/* Studio Top Bar (Hidden during Playtest for 100% viewport immersion) */}
      {!isPlaytesting && (
        <header className="h-13 px-3 border-b border-white/10 bg-[#111620] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                onSaveProject(projectRef.current);
                onBackToProjects();
              }}
              className="p-2 rounded-lg hover:bg-[#1E2636] text-slate-300 hover:text-white transition-colors shrink-0"
              aria-label="Back to Projects"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="text-sm font-display font-semibold text-white truncate max-w-[180px]">
                {project.title}
              </div>
              <div className="text-[11px] text-slate-400 whitespace-nowrap">
                {saveState === 'saved'
                  ? 'Saved locally'
                  : saveState === 'saving'
                  ? 'Saving...'
                  : 'Unsaved edits'}
                {' · '}
                <span className="tabular-nums">{project.objects.length} objects</span>
              </div>
            </div>
          </div>

          {/* Unified Zero-Code Studio Tabs */}
          <nav className="hidden xl:flex items-center gap-1 p-1 rounded-lg bg-[#0B0E14] border border-white/5">
            {STUDIO_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStudioTab(tab.id);
                  if (tab.id !== 'cinematic_audio') setCinematicPreview(false);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  studioTab === tab.id
                    ? 'bg-[#1E2636] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Compact Tab Switcher for smaller widths */}
          <select
            aria-label="Studio workspace section"
            value={studioTab}
            onChange={(e) => setStudioTab(e.target.value as StudioWorkspaceTab)}
            className="xl:hidden px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
          >
            {STUDIO_TABS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              aria-label="Studio workspace layout"
              value={studioTier}
              onChange={(e) => onChangeStudioTier(e.target.value as StudioTier)}
              className="hidden lg:block px-2 py-1.5 rounded-md bg-[#0B0E14] border border-white/10 text-[11px] text-slate-300"
            >
              <option value="Creator Studio">Creator Studio</option>
              <option value="Advanced Studio">Advanced Studio</option>
              <option value="Pro Studio">Pro Studio</option>
              <option value="AAA Studio">AAA Studio</option>
            </select>

            <button
              type="button"
              onClick={handleUndo}
              disabled={historyPast.length === 0}
              className="p-2 rounded-lg hover:bg-[#1E2636] disabled:opacity-35 text-slate-300"
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyFuture.length === 0}
              className="p-2 rounded-lg hover:bg-[#1E2636] disabled:opacity-35 text-slate-300"
              aria-label="Redo"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className="px-3 py-1.5 rounded-lg bg-[#1E2636] hover:bg-[#273247] text-xs font-medium text-slate-100 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveProject(projectRef.current);
                setCinematicPreview(false);
                setStudioTab('world');
                setIsPlaytesting(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Playtest
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('multiplayer_publish')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Rocket className="w-3.5 h-3.5" />
              Publish
            </button>
          </div>
        </header>
      )}

      {/* Main Studio Body */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Asset Library & Scene Hierarchy (World Builder Edit mode only) */}
        {!isPlaytesting && studioTab === 'world' && (
          <aside className="w-68 border-r border-white/10 bg-[#111620] flex flex-col shrink-0 overflow-hidden">
            <div className="p-2 border-b border-white/10 grid grid-cols-2 gap-1 bg-[#0E131C]">
              <button
                type="button"
                onClick={() => setLeftTab('assets')}
                className={`py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 ${
                  leftTab === 'assets'
                    ? 'bg-[#1E2636] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                Assets
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('hierarchy')}
                className={`py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 ${
                  leftTab === 'hierarchy'
                    ? 'bg-[#1E2636] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Scene ({project.objects.length})
              </button>
            </div>

            {leftTab === 'assets' ? (
              <>
                <div className="p-3 border-b border-white/10 space-y-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search assets..."
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-md bg-[#0B0E14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {!assetSearch && (
                    <div className="flex flex-wrap gap-1">
                      {ASSET_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setAssetCategory(cat)}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                            assetCategory === cat
                              ? 'bg-amber-500 text-slate-950 font-semibold'
                              : 'bg-[#161C28] text-slate-300 hover:bg-[#1E2636]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredAssets.map((item) => {
                    const isArmed = editorTool === 'place' && placeAssetType === item.assetType;
                    return (
                      <div
                        key={item.assetType}
                        className={`p-2.5 rounded-lg border transition-colors ${
                          isArmed
                            ? 'bg-amber-500/15 border-amber-400/50'
                            : 'bg-[#161C28] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPlaceAssetType(item.assetType);
                              setEditorTool('place');
                            }}
                            className="text-left flex-1 min-w-0"
                          >
                            <div className="text-xs font-semibold text-white truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">
                              {item.description}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickSpawnCenter(item.assetType)}
                            aria-label={`Add ${item.name} to world`}
                            title="Drop into world center"
                            className="p-1.5 rounded-md bg-[#0B0E14] hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-colors shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {project.objects.map((obj) => (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => {
                      setSelectedObjectId(obj.id);
                      setEditorTool('select');
                      setInspectorTab('object');
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-md text-xs flex items-center justify-between gap-2 transition-colors ${
                      selectedObjectId === obj.id
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                        : 'text-slate-300 hover:bg-[#161C28]'
                    }`}
                  >
                    <span className="truncate font-medium">{obj.name}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">{obj.category}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* Center Canvas or Non-3D Visual Studio Panel */}
        <main className="flex-1 relative min-w-0 h-full overflow-hidden">
          {/* Keep 3D Viewport mounted when on World Builder or Playtest or Cinematic Preview */}
          {(studioTab === 'world' || isPlaytesting || cinematicPreview) && (
            <div className="w-full h-full relative">
              <WorldViewport
                project={project}
                mode={isPlaytesting ? 'playtest' : 'edit'}
                graphics={graphics}
                editorTool={editorTool}
                transformMode={transformMode}
                placeAssetType={placeAssetType}
                terrainTool={terrainTool}
                terrainRadius={terrainRadius}
                terrainStrength={terrainStrength}
                terrainPaintColor={terrainPaintColor}
                selectedObjectId={selectedObjectId}
                showGrid={showGrid}
                cinematicPreviewActive={cinematicPreview}
                onSelectObject={(id) => {
                  setSelectedObjectId(id);
                  if (id) setInspectorTab('object');
                }}
                onTransformObject={handleTransformObject}
                onPlaceObject={handlePlaceObject}
                onUpdateTerrain={(terrain) => {
                  commitChange((p) => ({ ...p, terrain }), false);
                  onUnlockAchievement('ach_terrain');
                }}
                onExitPlaytest={() => setIsPlaytesting(false)}
                onHudUpdate={setPlayHud}
              />

              {/* Compact Bottom Editor Dock (Solid dark surface, no backdrop-filter over WebGL) */}
              {!isPlaytesting && !cinematicPreview && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1.5 rounded-xl bg-[#111620]/96 border border-white/12 shadow-xl">
                  <button
                    type="button"
                    onClick={() => setEditorTool('select')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                      editorTool === 'select'
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:bg-[#1E2636]'
                    }`}
                  >
                    <MousePointer2 className="w-3.5 h-3.5" />
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorTool('select');
                      setTransformMode('translate');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                      editorTool === 'select' && transformMode === 'translate'
                        ? 'bg-[#1E2636] text-amber-300'
                        : 'text-slate-300 hover:bg-[#1E2636]'
                    }`}
                    title="Move (W)"
                  >
                    <Move className="w-3.5 h-3.5" />
                    Move
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorTool('select');
                      setTransformMode('rotate');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                      editorTool === 'select' && transformMode === 'rotate'
                        ? 'bg-[#1E2636] text-amber-300'
                        : 'text-slate-300 hover:bg-[#1E2636]'
                    }`}
                    title="Rotate (E)"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Rotate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorTool('select');
                      setTransformMode('scale');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                      editorTool === 'select' && transformMode === 'scale'
                        ? 'bg-[#1E2636] text-amber-300'
                        : 'text-slate-300 hover:bg-[#1E2636]'
                    }`}
                    title="Scale (R)"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Scale
                  </button>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setEditorTool('terrain');
                      setInspectorTab('terrain');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                      editorTool === 'terrain'
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:bg-[#1E2636]'
                    }`}
                  >
                    <Mountain className="w-3.5 h-3.5" />
                    Terrain
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGrid((g) => !g)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                      showGrid ? 'bg-[#1E2636] text-white' : 'text-slate-400 hover:bg-[#1E2636]'
                    }`}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                    Grid
                  </button>
                </div>
              )}

              {/* Contextual mode prompt at top-center of viewport */}
              {!isPlaytesting && !cinematicPreview && editorTool !== 'select' && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3.5 py-1.5 rounded-lg bg-[#111620]/94 border border-amber-500/35 text-xs text-amber-200 whitespace-nowrap">
                  {editorTool === 'place'
                    ? `Click anywhere on the 3D terrain to place: ${
                        ASSET_CATALOG.find((a) => a.assetType === placeAssetType)?.name ||
                        placeAssetType
                      }`
                    : `Terrain Brush Active (${terrainTool.replace('stamp_', '')}) — Click & drag on the ground`}
                </div>
              )}

              {/* Cinematic Preview Floating Stop Banner */}
              {cinematicPreview && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-5 py-2.5 rounded-xl bg-[#0B0E14]/94 border border-amber-500/40">
                  <span className="text-xs font-medium text-amber-200">
                    Playing Cinematic Camera Sequence
                  </span>
                  <button
                    type="button"
                    onClick={() => setCinematicPreview(false)}
                    className="px-3 py-1 rounded-md bg-rose-600 text-white text-xs font-semibold"
                  >
                    Stop Preview
                  </button>
                </div>
              )}
            </div>
          )}

          {!isPlaytesting && studioTab === 'logic' && (
            <VisualLogicStudio
              project={project}
              onChangeGraph={(logicGraph) => {
                commitChange((p) => ({ ...p, logicGraph }));
                onUnlockAchievement('ach_logic_weaver');
              }}
            />
          )}

          {!isPlaytesting &&
            !cinematicPreview &&
            studioTab !== 'world' &&
            studioTab !== 'logic' && (
              <GameplayAndStudiosPanel
                activeTab={studioTab}
                project={project}
                cinematicPreviewActive={cinematicPreview}
                onUpdateProject={(patch) => commitChange((p) => ({ ...p, ...patch }))}
                onApplyTemplate={handleApplyTemplate}
                onToggleCinematicPreview={() => setCinematicPreview((v) => !v)}
                onPublishProject={(opts) => {
                  const nextVersion = project.publishedVersion + 1;
                  const updated: WorldProject = {
                    ...project,
                    title: opts.title,
                    description: opts.description,
                    category: opts.category,
                    thumbnail: opts.thumbnail,
                    status: 'published',
                    publishedVersion: nextVersion,
                    updatedAt: new Date().toISOString(),
                  };
                  setProject(updated);
                  onSaveProject(updated);
                  onPublishProject(updated, opts);
                  onUnlockAchievement('ach_publisher');
                }}
              />
            )}
        </main>

        {/* Right Properties Inspector (World Builder Edit mode only) */}
        {!isPlaytesting && studioTab === 'world' && (
          <InspectorPanel
            project={project}
            selectedObject={selectedObject}
            inspectorTab={inspectorTab}
            onChangeTab={(tab) => {
              setInspectorTab(tab);
              if (tab === 'terrain') setEditorTool('terrain');
              else if (editorTool === 'terrain') setEditorTool('select');
            }}
            terrainTool={terrainTool}
            terrainRadius={terrainRadius}
            terrainStrength={terrainStrength}
            terrainPaintColor={terrainPaintColor}
            onChangeTerrainTool={(t) => {
              setTerrainTool(t);
              setEditorTool('terrain');
            }}
            onChangeTerrainRadius={setTerrainRadius}
            onChangeTerrainStrength={setTerrainStrength}
            onChangeTerrainPaintColor={setTerrainPaintColor}
            onUpdateTerrain={(terrain) => commitChange((p) => ({ ...p, terrain }))}
            onUpdateObject={handleUpdateObject}
            onDuplicateObject={handleDuplicateObject}
            onDeleteObject={handleDeleteObject}
            onUpdateEnvironment={(environment) =>
              commitChange((p) => ({ ...p, environment }))
            }
          />
        )}
      </div>

      {/* Playtest HUD Overlay */}
      {isPlaytesting && (
        <PlaytestHud
          project={project}
          hud={playHud}
          onStopPlaytest={() => setIsPlaytesting(false)}
        />
      )}
    </div>
  );
};
