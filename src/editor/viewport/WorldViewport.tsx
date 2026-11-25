import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  AssetType,
  GameObject,
  GraphicsSettings,
  Transform,
  WorldProject,
} from '../../types/world';
import {
  buildCharacterMesh,
  buildProceduralObjectGroup,
  buildTerrainGeometry,
  disposeObject3D,
  getSurfaceBumpTexture,
} from './proceduralModels';
import { applyTerrainBrush, groundHeightAt, type TerrainTool } from '../terrain/terrainMath';
import {
  checkWinCondition,
  createInitialPlayerState,
  stepPlayerPhysics,
  type PlayerPhysicsState,
} from '../../gameplay/physicsMath';
import { executeLogicEvent, type RuntimeWorldState } from '../logic/logicEngine';
import { detectSoftwareWebGL } from '../../services/hardwareDetect';
import { audioSynth } from '../../services/audioSynth';

export type EditorInteractionMode = 'select' | 'place' | 'terrain';
export type TransformGizmoMode = 'translate' | 'rotate' | 'scale';

export interface PlaytestHudSnapshot {
  health: number;
  maxHealth: number;
  score: number;
  timeRemaining: number;
  inventory: string[];
  notifications: string[];
  cameraView: 'third' | 'first';
  paused: boolean;
  outcome: 'victory' | 'defeat' | null;
  nearbyInteractPrompt: string | null;
  playerPos: { x: number; y: number; z: number };
}

interface WorldViewportProps {
  project: WorldProject;
  mode: 'edit' | 'playtest';
  graphics: GraphicsSettings;
  editorTool: EditorInteractionMode;
  transformMode: TransformGizmoMode;
  placeAssetType: AssetType;
  terrainTool: TerrainTool;
  terrainRadius: number;
  terrainStrength: number;
  terrainPaintColor: string;
  selectedObjectId: string | null;
  showGrid: boolean;
  cinematicPreviewActive?: boolean;
  onSelectObject: (id: string | null) => void;
  onTransformObject: (id: string, transform: Transform) => void;
  onPlaceObject: (assetType: AssetType, x: number, y: number, z: number) => void;
  onUpdateTerrain: (terrain: WorldProject['terrain']) => void;
  onExitPlaytest?: () => void;
  onHudUpdate?: (hud: PlaytestHudSnapshot) => void;
}

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _pointer = new THREE.Vector2();

export const WorldViewport: React.FC<WorldViewportProps> = ({
  project,
  mode,
  graphics,
  editorTool,
  transformMode,
  placeAssetType,
  terrainTool,
  terrainRadius,
  terrainStrength,
  terrainPaintColor,
  selectedObjectId,
  showGrid,
  cinematicPreviewActive = false,
  onSelectObject,
  onTransformObject,
  onPlaceObject,
  onUpdateTerrain,
  onExitPlaytest,
  onHudUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Store reactive props in refs so WebGLRenderer mounts ONCE and never tears down on UI changes
  const propsRef = useRef({
    project,
    mode,
    graphics,
    editorTool,
    transformMode,
    placeAssetType,
    terrainTool,
    terrainRadius,
    terrainStrength,
    terrainPaintColor,
    selectedObjectId,
    showGrid,
    cinematicPreviewActive,
    onSelectObject,
    onTransformObject,
    onPlaceObject,
    onUpdateTerrain,
    onExitPlaytest,
    onHudUpdate,
  });
  propsRef.current = {
    project,
    mode,
    graphics,
    editorTool,
    transformMode,
    placeAssetType,
    terrainTool,
    terrainRadius,
    terrainStrength,
    terrainPaintColor,
    selectedObjectId,
    showGrid,
    cinematicPreviewActive,
    onSelectObject,
    onTransformObject,
    onPlaceObject,
    onUpdateTerrain,
    onExitPlaytest,
    onHudUpdate,
  };

  // Expose scene sync trigger so React prop changes redraw on-demand cleanly
  const syncSceneRef = useRef<(() => void) | null>(null);
  const resetPlaytestRef = useRef<(() => void) | null>(null);
  const toggleCameraRef = useRef<(() => void) | null>(null);
  const togglePauseRef = useRef<((force?: boolean) => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { isSoftwareGl } = detectSoftwareWebGL();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && propsRef.current.graphics.antialiasing,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl && propsRef.current.graphics.shadowsEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);
    renderer.setSize(width, height);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio * propsRef.current.graphics.resolutionScale, 2)
    );

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('data-testid', 'world-forge-canvas');

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.15, 420);
    camera.position.set(18, 15, 24);
    camera.lookAt(0, 1, 0);

    // Three-point warm/cool lighting rig
    const hemiLight = new THREE.HemisphereLight('#b9d7f5', '#3b3730', 0.65);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fff2db', 1.45);
    sunLight.position.set(28, 42, 20);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 140;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    // Subtle cool rim fill light
    const rimLight = new THREE.DirectionalLight('#7dd3fc', 0.35);
    rimLight.position.set(-24, 16, -26);
    scene.add(rimLight);

    // Editor helpers
    const gridHelper = new THREE.GridHelper(84, 42, '#475569', '#1e293b');
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    const boundaryGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(76, 0.4, 76));
    const boundaryLine = new THREE.LineSegments(
      boundaryGeo,
      new THREE.LineBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.4 })
    );
    boundaryLine.position.y = 0.2;
    scene.add(boundaryLine);

    // Terrain & water group
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
      bumpMap: getSurfaceBumpTexture(maxAniso),
      bumpScale: 0.06,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(buildTerrainGeometry(propsRef.current.project.terrain), terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.name = 'TERRAIN_SURFACE';
    scene.add(terrainMesh);

    const waterMat = new THREE.MeshStandardMaterial({
      color: '#1d78a6',
      roughness: 0.18,
      metalness: 0.25,
      transparent: true,
      opacity: 0.78,
    });
    const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(88, 88), waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    // Sculpt brush ring indicator
    const brushRing = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.0, 28),
      new THREE.MeshBasicMaterial({ color: '#f59e0b', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    brushRing.rotation.x = -Math.PI / 2;
    brushRing.visible = false;
    scene.add(brushRing);

    // Selection bounding box helper
    const selectionBox = new THREE.BoxHelper(new THREE.Object3D(), '#f59e0b');
    selectionBox.visible = false;
    scene.add(selectionBox);

    // Weather particles (pooled BufferGeometry)
    const WEATHER_COUNT = 320;
    const weatherPositions = new Float32Array(WEATHER_COUNT * 3);
    for (let i = 0; i < WEATHER_COUNT; i++) {
      weatherPositions[i * 3] = (Math.random() - 0.5) * 70;
      weatherPositions[i * 3 + 1] = Math.random() * 26;
      weatherPositions[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const weatherGeo = new THREE.BufferGeometry();
    weatherGeo.setAttribute('position', new THREE.BufferAttribute(weatherPositions, 3));
    const weatherMat = new THREE.PointsMaterial({
      color: '#cbd5e1',
      size: 0.22,
      transparent: true,
      opacity: 0.7,
    });
    const weatherPoints = new THREE.Points(weatherGeo, weatherMat);
    weatherPoints.visible = false;
    scene.add(weatherPoints);

    // World objects root & lookup map
    const objectsRoot = new THREE.Group();
    scene.add(objectsRoot);
    const meshMap = new Map<string, THREE.Group>();
    const signatureMap = new Map<string, string>();

    // Player character mesh (visible in 3rd-person playtest)
    let playerMesh = buildCharacterMesh(propsRef.current.project.character);
    playerMesh.visible = false;
    scene.add(playerMesh);
    let lastCharSig = JSON.stringify(propsRef.current.project.character);

    // OrbitControls & TransformControls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = !isSoftwareGl;
    orbitControls.dampingFactor = 0.08;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.04;
    orbitControls.minDistance = 4;
    orbitControls.maxDistance = 120;
    orbitControls.target.set(0, 1, 0);

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setSize(0.85);
    const gizmoHelper = transformControls.getHelper();
    scene.add(gizmoHelper);

    const raycaster = new THREE.Raycaster();

    // Pacing helpers for Software WebGL vs GPU
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let isDraggingGizmo = false;
    let isSculpting = false;
    let lastTerrainSig = '';

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 6);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 6);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function requestEditRender() {
      if (disposed || propsRef.current.mode === 'playtest' || propsRef.current.cinematicPreviewActive) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        orbitControls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty) requestEditRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    // Playtest state (mutable refs inside effect for 60fps zero-React-reconcile loop)
    let playPlayer: PlayerPhysicsState = createInitialPlayerState(
      propsRef.current.project.objects,
      propsRef.current.project.terrain
    );
    let playRuntime: RuntimeWorldState = {
      player: {
        health: propsRef.current.project.gameplay.playerHealth,
        maxHealth: propsRef.current.project.gameplay.playerHealth,
        score: 0,
        team: propsRef.current.project.gameplay.teamNames[0] || 'Alpha',
        inventory: [...propsRef.current.project.gameplay.startingInventory],
        position: { ...playPlayer.position },
      },
      doorsOpen: {},
      objects: propsRef.current.project.objects,
      notifications: [],
      activeTimerSeconds: propsRef.current.project.gameplay.matchDuration,
      matchEnded: false,
      matchOutcome: null,
      spawnedObjects: [],
      executionLog: [],
    };
    let playCameraView: 'third' | 'first' = 'third';
    let playPaused = false;
    let playTimeRemaining = propsRef.current.project.gameplay.matchDuration;
    let collectedIds = new Set<string>();
    let activeTriggerIds = new Set<string>();
    let reachedGoal = false;
    let damageCooldown = 0;
    let lastHudEmit = 0;
    let cinematicClock = 0;
    let lastTickMs = performance.now();

    const keysHeld = new Set<string>();
    let jumpJustPressed = false;
    let interactJustPressed = false;
    let mouseLooking = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const emitHud = (force = false) => {
      const now = performance.now();
      if (!force && now - lastHudEmit < 120) return;
      lastHudEmit = now;

      // Check nearby interactive button
      let nearbyInteractPrompt: string | null = null;
      for (const obj of propsRef.current.project.objects) {
        if (obj.assetType === 'button_pad' && obj.visible) {
          const d = Math.hypot(
            playPlayer.position.x - obj.transform.position.x,
            playPlayer.position.z - obj.transform.position.z
          );
          if (d < 3.5) {
            nearbyInteractPrompt = `Press E — Activate ${obj.name}`;
            break;
          }
        }
      }

      propsRef.current.onHudUpdate?.({
        health: Math.round(playRuntime.player.health),
        maxHealth: Math.round(playRuntime.player.maxHealth),
        score: Math.round(playRuntime.player.score),
        timeRemaining: Math.max(0, Math.round(playTimeRemaining)),
        inventory: [...playRuntime.player.inventory],
        notifications: playRuntime.notifications.slice(-3),
        cameraView: playCameraView,
        paused: playPaused,
        outcome: playRuntime.matchOutcome,
        nearbyInteractPrompt,
        playerPos: {
          x: Math.round(playPlayer.position.x),
          y: Math.round(playPlayer.position.y),
          z: Math.round(playPlayer.position.z),
        },
      });
    };

    const resetPlaytestSession = () => {
      const proj = propsRef.current.project;
      playPlayer = createInitialPlayerState(proj.objects, proj.terrain);
      playTimeRemaining = proj.gameplay.matchDuration;
      collectedIds = new Set<string>();
      activeTriggerIds = new Set<string>();
      reachedGoal = false;
      playPaused = false;
      keysHeld.clear();

      playRuntime = {
        player: {
          health: proj.gameplay.playerHealth,
          maxHealth: proj.gameplay.playerHealth,
          score: 0,
          team: proj.gameplay.teamNames[0] || 'Alpha',
          inventory: [...proj.gameplay.startingInventory],
          position: { ...playPlayer.position },
        },
        doorsOpen: {},
        objects: proj.objects,
        notifications: [],
        activeTimerSeconds: proj.gameplay.matchDuration,
        matchEnded: false,
        matchOutcome: null,
        spawnedObjects: [],
        executionLog: [],
      };

      // Fire player_joins logic nodes
      playRuntime = executeLogicEvent(proj.logicGraph, playRuntime, { eventType: 'player_joins' });
      if (playRuntime.activeTimerSeconds !== null) {
        playTimeRemaining = playRuntime.activeTimerSeconds;
      }

      // Restore visibility of pickups while keeping invisible Trigger Zones hidden in Playtest
      for (const obj of proj.objects) {
        const g = meshMap.get(obj.id);
        if (g) g.visible = obj.visible && obj.assetType !== 'trigger_zone';
      }

      // Snap camera immediately behind player spawn facing forward
      playerMesh.position.set(playPlayer.position.x, playPlayer.position.y, playPlayer.position.z);
      playerMesh.rotation.y = playPlayer.yaw;
      playerMesh.visible = playCameraView === 'third';
      camera.position.set(
        playPlayer.position.x + Math.sin(playPlayer.yaw) * 7.4,
        playPlayer.position.y + 3.8,
        playPlayer.position.z + Math.cos(playPlayer.yaw) * 7.4
      );
      camera.lookAt(playPlayer.position.x, playPlayer.position.y + 1.45, playPlayer.position.z);

      document.body.dataset.state = 'playing';
      emitHud(true);
    };
    resetPlaytestRef.current = resetPlaytestSession;

    toggleCameraRef.current = () => {
      playCameraView = playCameraView === 'third' ? 'first' : 'third';
      playerMesh.visible = propsRef.current.mode === 'playtest' && playCameraView === 'third';
      emitHud(true);
    };

    togglePauseRef.current = (force?: boolean) => {
      if (propsRef.current.mode !== 'playtest') return;
      playPaused = force !== undefined ? force : !playPaused;
      document.body.dataset.state = playPaused ? 'paused' : 'playing';
      if (playPaused) {
        keysHeld.clear();
        document.exitPointerLock?.();
      }
      emitHud(true);
    };

    // Sync Three.js scene with React WorldProject data
    const syncSceneFromProps = () => {
      const {
        project: proj,
        mode: curMode,
        graphics: gfx,
        selectedObjectId: selId,
        transformMode: tMode,
        showGrid: gridOn,
        editorTool: eTool,
      } = propsRef.current;

      // Renderer quality
      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio * gfx.resolutionScale, 2)
      );
      renderer.shadowMap.enabled = !isSoftwareGl && gfx.shadowsEnabled;

      // Environment lighting & sky
      scene.background = new THREE.Color(proj.environment.horizonColor || proj.environment.skyColor);
      if (proj.environment.fogEnabled && gfx.fogEnabled) {
        scene.fog = new THREE.FogExp2(
          proj.environment.horizonColor || proj.environment.skyColor,
          proj.environment.fogDensity
        );
      } else {
        scene.fog = null;
      }
      hemiLight.intensity = proj.environment.ambientIntensity;
      sunLight.intensity = proj.environment.sunIntensity;
      const elevRad = THREE.MathUtils.degToRad(proj.environment.sunElevation);
      const azimRad = THREE.MathUtils.degToRad(proj.environment.sunAzimuth);
      sunLight.position.set(
        Math.cos(elevRad) * Math.sin(azimRad) * 52,
        Math.sin(elevRad) * 52,
        Math.cos(elevRad) * Math.cos(azimRad) * 52
      );

      // Weather visibility
      weatherPoints.visible = proj.environment.weather !== 'clear';
      weatherMat.color.set(proj.environment.weather === 'snow' ? '#f8fafc' : '#93c5fd');

      // Terrain update only if changed
      const terrainSig = `${proj.terrain.width}:${proj.terrain.depth}:${proj.terrain.heights.join(',')}:${proj.terrain.colors.slice(0, 24).join(',')}:${proj.terrain.groundPreset}`;
      if (terrainSig !== lastTerrainSig) {
        lastTerrainSig = terrainSig;
        const oldGeo = terrainMesh.geometry;
        terrainMesh.geometry = buildTerrainGeometry(proj.terrain);
        oldGeo.dispose();
      }
      waterMesh.visible = proj.terrain.waterEnabled;
      waterMesh.position.y = proj.terrain.waterLevel;

      // Grid & boundary helpers only in edit mode
      gridHelper.visible = curMode === 'edit' && gridOn;
      boundaryLine.visible = curMode === 'edit';
      const bScale = (proj.environment.worldBoundary * 2) / 76;
      boundaryLine.scale.set(bScale, 1, bScale);

      // Reconcile GameObjects
      const activeIds = new Set<string>();
      for (const obj of proj.objects) {
        activeIds.add(obj.id);
        const visualSig = `${obj.assetType}|${obj.material.color}|${obj.material.roughness}|${obj.material.metalness}|${obj.material.preset}|${obj.material.opacity}`;
        let group = meshMap.get(obj.id);
        if (!group || signatureMap.get(obj.id) !== visualSig) {
          if (group) {
            if (transformControls.object === group) transformControls.detach();
            objectsRoot.remove(group);
            disposeObject3D(group);
          }
          group = buildProceduralObjectGroup(obj, maxAniso);
          objectsRoot.add(group);
          meshMap.set(obj.id, group);
          signatureMap.set(obj.id, visualSig);
        }

        if (!isDraggingGizmo || selId !== obj.id) {
          group.position.set(obj.transform.position.x, obj.transform.position.y, obj.transform.position.z);
          group.rotation.set(obj.transform.rotation.x, obj.transform.rotation.y, obj.transform.rotation.z);
          group.scale.set(obj.transform.scale.x, obj.transform.scale.y, obj.transform.scale.z);
        }

        // Hide trigger zone cubes during playtest for clean immersion
        if (curMode === 'playtest' && obj.assetType === 'trigger_zone') {
          group.visible = false;
        } else if (curMode === 'playtest' && collectedIds.has(obj.id)) {
          group.visible = false;
        } else {
          group.visible = obj.visible;
        }
      }

      // Remove deleted objects
      for (const [id, group] of meshMap.entries()) {
        if (!activeIds.has(id)) {
          if (transformControls.object === group) transformControls.detach();
          objectsRoot.remove(group);
          disposeObject3D(group);
          meshMap.delete(id);
          signatureMap.delete(id);
        }
      }

      // Character mesh updates
      const charSig = JSON.stringify(proj.character);
      if (charSig !== lastCharSig) {
        lastCharSig = charSig;
        scene.remove(playerMesh);
        disposeObject3D(playerMesh);
        playerMesh = buildCharacterMesh(proj.character);
        scene.add(playerMesh);
      }
      playerMesh.visible = curMode === 'playtest' && playCameraView === 'third';

      // Selection & TransformControls
      if (curMode === 'edit' && eTool === 'select' && selId) {
        const targetGroup = meshMap.get(selId);
        const objData = proj.objects.find((o) => o.id === selId);
        if (targetGroup && objData && !objData.locked) {
          targetGroup.updateMatrixWorld(true);
          transformControls.setMode(tMode);
          if (transformControls.object !== targetGroup) {
            transformControls.detach();
            transformControls.attach(targetGroup);
          }
          selectionBox.setFromObject(targetGroup);
          selectionBox.visible = true;
        } else if (targetGroup) {
          targetGroup.updateMatrixWorld(true);
          transformControls.detach();
          selectionBox.setFromObject(targetGroup);
          selectionBox.visible = true;
        } else {
          transformControls.detach();
          selectionBox.visible = false;
        }
      } else {
        transformControls.detach();
        selectionBox.visible = false;
      }

      orbitControls.enabled = curMode === 'edit' && !isDraggingGizmo && !isSculpting;
      if (eTool !== 'terrain' || curMode !== 'edit') {
        brushRing.visible = false;
      }

      requestEditRender();
    };
    syncSceneRef.current = syncSceneFromProps;

    // TransformControls events
    const onDraggingChanged = (ev: { value: unknown }) => {
      isDraggingGizmo = Boolean(ev.value);
      orbitControls.enabled = !isDraggingGizmo && propsRef.current.mode === 'edit';
      if (!isDraggingGizmo && transformControls.object) {
        const g = transformControls.object;
        const id = g.userData.gameObjectId as string | undefined;
        if (id) {
          propsRef.current.onTransformObject(id, {
            position: {
              x: Number(g.position.x.toFixed(2)),
              y: Number(g.position.y.toFixed(2)),
              z: Number(g.position.z.toFixed(2)),
            },
            rotation: {
              x: Number(g.rotation.x.toFixed(3)),
              y: Number(g.rotation.y.toFixed(3)),
              z: Number(g.rotation.z.toFixed(3)),
            },
            scale: {
              x: Number(Math.max(0.15, g.scale.x).toFixed(2)),
              y: Number(Math.max(0.15, g.scale.y).toFixed(2)),
              z: Number(Math.max(0.15, g.scale.z).toFixed(2)),
            },
          });
        }
      }
      requestEditRender();
    };
    const onTransformChange = () => {
      if (transformControls.object) {
        selectionBox.setFromObject(transformControls.object);
      }
      requestEditRender();
    };
    transformControls.addEventListener('dragging-changed', onDraggingChanged);
    transformControls.addEventListener('change', onTransformChange);

    const onOrbitChange = () => requestEditRender();
    orbitControls.addEventListener('change', onOrbitChange);

    // Pointer utilities
    const updatePointerNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findGameObjectId = (obj: THREE.Object3D | null): string | null => {
      let cur = obj;
      while (cur) {
        if (cur.userData?.gameObjectId) return cur.userData.gameObjectId as string;
        cur = cur.parent;
      }
      return null;
    };

    const applyBrushAtPointer = (clientX: number, clientY: number) => {
      updatePointerNdc(clientX, clientY);
      raycaster.setFromCamera(_pointer, camera);
      const hits = raycaster.intersectObject(terrainMesh, false);
      if (hits.length > 0) {
        const pt = hits[0].point;
        const { project: proj, terrainTool: tTool, terrainRadius: r, terrainStrength: s, terrainPaintColor: c } =
          propsRef.current;
        const nextTerrain = applyTerrainBrush(proj.terrain, {
          tool: tTool,
          worldX: pt.x,
          worldZ: pt.z,
          radius: r,
          strength: s,
          paintColor: c,
        });
        propsRef.current.onUpdateTerrain(nextTerrain);
      }
    };

    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      if (propsRef.current.mode === 'playtest') {
        if (!playPaused && !playRuntime.matchEnded) {
          mouseLooking = true;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
        return;
      }

      if (e.button !== 0 || isDraggingGizmo) return;
      pointerDownPos = { x: e.clientX, y: e.clientY };

      if (propsRef.current.editorTool === 'terrain') {
        isSculpting = true;
        orbitControls.enabled = false;
        applyBrushAtPointer(e.clientX, e.clientY);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (propsRef.current.mode === 'playtest') {
        if (mouseLooking && !playPaused && !playRuntime.matchEnded) {
          const dx = e.clientX - lastMouseX;
          const dy = e.clientY - lastMouseY;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
          playPlayer.yaw -= dx * 0.0055;
          playPlayer.pitch = Math.max(-1.1, Math.min(0.95, playPlayer.pitch - dy * 0.0045));
        }
        return;
      }

      if (propsRef.current.editorTool === 'terrain') {
        updatePointerNdc(e.clientX, e.clientY);
        raycaster.setFromCamera(_pointer, camera);
        const hits = raycaster.intersectObject(terrainMesh, false);
        if (hits.length > 0) {
          const pt = hits[0].point;
          brushRing.visible = true;
          brushRing.position.set(pt.x, pt.y + 0.12, pt.z);
          brushRing.scale.setScalar(propsRef.current.terrainRadius);
          if (isSculpting) {
            applyBrushAtPointer(e.clientX, e.clientY);
          }
          requestEditRender();
        } else {
          brushRing.visible = false;
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (propsRef.current.mode === 'playtest') {
        mouseLooking = false;
        return;
      }

      if (isSculpting) {
        isSculpting = false;
        orbitControls.enabled = true;
        return;
      }

      if (e.button !== 0 || isDraggingGizmo) return;
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 6) return;

      updatePointerNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(_pointer, camera);

      if (propsRef.current.editorTool === 'place') {
        const targets: THREE.Object3D[] = [terrainMesh, ...Array.from(meshMap.values())];
        const hits = raycaster.intersectObjects(targets, true);
        if (hits.length > 0) {
          const pt = hits[0].point;
          const groundY = Math.max(pt.y, groundHeightAt(propsRef.current.project.terrain, pt.x, pt.z));
          propsRef.current.onPlaceObject(
            propsRef.current.placeAssetType,
            Number(pt.x.toFixed(2)),
            Number(groundY.toFixed(2)),
            Number(pt.z.toFixed(2))
          );
          audioSynth.playPlaceObject();
        }
        return;
      }

      if (propsRef.current.editorTool === 'select') {
        const hits = raycaster.intersectObjects(Array.from(meshMap.values()), true);
        if (hits.length > 0) {
          const hitId = findGameObjectId(hits[0].object);
          propsRef.current.onSelectObject(hitId);
        } else {
          propsRef.current.onSelectObject(null);
        }
      }
    };

    // Keyboard listeners for Playtest movement + Editor shortcuts
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (propsRef.current.mode === 'playtest') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          togglePauseRef.current?.();
          return;
        }
        if (e.code === 'KeyV') {
          toggleCameraRef.current?.();
          return;
        }
        if (e.code === 'Space' && !keysHeld.has('Space')) {
          e.preventDefault();
          jumpJustPressed = true;
        }
        if (e.code === 'KeyE' && !keysHeld.has('KeyE')) {
          interactJustPressed = true;
        }
        if (
          e.code === 'ArrowUp' ||
          e.code === 'ArrowDown' ||
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowRight' ||
          e.code === 'Space'
        ) {
          e.preventDefault();
        }
        keysHeld.add(e.code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const onBlur = () => {
      keysHeld.clear();
      mouseLooking = false;
      isSculpting = false;
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
      syncSceneFromProps();
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // ResizeObserver for crisp container sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 100);
        const h = Math.max(Math.floor(entry.contentRect.height), 100);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestEditRender();
      }
    });
    resizeObserver.observe(container);

    // Continuous Playtest / Cinematic loop (paced with afterDraw on Software WebGL!)
    function tickPlayLoop() {
      if (disposed) return;
      const curMode = propsRef.current.mode;
      const curCine = propsRef.current.cinematicPreviewActive;
      if (curMode !== 'playtest' && !curCine) return;

      const now = performance.now();
      const rawDt = (now - lastTickMs) / 1000;
      lastTickMs = now;
      const dt = Math.min(Math.max(rawDt, 0.004), 0.05);
      const proj = propsRef.current.project;

      // Animate decorative spinning beacons/keys & weather particles
      for (const group of meshMap.values()) {
        group.traverse((child) => {
          if (child.userData?.spin) {
            child.rotation.y += dt * 1.8;
          }
          if (child.userData?.isDoorPanel) {
            const objId = group.userData.gameObjectId as string;
            const objMeta = proj.objects.find((o) => o.id === objId);
            const isOpen = objMeta ? Boolean(playRuntime.doorsOpen[objMeta.name]) : false;
            const targetY = isOpen ? 5.1 : 1.825;
            child.position.y += (targetY - child.position.y) * (1 - Math.exp(-8 * dt));
          }
        });
      }

      if (weatherPoints.visible) {
        const pos = weatherGeo.attributes.position as THREE.BufferAttribute;
        const fallSpeed = proj.environment.weather === 'snow' ? 2.8 : 16;
        for (let i = 0; i < WEATHER_COUNT; i++) {
          let y = pos.getY(i) - fallSpeed * dt;
          if (y < -1) y = 24;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }

      if (curCine && proj.cinematics.length > 0) {
        cinematicClock += dt;
        const frames = proj.cinematics;
        const maxT = Math.max(4, frames[frames.length - 1].time + 2);
        const t = cinematicClock % maxT;
        let a = frames[0];
        let b = frames[frames.length - 1];
        for (let i = 0; i < frames.length - 1; i++) {
          if (t >= frames[i].time && t <= frames[i + 1].time) {
            a = frames[i];
            b = frames[i + 1];
            break;
          }
        }
        const span = Math.max(0.1, b.time - a.time);
        const alpha = Math.max(0, Math.min(1, (t - a.time) / span));
        camera.position.set(
          THREE.MathUtils.lerp(a.position.x, b.position.x, alpha),
          THREE.MathUtils.lerp(a.position.y, b.position.y, alpha),
          THREE.MathUtils.lerp(a.position.z, b.position.z, alpha)
        );
        camera.lookAt(
          THREE.MathUtils.lerp(a.lookAt.x, b.lookAt.x, alpha),
          THREE.MathUtils.lerp(a.lookAt.y, b.lookAt.y, alpha),
          THREE.MathUtils.lerp(a.lookAt.z, b.lookAt.z, alpha)
        );
      } else if (curMode === 'playtest' && !playPaused && !playRuntime.matchEnded) {
        // Turn with Q/E or Left/Right arrow keys if desired alongside mouse drag
        if (keysHeld.has('KeyQ')) playPlayer.yaw += dt * 2.1;

        const step = stepPlayerPhysics(
          playPlayer,
          {
            forward: keysHeld.has('KeyW') || keysHeld.has('ArrowUp'),
            backward: keysHeld.has('KeyS') || keysHeld.has('ArrowDown'),
            left: keysHeld.has('KeyA') || keysHeld.has('ArrowLeft'),
            right: keysHeld.has('KeyD') || keysHeld.has('ArrowRight'),
            jumpJustPressed,
            jumpHeld: keysHeld.has('Space'),
            sprint: keysHeld.has('ShiftLeft') || keysHeld.has('ShiftRight'),
          },
          proj.terrain,
          proj.objects,
          playRuntime.doorsOpen,
          proj.gameplay,
          proj.environment.worldBoundary,
          dt
        );
        jumpJustPressed = false;
        playPlayer = step.player;
        playRuntime.player.position = { ...playPlayer.position };

        if (step.justJumped) audioSynth.playJump();
        if (step.justLanded) audioSynth.playLand();

        // Timer countdown
        if (proj.gameplay.winCondition !== 'free_play') {
          playTimeRemaining = Math.max(0, playTimeRemaining - dt);
        }

        // Damage / Safe zone handling
        damageCooldown = Math.max(0, damageCooldown - dt);
        if (step.inDamageZone && !step.inSafeZone && damageCooldown <= 0) {
          playRuntime.player.health = Math.max(0, playRuntime.player.health - 15);
          damageCooldown = 0.75;
          audioSynth.playDamage();
          if (playRuntime.player.health <= 0) {
            playRuntime = executeLogicEvent(proj.logicGraph, playRuntime, { eventType: 'player_dies' });
            playRuntime.matchEnded = true;
            playRuntime.matchOutcome = 'defeat';
            document.body.dataset.state = 'gameover';
          }
        } else if (step.inSafeZone && playRuntime.player.health < playRuntime.player.maxHealth) {
          playRuntime.player.health = Math.min(
            playRuntime.player.maxHealth,
            playRuntime.player.health + 12 * dt
          );
        }

        // Trigger & Pickup evaluations
        const currentTriggers = new Set<string>();
        for (const trig of step.enteredTriggers) {
          currentTriggers.add(trig.id);
          const wasInside = activeTriggerIds.has(trig.id);

          if (!wasInside) {
            // Pickups
            if (
              (trig.assetType === 'key_item' ||
                trig.assetType === 'medkit' ||
                trig.assetType === 'weapon_crate') &&
              !collectedIds.has(trig.id)
            ) {
              collectedIds.add(trig.id);
              const g = meshMap.get(trig.id);
              if (g) g.visible = false;
              audioSynth.playPickup();

              if (trig.assetType === 'medkit') {
                playRuntime.player.health = Math.min(
                  playRuntime.player.maxHealth,
                  playRuntime.player.health + 30
                );
                playRuntime.notifications.push(`Picked up ${trig.name} (+30 HP)`);
              } else if (trig.assetType === 'key_item') {
                if (!playRuntime.player.inventory.includes(trig.name)) {
                  playRuntime.player.inventory.push(trig.name);
                }
              } else if (trig.assetType === 'weapon_crate') {
                playRuntime.player.score += 25;
                if (!playRuntime.player.inventory.includes(trig.name)) {
                  playRuntime.player.inventory.push(trig.name);
                }
              }

              playRuntime = executeLogicEvent(proj.logicGraph, playRuntime, {
                eventType: 'object_touched',
                targetObjectId: trig.id,
                targetObjectName: trig.name,
              });
            } else if (trig.assetType === 'checkpoint') {
              audioSynth.playPickup();
              playRuntime.player.score += 50;
              if (
                trig.name.toLowerCase().includes('goal') ||
                trig.name.toLowerCase().includes('finish')
              ) {
                reachedGoal = true;
              } else {
                playRuntime.notifications.push(`Checkpoint reached: ${trig.name}`);
              }
              playRuntime = executeLogicEvent(proj.logicGraph, playRuntime, {
                eventType: 'object_touched',
                targetObjectId: trig.id,
                targetObjectName: trig.name,
              });
            } else if (trig.assetType === 'trigger_zone') {
              const prevDoors = JSON.stringify(playRuntime.doorsOpen);
              playRuntime = executeLogicEvent(proj.logicGraph, playRuntime, {
                eventType: 'player_enters_area',
                targetObjectId: trig.id,
                targetObjectName: trig.name,
              });
              if (JSON.stringify(playRuntime.doorsOpen) !== prevDoors) {
                audioSynth.playDoorOpen();
              }
            }
          }
        }
        activeTriggerIds = currentTriggers;

        // Interactive button check (E)
        if (interactJustPressed) {
          interactJustPressed = false;
          for (const obj of proj.objects) {
            if (obj.assetType === 'button_pad' && obj.visible) {
              const d = Math.hypot(
                playPlayer.position.x - obj.transform.position.x,
                playPlayer.position.z - obj.transform.position.z
              );
              if (d < 3.5) {
                audioSynth.playButton();
                playRuntime = executeLogicEvent(proj.logicGraph, playRuntime, {
                  eventType: 'button_pressed',
                  targetObjectId: obj.id,
                  targetObjectName: obj.name,
                });
                break;
              }
            }
          }
        }

        // Apply any teleport_player action from logic graph
        if (
          Math.hypot(
            playRuntime.player.position.x - playPlayer.position.x,
            playRuntime.player.position.z - playPlayer.position.z
          ) > 1.5
        ) {
          playPlayer.position = { ...playRuntime.player.position };
        }

        // Win condition check
        if (!playRuntime.matchEnded) {
          const outcome = checkWinCondition(
            proj.gameplay,
            playRuntime.player.score,
            playTimeRemaining,
            reachedGoal
          );
          if (outcome) {
            playRuntime.matchEnded = true;
            playRuntime.matchOutcome = outcome;
            document.body.dataset.state = 'gameover';
            if (outcome === 'victory') audioSynth.playVictory();
          }
        }

        // Update 3rd-person character mesh position, gait animation, and squash-and-stretch
        playerMesh.position.set(playPlayer.position.x, playPlayer.position.y, playPlayer.position.z);
        playerMesh.rotation.y = playPlayer.yaw;
        const invSq = 1 / Math.sqrt(Math.max(0.5, playPlayer.squashY));
        playerMesh.scale.set(
          proj.character.bodyScale * invSq,
          proj.character.bodyScale * playPlayer.squashY,
          proj.character.bodyScale * invSq
        );
        const swing = Math.sin(playPlayer.walkDistance * 2.8) * 0.55;
        const legL = playerMesh.getObjectByName('legL');
        const legR = playerMesh.getObjectByName('legR');
        const armL = playerMesh.getObjectByName('armL');
        const armR = playerMesh.getObjectByName('armR');
        if (legL && legR && armL && armR) {
          legL.rotation.x = swing;
          legR.rotation.x = -swing;
          armL.rotation.x = -swing * 0.7;
          armR.rotation.x = swing * 0.7;
        }

        // Smooth camera follow (3rd-person or 1st-person)
        const camDamp = 1 - Math.exp(-12 * dt);
        if (playCameraView === 'first') {
          _vec3A.set(playPlayer.position.x, playPlayer.position.y + 1.65, playPlayer.position.z);
          camera.position.lerp(_vec3A, camDamp);
          _vec3B.set(
            playPlayer.position.x - Math.sin(playPlayer.yaw) * Math.cos(playPlayer.pitch) * 6,
            playPlayer.position.y + 1.65 + Math.sin(playPlayer.pitch) * 6,
            playPlayer.position.z - Math.cos(playPlayer.yaw) * Math.cos(playPlayer.pitch) * 6
          );
          camera.lookAt(_vec3B);
        } else {
          const dist = 7.4;
          const camH = 3.6 - playPlayer.pitch * 2.2;
          _vec3A.set(
            playPlayer.position.x + Math.sin(playPlayer.yaw) * dist,
            Math.max(
              groundHeightAt(proj.terrain, playPlayer.position.x, playPlayer.position.z) + 1.1,
              playPlayer.position.y + camH
            ),
            playPlayer.position.z + Math.cos(playPlayer.yaw) * dist
          );
          camera.position.lerp(_vec3A, camDamp);
          _vec3B.set(playPlayer.position.x, playPlayer.position.y + 1.45, playPlayer.position.z);
          camera.lookAt(_vec3B);
        }

        emitHud(false);
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tickPlayLoop);
      else frameId = requestAnimationFrame(tickPlayLoop);
    }

    // Initial scene build & render
    syncSceneFromProps();
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    if (propsRef.current.mode === 'playtest') {
      resetPlaytestSession();
      tickPlayLoop();
    } else {
      requestEditRender();
    }

    // Listen for custom playtest control events dispatched from HUD overlay buttons
    const onPlaytestCommand = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === 'restart') resetPlaytestSession();
      if (detail === 'toggle_camera') toggleCameraRef.current?.();
      if (detail === 'resume') togglePauseRef.current?.(false);
      if (detail === 'pause') togglePauseRef.current?.(true);
    };
    window.addEventListener('wf-playtest-cmd', onPlaytestCommand);

    // Expose loop starter when switching into playtest/cinematic mode
    const onModeSwitch = () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderBusy = false;
      syncSceneFromProps();
      if (propsRef.current.mode === 'playtest') {
        resetPlaytestSession();
        lastTickMs = performance.now();
        tickPlayLoop();
      } else if (propsRef.current.cinematicPreviewActive) {
        cinematicClock = 0;
        lastTickMs = performance.now();
        tickPlayLoop();
      } else {
        document.body.dataset.state = 'edit';
        requestEditRender();
      }
    };
    window.addEventListener('wf-viewport-mode-sync', onModeSwitch);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      window.removeEventListener('wf-playtest-cmd', onPlaytestCommand);
      window.removeEventListener('wf-viewport-mode-sync', onModeSwitch);
      transformControls.removeEventListener('dragging-changed', onDraggingChanged);
      transformControls.removeEventListener('change', onTransformChange);
      orbitControls.removeEventListener('change', onOrbitChange);
      transformControls.dispose();
      orbitControls.dispose();
      envTex.dispose();
      terrainMesh.geometry.dispose();
      terrainMat.dispose();
      waterMesh.geometry.dispose();
      waterMat.dispose();
      weatherGeo.dispose();
      weatherMat.dispose();
      for (const g of meshMap.values()) disposeObject3D(g);
      disposeObject3D(playerMesh);
      renderer.dispose();
    };
  }, []);

  // Re-sync scene graph whenever project/editor props change
  useEffect(() => {
    syncSceneRef.current?.();
  }, [
    project,
    graphics,
    editorTool,
    transformMode,
    selectedObjectId,
    showGrid,
  ]);

  // Trigger loop transition when switching between Edit, Playtest, or Cinematic Preview
  useEffect(() => {
    window.dispatchEvent(new Event('wf-viewport-mode-sync'));
  }, [mode, cinematicPreviewActive]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b0e14]">
      <div ref={containerRef} className="w-full h-full" />
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e14]/95 text-slate-200 p-6 text-center">
          <div className="max-w-sm space-y-2">
            <h3 className="text-lg font-semibold">3D Graphics Context Paused</h3>
            <p className="text-sm text-slate-400">
              WebGL context was interrupted by the browser. Restoring automatically when available.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
