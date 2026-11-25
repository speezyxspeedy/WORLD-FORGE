import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Check, Plus, RotateCcw, Save, Sparkles, UserPlus, X } from 'lucide-react';
import type { CharacterConfig, SavedCharacterAsset } from '../../types/world';
import { buildCharacterMesh, disposeObject3D } from '../viewport/proceduralModels';
import { detectSoftwareWebGL } from '../../services/hardwareDetect';
import { sanitizeUserText } from '../../services/validation';

interface CharacterStudioProps {
  activeCharacter: CharacterConfig;
  savedCharacters: SavedCharacterAsset[];
  onApplyToProjectPlayer: (config: CharacterConfig) => void;
  onSaveCharacterToLibrary: (name: string, config: CharacterConfig) => void;
  onSpawnCharacterInWorld: (name: string, config: CharacterConfig) => void;
  onClose: () => void;
}

const CHARACTER_PRESETS: Array<{ label: string; config: CharacterConfig }> = [
  {
    label: 'Explorer',
    config: {
      archetype: 'human',
      bodyScale: 1.0,
      shoulderScale: 1.0,
      primaryColor: '#3b82f6',
      secondaryColor: '#1e293b',
      visorColor: '#f59e0b',
      equipment: 'cape',
      idleAnimation: 'breathing',
    },
  },
  {
    label: 'Cyber Runner',
    config: {
      archetype: 'scifi',
      bodyScale: 1.0,
      shoulderScale: 1.05,
      primaryColor: '#f59e0b',
      secondaryColor: '#18181b',
      visorColor: '#38bdf8',
      equipment: 'jetpack',
      idleAnimation: 'breathing',
    },
  },
  {
    label: 'Knight',
    config: {
      archetype: 'fantasy',
      bodyScale: 1.08,
      shoulderScale: 1.18,
      primaryColor: '#64748b',
      secondaryColor: '#92400e',
      visorColor: '#fbbf24',
      equipment: 'shield',
      idleAnimation: 'combat_ready',
    },
  },
  {
    label: 'Automaton',
    config: {
      archetype: 'robot',
      bodyScale: 1.05,
      shoulderScale: 1.1,
      primaryColor: '#e2e8f0',
      secondaryColor: '#334155',
      visorColor: '#14b8a6',
      equipment: 'jetpack',
      idleAnimation: 'hover',
    },
  },
  {
    label: 'Golem Creature',
    config: {
      archetype: 'creature',
      bodyScale: 1.25,
      shoulderScale: 1.32,
      primaryColor: '#52525b',
      secondaryColor: '#27272a',
      visorColor: '#14b8a6',
      equipment: 'crown',
      idleAnimation: 'combat_ready',
    },
  },
];

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  activeCharacter,
  savedCharacters,
  onApplyToProjectPlayer,
  onSaveCharacterToLibrary,
  onSpawnCharacterInWorld,
  onClose,
}) => {
  const [draft, setDraft] = useState<CharacterConfig>({
    ...activeCharacter,
    shoulderScale: activeCharacter.shoulderScale ?? 1.0,
  });
  const [charName, setCharName] = useState('Custom Hero');
  const [poseMode, setPoseMode] = useState<'idle' | 'run' | 'victory'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef(draft);
  const poseRef = useRef(poseMode);
  const rebuildRef = useRef<(() => void) | null>(null);
  draftRef.current = draft;
  poseRef.current = poseMode;

  useEffect(() => {
    const container = canvasHostRef.current;
    if (!container) return;

    const { isSoftwareGl } = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 300);
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('data-testid', 'character-studio-canvas');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111318');
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(0, 1.85, 4.4);

    // Three-point studio lighting
    scene.add(new THREE.HemisphereLight('#d6e6f5', '#272420', 0.7));
    const keyLight = new THREE.DirectionalLight('#fff2db', 1.6);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight('#38bdf8', 0.85);
    rimLight.position.set(-4, 4, -4);
    scene.add(rimLight);

    // Pedestal turntable
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.4, 0.16, 32),
      new THREE.MeshStandardMaterial({ color: '#1c1f26', roughness: 0.4, metalness: 0.35 })
    );
    pedestal.position.y = -0.08;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.26, 0.025, 8, 40),
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        emissive: '#f59e0b',
        emissiveIntensity: 0.55,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(pedestal, ring);

    let charGroup = buildCharacterMesh(draftRef.current);
    // Face character toward front camera (+Z)
    charGroup.rotation.y = Math.PI;
    scene.add(charGroup);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 1.15, 0);
    orbit.enableDamping = !isSoftwareGl;
    orbit.enablePan = false;
    orbit.minDistance = 2.4;
    orbit.maxDistance = 7.5;
    orbit.update();

    let disposed = false;
    let timerId = 0;

    const applyPose = (phase: number) => {
      const legL = charGroup.getObjectByName('legL');
      const legR = charGroup.getObjectByName('legR');
      const armL = charGroup.getObjectByName('armL');
      const armR = charGroup.getObjectByName('armR');
      if (poseRef.current === 'run') {
        const s = Math.sin(phase * 6) * 0.65;
        if (legL) legL.rotation.x = s;
        if (legR) legR.rotation.x = -s;
        if (armL) armL.rotation.x = -s * 0.85;
        if (armR) armR.rotation.x = s * 0.85;
        charGroup.position.y = Math.abs(Math.sin(phase * 6)) * 0.12;
      } else if (poseRef.current === 'victory') {
        if (legL) legL.rotation.x = 0;
        if (legR) legR.rotation.x = 0;
        if (armL) armL.rotation.z = 2.4;
        if (armR) armR.rotation.z = -2.4;
        charGroup.position.y = Math.sin(phase * 3) * 0.08 + 0.08;
      } else {
        if (legL) legL.rotation.x = 0;
        if (legR) legR.rotation.x = 0;
        if (armL) {
          armL.rotation.x = 0;
          armL.rotation.z = 0.06;
        }
        if (armR) {
          armR.rotation.x = 0;
          armR.rotation.z = -0.06;
        }
        charGroup.position.y =
          draftRef.current.idleAnimation === 'hover' ? 0.18 + Math.sin(phase * 2.2) * 0.08 : 0;
      }
    };

    const renderOnce = () => {
      if (disposed) return;
      orbit.update();
      renderer.render(scene, camera);
    };

    rebuildRef.current = () => {
      scene.remove(charGroup);
      disposeObject3D(charGroup);
      charGroup = buildCharacterMesh(draftRef.current);
      charGroup.rotation.y = Math.PI;
      scene.add(charGroup);
      applyPose(0.5);
      renderOnce();
    };

    orbit.addEventListener('change', renderOnce);

    // Subtle preview render / animation (software-WebGL paced)
    let phase = 0.5;
    const step = () => {
      if (disposed) return;
      if (poseRef.current !== 'idle' || draftRef.current.idleAnimation === 'hover') {
        phase += isSoftwareGl ? 0.14 : 0.03;
        applyPose(phase);
        renderOnce();
        timerId = window.setTimeout(step, isSoftwareGl ? 140 : 32);
      } else {
        applyPose(phase);
        renderOnce();
      }
    };
    step();

    const ro = new ResizeObserver(() => {
      if (disposed) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 300);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderOnce();
    });
    ro.observe(container);

    return () => {
      disposed = true;
      window.clearTimeout(timerId);
      ro.disconnect();
      orbit.dispose();
      disposeObject3D(charGroup);
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    rebuildRef.current?.();
  }, [draft, poseMode]);

  const showNotice = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2200);
  };

  return (
    <div className="fixed inset-0 z-30 bg-[#0D0E11] text-zinc-100 flex flex-col">
      {/* Studio Header */}
      <header className="h-12 px-4 border-b border-white/8 bg-[#14161B] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-display font-semibold text-white">Character Studio</span>
          <span className="text-xs text-zinc-500">Live 3D Rig &amp; Reusable Asset Builder</span>
        </div>

        <div className="flex items-center gap-2">
          {feedback && (
            <span className="text-xs text-teal-300 flex items-center gap-1 mr-2">
              <Check className="w-3.5 h-3.5" />
              {feedback}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onApplyToProjectPlayer(draft);
              showNotice('Applied to playable character');
            }}
            className="px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold whitespace-nowrap"
          >
            Set as Player Avatar
          </button>
          <button
            type="button"
            onClick={() => {
              const clean = sanitizeUserText(charName, 40) || 'Custom Character';
              onSpawnCharacterInWorld(clean, draft);
              showNotice(`Spawned "${clean}" into 3D world`);
            }}
            className="px-3 py-1.5 rounded-md bg-[#1C1F26] hover:bg-[#262B35] text-zinc-200 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            Place in World
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#1C1F26] text-zinc-400 hover:text-white"
            aria-label="Close Character Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Saved Characters & Presets */}
        <aside className="w-64 border-r border-white/8 bg-[#14161B] flex flex-col shrink-0 overflow-y-auto p-3.5 space-y-5">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-300">Starter Presets</div>
            <div className="grid grid-cols-1 gap-1.5">
              {CHARACTER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setDraft({ ...preset.config });
                    setCharName(preset.label);
                  }}
                  className="px-3 py-2 rounded-md bg-[#1C1F26] hover:bg-[#252A34] border border-white/6 text-left flex items-center justify-between text-xs text-zinc-200"
                >
                  <span>{preset.label}</span>
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.config.primaryColor }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/8">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span>Saved Character Library</span>
              <span className="text-zinc-500 font-mono tabular-nums">{savedCharacters.length}</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Reusable across all your WORLD FORGE projects.
            </p>
            <div className="space-y-1.5">
              {savedCharacters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDraft({ ...item.config, shoulderScale: item.config.shoulderScale ?? 1 });
                    setCharName(item.name);
                  }}
                  className="w-full px-3 py-2 rounded-md bg-[#0D0E11] hover:bg-[#1C1F26] border border-white/6 text-left flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-100 truncate">{item.name}</div>
                    <div className="text-[10px] text-zinc-500 capitalize">
                      {item.config.archetype} · {item.config.equipment}
                    </div>
                  </div>
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0"
                    style={{ backgroundColor: item.config.primaryColor }}
                  />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Live 3D Turntable Viewport */}
        <main className="flex-1 relative bg-[#111318] min-w-0">
          <div ref={canvasHostRef} className="w-full h-full" />

          {/* Pose Preview Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-lg bg-[#14161B]/95 border border-white/10">
            {(['idle', 'run', 'victory'] as const).map((pose) => (
              <button
                key={pose}
                type="button"
                onClick={() => setPoseMode(pose)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
                  poseMode === pose
                    ? 'bg-amber-500 text-zinc-950 font-semibold'
                    : 'text-zinc-300 hover:bg-[#1C1F26]'
                }`}
              >
                {pose} Pose
              </button>
            ))}
          </div>

          <div className="absolute top-3 left-4 text-[11px] text-zinc-400 pointer-events-none">
            Drag to orbit 360° · Scroll to zoom
          </div>
        </main>

        {/* Right Character Properties Panel */}
        <aside className="w-80 border-l border-white/8 bg-[#14161B] overflow-y-auto p-4 space-y-5 shrink-0">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Character Name</label>
            <input
              type="text"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-[#0D0E11] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-zinc-400">Body Archetype</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['human', 'scifi', 'fantasy', 'robot', 'creature'] as const).map((arch) => (
                <button
                  key={arch}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, archetype: arch }))}
                  className={`py-1.5 rounded-md text-xs font-medium capitalize ${
                    draft.archetype === arch
                      ? 'bg-amber-500 text-zinc-950 font-semibold'
                      : 'bg-[#1C1F26] text-zinc-300 hover:bg-[#252A34]'
                  }`}
                >
                  {arch}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-zinc-400">Clothing &amp; Accessories</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['none', 'jetpack', 'shield', 'cape', 'crown'] as const).map((eq) => (
                <button
                  key={eq}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, equipment: eq }))}
                  className={`py-1.5 rounded-md text-xs font-medium capitalize ${
                    draft.equipment === eq
                      ? 'bg-amber-500 text-zinc-950 font-semibold'
                      : 'bg-[#1C1F26] text-zinc-300 hover:bg-[#252A34]'
                  }`}
                >
                  {eq}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-white/8">
            <div className="text-xs font-semibold text-zinc-200">Appearance Palette</div>
            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-1 block">
                <span className="text-[11px] text-zinc-400">Suit</span>
                <input
                  type="color"
                  value={draft.primaryColor}
                  onChange={(e) => setDraft((d) => ({ ...d, primaryColor: e.target.value }))}
                  className="w-full h-8 rounded bg-transparent cursor-pointer"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[11px] text-zinc-400">Armor</span>
                <input
                  type="color"
                  value={draft.secondaryColor}
                  onChange={(e) => setDraft((d) => ({ ...d, secondaryColor: e.target.value }))}
                  className="w-full h-8 rounded bg-transparent cursor-pointer"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[11px] text-zinc-400">Visor</span>
                <input
                  type="color"
                  value={draft.visorColor}
                  onChange={(e) => setDraft((d) => ({ ...d, visorColor: e.target.value }))}
                  className="w-full h-8 rounded bg-transparent cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-white/8">
            <div className="text-xs font-semibold text-zinc-200">Proportions</div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Overall Height</span>
                <span className="font-mono tabular-nums">{draft.bodyScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.75}
                max={1.35}
                step={0.05}
                value={draft.bodyScale}
                onChange={(e) => setDraft((d) => ({ ...d, bodyScale: Number(e.target.value) }))}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Shoulder Build</span>
                <span className="font-mono tabular-nums">
                  {(draft.shoulderScale ?? 1).toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.4}
                step={0.05}
                value={draft.shoulderScale ?? 1}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, shoulderScale: Number(e.target.value) }))
                }
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/8">
            <button
              type="button"
              onClick={() => {
                const clean = sanitizeUserText(charName, 40) || 'Custom Character';
                onSaveCharacterToLibrary(clean, draft);
                showNotice(`Saved "${clean}" to library`);
              }}
              className="w-full py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Character to Asset Library
            </button>
            <button
              type="button"
              onClick={() => setDraft({ ...CHARACTER_PRESETS[1].config })}
              className="w-full py-1.5 rounded-md bg-[#1C1F26] hover:bg-[#252A34] text-zinc-300 text-xs flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Rig
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
