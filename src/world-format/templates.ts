import {
  WORLD_SCHEMA_VERSION,
  type CreatorProfile,
  type GameObject,
  type PublishedGame,
  type TemplateType,
  type Universe,
  type WorldProject,
} from '../types/world';
import { createGameObjectFromCatalog } from '../editor/assets/assetCatalog';
import {
  applyTerrainBrush,
  createTerrain,
  groundHeightAt,
  sculptPerimeterHills,
} from '../editor/terrain/terrainMath';

export const DEMO_THUMBNAILS = {
  parkour: '/src/assets/images/world_skyline_parkour_1795365123009.jpg',
  tdm: '/src/assets/images/world_outpost_arena_1795365122328.jpg',
  racing: '/src/assets/images/world_canyon_rally_1795365146706.jpg',
  sandbox: '/src/assets/images/world_citadel_sandbox_1795365142262.jpg',
};

function makeObj(
  assetType: GameObject['assetType'],
  x: number,
  y: number,
  z: number,
  overrides?: Partial<GameObject> & { rotY?: number; scale?: [number, number, number]; color?: string }
): GameObject {
  const base = createGameObjectFromCatalog(assetType, { x, y, z }, overrides?.name);
  if (overrides?.rotY) base.transform.rotation.y = overrides.rotY;
  if (overrides?.scale) {
    base.transform.scale = {
      x: overrides.scale[0],
      y: overrides.scale[1],
      z: overrides.scale[2],
    };
  }
  if (overrides?.color) {
    base.material.color = overrides.color;
    if (base.material.preset === 'emissive') {
      base.material.emissive = overrides.color;
    }
  }
  return {
    ...base,
    ...overrides,
    transform: base.transform,
    material: base.material,
  };
}

function defaultInviteCode(): string {
  return `WF-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`;
}

export function createProjectFromTemplate(
  template: TemplateType,
  customTitle?: string
): WorldProject {
  const now = new Date().toISOString();
  const id = `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  if (template === 'parkour') {
    let terrain = createTerrain(84, 84, 32, 32, 'meadow', true, -2.2);
    terrain = applyTerrainBrush(terrain, {
      tool: 'stamp_hill',
      worldX: 0,
      worldZ: 14,
      radius: 13,
      strength: 2.2,
    });
    terrain = applyTerrainBrush(terrain, {
      tool: 'stamp_hill',
      worldX: 0,
      worldZ: -16,
      radius: 15,
      strength: 3.4,
    });
    terrain = sculptPerimeterHills(terrain, 9, 6);

    const startY = groundHeightAt(terrain, 0, 14);
    const goalY = groundHeightAt(terrain, 0, -16);

    const objects: GameObject[] = [
      makeObj('spawn_point', 0, startY, 14, { name: 'Start Spawn Pad' }),
      makeObj('lamp_post', -3.2, groundHeightAt(terrain, -3.2, 13), 13, { name: 'Start Lantern L' }),
      makeObj('lamp_post', 3.2, groundHeightAt(terrain, 3.2, 13), 13, { name: 'Start Lantern R' }),
      makeObj('ramp', 0, startY, 8.2, { name: 'Launch Ramp 1', color: '#f59e0b' }),
      makeObj('platform', 0, startY + 2.0, 2.5, { name: 'Sky Platform 1', scale: [1.1, 1, 1.1] }),
      makeObj('key_item', 0, startY + 2.9, 2.5, { name: 'Gold Key' }),
      makeObj('platform', 6.2, startY + 3.1, -2.5, { name: 'Sky Platform 2' }),
      makeObj('checkpoint', 6.2, startY + 3.9, -2.5, { name: 'Mid Checkpoint' }),
      makeObj('bridge', 3.2, startY + 3.5, -8.5, { name: 'Sky Bridge', rotY: 0.35 }),
      makeObj('platform', 0, goalY, -12.8, { name: 'Citadel Landing', scale: [1.5, 1, 1.3] }),
      makeObj('trigger_zone', 0, goalY + 0.8, -12.6, { name: 'Gate Trigger' }),
      makeObj('wall', -4.8, goalY, -15.2, { name: 'Gate Wall Left', scale: [0.9, 1.1, 1] }),
      makeObj('wall', 4.8, goalY, -15.2, { name: 'Gate Wall Right', scale: [0.9, 1.1, 1] }),
      makeObj('door_gate', 0, goalY, -15.2, { name: 'Vault Door' }),
      makeObj('watchtower', 0, goalY, -21.5, { name: 'Summit Watchtower', color: '#475569' }),
      makeObj('checkpoint', 0, goalY, -18.2, { name: 'Summit Goal', color: '#14b8a6' }),
      makeObj('tree_pine', -10, groundHeightAt(terrain, -10, 12), 12, { name: 'Pine 1' }),
      makeObj('tree_pine', 10, groundHeightAt(terrain, 10, 12), 12, { name: 'Pine 2' }),
      makeObj('crystal_spire', -8.5, groundHeightAt(terrain, -8.5, -18), -18, { name: 'Sky Crystal L' }),
      makeObj('crystal_spire', 8.5, groundHeightAt(terrain, 8.5, -18), -18, { name: 'Sky Crystal R' }),
    ];

    return {
      schemaVersion: WORLD_SCHEMA_VERSION,
      id,
      title: customTitle || 'Skyline Parkour Course',
      description:
        'Leap across suspended stone platforms, grab the Gold Key, unlock the Vault Door via visual logic, and reach the Summit Goal.',
      category: 'Parkour',
      thumbnail: DEMO_THUMBNAILS.parkour,
      template: 'parkour',
      status: 'draft',
      publishedVersion: 0,
      createdAt: now,
      updatedAt: now,
      activeCreationSeconds: 420,
      studioTier: 'Creator Studio',
      terrain,
      objects,
      environment: {
        skyColor: '#1b3556',
        horizonColor: '#7aa7c7',
        fogEnabled: true,
        fogDensity: 0.008,
        ambientIntensity: 0.65,
        sunIntensity: 1.4,
        sunElevation: 42,
        sunAzimuth: 135,
        timeOfDay: 'day',
        weather: 'clear',
        worldBoundary: 38,
      },
      gameplay: {
        maxPlayers: 16,
        teamsEnabled: false,
        teamNames: ['Runners'],
        playerHealth: 100,
        startingInventory: [],
        respawnTime: 2,
        matchDuration: 180,
        scoreLimit: 100,
        winCondition: 'reach_checkpoint',
        gravity: 24,
        jumpForce: 10.5,
        moveSpeed: 8.5,
      },
      logicGraph: {
        nodes: [
          {
            id: 'n_touch_key',
            category: 'event',
            type: 'object_touched',
            label: 'Object Touched: Gold Key',
            position: { x: 40, y: 40 },
            params: { targetName: 'Gold Key' },
          },
          {
            id: 'n_give_key',
            category: 'action',
            type: 'give_item',
            label: 'Give Item: Gold Key',
            position: { x: 320, y: 40 },
            params: { itemName: 'Gold Key' },
          },
          {
            id: 'n_notify_key',
            category: 'action',
            type: 'display_notification',
            label: 'Notify: Key Found',
            position: { x: 600, y: 40 },
            params: { message: 'Collected Gold Key! Head to the Vault Door.' },
          },
          {
            id: 'n_enter_gate',
            category: 'event',
            type: 'player_enters_area',
            label: 'Player Enters: Gate Trigger',
            position: { x: 40, y: 245 },
            params: { targetName: 'Gate Trigger' },
          },
          {
            id: 'n_has_key',
            category: 'condition',
            type: 'has_item',
            label: 'Has Item: Gold Key?',
            position: { x: 320, y: 245 },
            params: { itemName: 'Gold Key' },
          },
          {
            id: 'n_open_door',
            category: 'action',
            type: 'open_door',
            label: 'Open Vault Door',
            position: { x: 620, y: 190 },
            params: { targetName: 'Vault Door' },
          },
          {
            id: 'n_locked_msg',
            category: 'action',
            type: 'display_notification',
            label: 'Show Locked Message',
            position: { x: 620, y: 345 },
            params: { message: 'Door is locked — collect the Gold Key on Platform 1!' },
          },
        ],
        edges: [
          { id: 'e1', fromNodeId: 'n_touch_key', toNodeId: 'n_give_key', branch: 'default' },
          { id: 'e2', fromNodeId: 'n_give_key', toNodeId: 'n_notify_key', branch: 'default' },
          { id: 'e3', fromNodeId: 'n_enter_gate', toNodeId: 'n_has_key', branch: 'default' },
          { id: 'e4', fromNodeId: 'n_has_key', toNodeId: 'n_open_door', branch: 'true' },
          { id: 'e5', fromNodeId: 'n_has_key', toNodeId: 'n_locked_msg', branch: 'false' },
        ],
      },
      character: {
        archetype: 'scifi',
        bodyScale: 1,
        primaryColor: '#e2e8f0',
        secondaryColor: '#f59e0b',
        visorColor: '#14b8a6',
        equipment: 'jetpack',
        idleAnimation: 'breathing',
      },
      customUI: {
        hudAccent: '#f59e0b',
        showHealthBar: true,
        showScore: true,
        showTimer: true,
        showInventory: true,
        showMinimap: true,
        showCrosshair: true,
        objectiveBanner: 'Grab the Gold Key and unlock the Summit Vault Door',
      },
      cinematics: [
        {
          id: 'ck_1',
          time: 0,
          position: { x: 16, y: 12, z: 22 },
          lookAt: { x: 0, y: 2, z: 0 },
          caption: 'Welcome to Skyline Parkour',
        },
        {
          id: 'ck_2',
          time: 4,
          position: { x: -12, y: 11, z: -8 },
          lookAt: { x: 0, y: 4, z: -18 },
          caption: 'Unlock the Summit Vault to claim victory',
        },
      ],
      audio: { masterVolume: 0.5, sfxEnabled: true, ambientMood: 'wind' },
      multiplayer: {
        mode: 'local_demo',
        sessionVisibility: 'public',
        collaborationChannel: 'editing',
        inviteCode: defaultInviteCode(),
        maxPlayers: 16,
        members: [
          { id: 'm_owner', username: 'AlexForge (You)', role: 'Owner', status: 'local_host' },
          { id: 'm_demo1', username: 'MayaVoxel', role: 'Editor', status: 'offline_demo' },
        ],
      },
    };
  }

  if (template === 'tdm') {
    let terrain = createTerrain(90, 90, 32, 32, 'alpine', false, -2);
    terrain = sculptPerimeterHills(terrain, 10, 7.5);
    terrain = applyTerrainBrush(terrain, {
      tool: 'stamp_hill',
      worldX: -18,
      worldZ: 0,
      radius: 10,
      strength: 1.5,
    });
    terrain = applyTerrainBrush(terrain, {
      tool: 'stamp_hill',
      worldX: 18,
      worldZ: 0,
      radius: 10,
      strength: 1.5,
    });

    const g = (x: number, z: number) => groundHeightAt(terrain, x, z);

    const objects: GameObject[] = [
      makeObj('spawn_point', -20, g(-20, 0), 0, { name: 'Alpha Team Spawn', rotY: -Math.PI / 2, color: '#ef4444' }),
      makeObj('spawn_point', 20, g(20, 0), 0, { name: 'Bravo Team Spawn', rotY: Math.PI / 2, color: '#14b8a6' }),
      makeObj('watchtower', -24, g(-24, -6), -6, { name: 'Alpha Watchtower', color: '#b91c1c' }),
      makeObj('watchtower', 24, g(24, 6), 6, { name: 'Bravo Watchtower', color: '#0f766e' }),
      makeObj('house', -22, g(-22, 8), 8, { name: 'Alpha Command', color: '#991b1b' }),
      makeObj('house', 22, g(22, -8), -8, { name: 'Bravo Command', color: '#115e59' }),
      makeObj('road', 0, g(0, 0) + 0.03, 0, { name: 'Center Highway', rotY: Math.PI / 2, scale: [1.1, 1, 3.6] }),
      makeObj('barrier', -8, g(-8, -4), -4, { name: 'Cover Barrier A1', rotY: Math.PI / 2 }),
      makeObj('barrier', -8, g(-8, 4), 4, { name: 'Cover Barrier A2', rotY: Math.PI / 2 }),
      makeObj('barrier', 8, g(8, -4), -4, { name: 'Cover Barrier B1', rotY: Math.PI / 2 }),
      makeObj('barrier', 8, g(8, 4), 4, { name: 'Cover Barrier B2', rotY: Math.PI / 2 }),
      makeObj('crate_stack', 0, g(0, -6), -6, { name: 'Central Cargo' }),
      makeObj('vehicle_rover', -12, g(-12, 10), 10, { name: 'Patrol Rover', rotY: 0.6 }),
      makeObj('weapon_crate', 0, g(0, 0), 0, { name: 'Center Power Weapon' }),
      makeObj('medkit', -14, g(-14, -8), -8, { name: 'Alpha Medkit' }),
      makeObj('medkit', 14, g(14, 8), 8, { name: 'Bravo Medkit' }),
      makeObj('damage_zone', 0, g(0, 8), 8, { name: 'Thermal Hazard' }),
      makeObj('safe_zone', -20, g(-20, 0), 0, { name: 'Alpha Safe Zone' }),
      makeObj('npc_guard', 10, g(10, 0), 0, { name: 'Bravo Sentinel', color: '#14b8a6' }),
      makeObj('tree_pine', -16, g(-16, -16), -16, { name: 'Perimeter Pine 1' }),
      makeObj('tree_pine', 16, g(16, -16), -16, { name: 'Perimeter Pine 2' }),
      makeObj('tree_pine', -16, g(-16, 16), 16, { name: 'Perimeter Pine 3' }),
      makeObj('tree_pine', 16, g(16, 16), 16, { name: 'Perimeter Pine 4' }),
      makeObj('rock', 0, g(0, -16), -16, { name: 'Canyon Boulder' }),
    ];

    return {
      schemaVersion: WORLD_SCHEMA_VERSION,
      id,
      title: customTitle || 'Outpost Arena TDM',
      description:
        'Symmetric red-vs-teal tactical combat canyon with elevated watchtowers, cover barriers, weapon supplies, and team score logic.',
      category: 'FPS',
      thumbnail: DEMO_THUMBNAILS.tdm,
      template: 'tdm',
      status: 'draft',
      publishedVersion: 0,
      createdAt: now,
      updatedAt: now,
      activeCreationSeconds: 610,
      studioTier: 'Advanced Studio',
      terrain,
      objects,
      environment: {
        skyColor: '#2d1e38',
        horizonColor: '#d97b59',
        fogEnabled: true,
        fogDensity: 0.009,
        ambientIntensity: 0.55,
        sunIntensity: 1.55,
        sunElevation: 18,
        sunAzimuth: 255,
        timeOfDay: 'sunset',
        weather: 'clear',
        worldBoundary: 40,
      },
      gameplay: {
        maxPlayers: 12,
        teamsEnabled: true,
        teamNames: ['Alpha Red', 'Bravo Teal'],
        playerHealth: 100,
        startingInventory: ['Pulse Carbine'],
        respawnTime: 4,
        matchDuration: 300,
        scoreLimit: 100,
        winCondition: 'reach_score',
        gravity: 24,
        jumpForce: 9.5,
        moveSpeed: 8.8,
      },
      logicGraph: {
        nodes: [
          {
            id: 'tdm_join',
            category: 'event',
            type: 'player_joins',
            label: 'Player Joins Match',
            position: { x: 40, y: 40 },
            params: {},
          },
          {
            id: 'tdm_timer',
            category: 'action',
            type: 'start_timer',
            label: 'Start 300s Match Timer',
            position: { x: 320, y: 40 },
            params: { seconds: 300 },
          },
          {
            id: 'tdm_supply',
            category: 'event',
            type: 'object_touched',
            label: 'Touched: Center Power Weapon',
            position: { x: 40, y: 190 },
            params: { targetName: 'Center Power Weapon' },
          },
          {
            id: 'tdm_score',
            category: 'action',
            type: 'add_score',
            label: 'Add +25 Team Score',
            position: { x: 320, y: 190 },
            params: { amount: 25 },
          },
          {
            id: 'tdm_check',
            category: 'condition',
            type: 'player_score',
            label: 'Score >= 100?',
            position: { x: 580, y: 190 },
            params: { operator: '>=', value: 100 },
          },
          {
            id: 'tdm_win',
            category: 'action',
            type: 'end_match',
            label: 'Declare Team Victory',
            position: { x: 840, y: 150 },
            params: { outcome: 'victory', message: 'Alpha Red secured the Outpost!' },
          },
        ],
        edges: [
          { id: 'te1', fromNodeId: 'tdm_join', toNodeId: 'tdm_timer', branch: 'default' },
          { id: 'te2', fromNodeId: 'tdm_supply', toNodeId: 'tdm_score', branch: 'default' },
          { id: 'te3', fromNodeId: 'tdm_score', toNodeId: 'tdm_check', branch: 'default' },
          { id: 'te4', fromNodeId: 'tdm_check', toNodeId: 'tdm_win', branch: 'true' },
        ],
      },
      character: {
        archetype: 'scifi',
        bodyScale: 1,
        primaryColor: '#dc2626',
        secondaryColor: '#1e293b',
        visorColor: '#f59e0b',
        equipment: 'shield',
        idleAnimation: 'combat_ready',
      },
      customUI: {
        hudAccent: '#ef4444',
        showHealthBar: true,
        showScore: true,
        showTimer: true,
        showInventory: true,
        showMinimap: true,
        showCrosshair: true,
        objectiveBanner: 'Capture the Center Power Weapon and reach 100 points',
      },
      cinematics: [
        {
          id: 'ck_tdm_1',
          time: 0,
          position: { x: 0, y: 16, z: 26 },
          lookAt: { x: 0, y: 2, z: 0 },
          caption: 'Outpost Arena — Secure the Canyon Center',
        },
      ],
      audio: { masterVolume: 0.5, sfxEnabled: true, ambientMood: 'arena_pulse' },
      multiplayer: {
        mode: 'local_demo',
        sessionVisibility: 'public',
        collaborationChannel: 'gameplay',
        inviteCode: defaultInviteCode(),
        maxPlayers: 12,
        members: [{ id: 'm_owner', username: 'AlexForge (You)', role: 'Owner', status: 'local_host' }],
      },
    };
  }

  if (template === 'racing') {
    let terrain = createTerrain(92, 92, 32, 32, 'desert', true, -1.6);
    terrain = sculptPerimeterHills(terrain, 9, 8);
    terrain = applyTerrainBrush(terrain, {
      tool: 'stamp_lake',
      worldX: 14,
      worldZ: -10,
      radius: 11,
      strength: 2.5,
    });
    const g = (x: number, z: number) => groundHeightAt(terrain, x, z);

    const objects: GameObject[] = [
      makeObj('spawn_point', 0, g(0, 18), 18, { name: 'Starting Grid' }),
      makeObj('vehicle_rover', -4, g(-4, 15), 15, { name: 'Rally Rover #3' }),
      makeObj('vehicle_speeder', 5, g(5, 14), 14, { name: 'Sand Speeder' }),
      makeObj('road', 0, g(0, 8) + 0.03, 8, { name: 'Straightaway 1', scale: [1.3, 1, 2.2] }),
      makeObj('checkpoint', 0, g(0, 2), 2, { name: 'Gate 1' }),
      makeObj('ramp', 0, g(0, -6), -6, { name: 'Canyon Jump' }),
      makeObj('checkpoint', 0, g(0, -18), -18, { name: 'Finish Gate', color: '#14b8a6' }),
      makeObj('rock', -12, g(-12, 0), 0, { name: 'Mesa Spire 1', color: '#b45309', scale: [1.8, 2.2, 1.8] }),
      makeObj('rock', -14, g(-14, -14), -14, { name: 'Mesa Spire 2', color: '#9a3412', scale: [1.6, 1.9, 1.6] }),
      makeObj('tree_oak', 18, g(18, -16), -16, { name: 'Oasis Palm' }),
    ];

    return {
      schemaVersion: WORLD_SCHEMA_VERSION,
      id,
      title: customTitle || 'Canyon Ridge Rally',
      description: 'High-speed terracotta desert course looping past an oasis lake with launch ramps and checkpoint gates.',
      category: 'Racing',
      thumbnail: DEMO_THUMBNAILS.racing,
      template: 'racing',
      status: 'draft',
      publishedVersion: 0,
      createdAt: now,
      updatedAt: now,
      activeCreationSeconds: 300,
      studioTier: 'Creator Studio',
      terrain,
      objects,
      environment: {
        skyColor: '#4c94c8',
        horizonColor: '#e7b57d',
        fogEnabled: true,
        fogDensity: 0.007,
        ambientIntensity: 0.7,
        sunIntensity: 1.6,
        sunElevation: 52,
        sunAzimuth: 115,
        timeOfDay: 'day',
        weather: 'clear',
        worldBoundary: 42,
      },
      gameplay: {
        maxPlayers: 8,
        teamsEnabled: false,
        teamNames: ['Racers'],
        playerHealth: 100,
        startingInventory: [],
        respawnTime: 2,
        matchDuration: 150,
        scoreLimit: 100,
        winCondition: 'reach_checkpoint',
        gravity: 24,
        jumpForce: 9.5,
        moveSpeed: 12.5,
      },
      logicGraph: { nodes: [], edges: [] },
      character: {
        archetype: 'human',
        bodyScale: 1,
        primaryColor: '#d97706',
        secondaryColor: '#334155',
        visorColor: '#fbbf24',
        equipment: 'none',
        idleAnimation: 'breathing',
      },
      customUI: {
        hudAccent: '#f59e0b',
        showHealthBar: false,
        showScore: true,
        showTimer: true,
        showInventory: false,
        showMinimap: true,
        showCrosshair: false,
        objectiveBanner: 'Sprint through the Canyon Gates to the Finish Arch',
      },
      cinematics: [],
      audio: { masterVolume: 0.5, sfxEnabled: true, ambientMood: 'wind' },
      multiplayer: {
        mode: 'local_demo',
        sessionVisibility: 'public',
        collaborationChannel: 'gameplay',
        inviteCode: defaultInviteCode(),
        maxPlayers: 8,
        members: [{ id: 'm_owner', username: 'AlexForge (You)', role: 'Owner', status: 'local_host' }],
      },
    };
  }

  // Blank / Sandbox Open Valley
  let terrain = createTerrain(84, 84, 32, 32, 'meadow', true, -1.5);
  terrain = sculptPerimeterHills(terrain, 8, 5.2);
  terrain = applyTerrainBrush(terrain, {
    tool: 'stamp_lake',
    worldX: 12,
    worldZ: -8,
    radius: 10,
    strength: 2.3,
  });
  const g = (x: number, z: number) => groundHeightAt(terrain, x, z);

  const objects: GameObject[] = [
    makeObj('spawn_point', 0, g(0, 10), 10, { name: 'Valley Spawn' }),
    makeObj('house', -10, g(-10, -4), -4, { name: 'Timber Cottage', rotY: 0.45 }),
    makeObj('watchtower', 6, g(6, -16), -16, { name: 'Citadel Watchtower' }),
    makeObj('campfire', -4, g(-4, 2), 2, { name: 'Campfire' }),
    makeObj('crystal_spire', 16, g(16, -14), -14, { name: 'Aurora Crystal' }),
    makeObj('tree_pine', -16, g(-16, 4), 4, { name: 'Alpine Pine 1' }),
    makeObj('tree_pine', -14, g(-14, -12), -12, { name: 'Alpine Pine 2' }),
    makeObj('tree_oak', 12, g(12, 8), 8, { name: 'Meadow Oak' }),
    makeObj('rock', -8, g(-8, -14), -14, { name: 'Granite Boulder' }),
    makeObj('button_pad', -1, g(-1, 5), 5, { name: 'Welcome Switch' }),
  ];

  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    id,
    title: customTitle || (template === 'sandbox' ? 'Aurora Citadel Valley' : 'Untitled 3D World'),
    description:
      'An open sunlit alpine valley ready for terrain sculpting, building placement, visual logic, and multiplayer rules.',
    category: 'Sandbox',
    thumbnail: DEMO_THUMBNAILS.sandbox,
    template,
    status: 'draft',
    publishedVersion: 0,
    createdAt: now,
    updatedAt: now,
    activeCreationSeconds: 180,
    studioTier: 'Creator Studio',
    terrain,
    objects,
    environment: {
      skyColor: '#17253a',
      horizonColor: '#486985',
      fogEnabled: true,
      fogDensity: 0.0085,
      ambientIntensity: 0.65,
      sunIntensity: 1.35,
      sunElevation: 36,
      sunAzimuth: 140,
      timeOfDay: 'dawn',
      weather: 'clear',
      worldBoundary: 38,
    },
    gameplay: {
      maxPlayers: 16,
      teamsEnabled: false,
      teamNames: ['Explorers'],
      playerHealth: 100,
      startingInventory: [],
      respawnTime: 3,
      matchDuration: 600,
      scoreLimit: 100,
      winCondition: 'free_play',
      gravity: 24,
      jumpForce: 9.8,
      moveSpeed: 8.2,
    },
    logicGraph: {
      nodes: [
        {
          id: 'sb_btn',
          category: 'event',
          type: 'button_pressed',
          label: 'Button Pressed: Welcome Switch',
          position: { x: 60, y: 80 },
          params: { targetName: 'Welcome Switch' },
        },
        {
          id: 'sb_msg',
          category: 'action',
          type: 'display_notification',
          label: 'Display Welcome Message',
          position: { x: 360, y: 80 },
          params: { message: 'Welcome to your custom WORLD FORGE sandbox!' },
        },
      ],
      edges: [{ id: 'sbe1', fromNodeId: 'sb_btn', toNodeId: 'sb_msg', branch: 'default' }],
    },
    character: {
      archetype: 'fantasy',
      bodyScale: 1,
      primaryColor: '#3b82f6',
      secondaryColor: '#f59e0b',
      visorColor: '#fef08a',
      equipment: 'cape',
      idleAnimation: 'breathing',
    },
    customUI: {
      hudAccent: '#14b8a6',
      showHealthBar: true,
      showScore: true,
      showTimer: false,
      showInventory: true,
      showMinimap: true,
      showCrosshair: true,
      objectiveBanner: 'Explore the valley or press E at the Welcome Switch',
    },
    cinematics: [],
    audio: { masterVolume: 0.45, sfxEnabled: true, ambientMood: 'wind' },
    multiplayer: {
      mode: 'local_demo',
      sessionVisibility: 'private',
      collaborationChannel: 'editing',
      inviteCode: defaultInviteCode(),
      maxPlayers: 16,
      members: [{ id: 'm_owner', username: 'AlexForge (You)', role: 'Owner', status: 'local_host' }],
    },
  };
}

export function createSeedPublishedGames(): PublishedGame[] {
  const parkourProj = createProjectFromTemplate('parkour', 'Skyline Parkour Trials');
  const tdmProj = createProjectFromTemplate('tdm', 'Outpost Canyon TDM');
  const racingProj = createProjectFromTemplate('racing', 'Canyon Ridge Rally');
  const sandboxProj = createProjectFromTemplate('sandbox', 'Aurora Citadel Haven');

  return [
    {
      id: 'demo_skyline_parkour',
      sourceProjectId: parkourProj.id,
      version: 3,
      title: 'Skyline Parkour Trials',
      description:
        'Scale floating stone sky-islands, collect the Gold Key, trigger the visual-logic Vault Door, and reach the Summit Beacon.',
      category: 'Parkour',
      creatorName: 'KestrelWorks',
      creatorAvatar: '#f59e0b',
      thumbnail: DEMO_THUMBNAILS.parkour,
      isDemoContent: true,
      visibility: 'public',
      publishedAt: '2026-10-18T14:00:00.000Z',
      updatedAt: '2026-11-12T09:30:00.000Z',
      visits: 42810,
      activePlayers: 184,
      avgPlaytimeMinutes: 14,
      likes: 3120,
      rating: 4.9,
      worldSnapshot: parkourProj,
    },
    {
      id: 'demo_outpost_tdm',
      sourceProjectId: tdmProj.id,
      version: 2,
      title: 'Outpost Canyon TDM',
      description:
        'Red vs. Teal fortified towers facing across a sunset canyon. Secure central supply crates and hold the high ground.',
      category: 'FPS',
      creatorName: 'VanguardPoly',
      creatorAvatar: '#ef4444',
      thumbnail: DEMO_THUMBNAILS.tdm,
      isDemoContent: true,
      visibility: 'public',
      publishedAt: '2026-10-24T11:20:00.000Z',
      updatedAt: '2026-11-18T16:45:00.000Z',
      visits: 68450,
      activePlayers: 312,
      avgPlaytimeMinutes: 22,
      likes: 5490,
      rating: 4.8,
      worldSnapshot: tdmProj,
    },
    {
      id: 'demo_canyon_rally',
      sourceProjectId: racingProj.id,
      version: 4,
      title: 'Canyon Ridge Rally',
      description:
        'Sprint along desert ridge trails past sandstone mesas and oasis waters. Built completely with visual checkpoints and ramps.',
      category: 'Racing',
      creatorName: 'ForgeMotors',
      creatorAvatar: '#d97706',
      thumbnail: DEMO_THUMBNAILS.racing,
      isDemoContent: true,
      visibility: 'public',
      publishedAt: '2026-11-01T08:15:00.000Z',
      updatedAt: '2026-11-19T13:10:00.000Z',
      visits: 29140,
      activePlayers: 96,
      avgPlaytimeMinutes: 11,
      likes: 2180,
      rating: 4.7,
      worldSnapshot: racingProj,
    },
    {
      id: 'demo_aurora_citadel',
      sourceProjectId: sandboxProj.id,
      version: 1,
      title: 'Aurora Citadel Haven',
      description:
        'An atmospheric alpine settlement beneath twilight aurora skies. Explore timber cottages, lake shores, and crystal monoliths.',
      category: 'Sandbox',
      creatorName: 'NordicPoly',
      creatorAvatar: '#14b8a6',
      thumbnail: DEMO_THUMBNAILS.sandbox,
      isDemoContent: true,
      visibility: 'public',
      publishedAt: '2026-11-08T19:00:00.000Z',
      updatedAt: '2026-11-20T10:05:00.000Z',
      visits: 19320,
      activePlayers: 74,
      avgPlaytimeMinutes: 19,
      likes: 1740,
      rating: 4.9,
      worldSnapshot: sandboxProj,
    },
  ];
}

export function createDefaultProfile(): CreatorProfile {
  return {
    username: 'AlexForge',
    handle: '@alexforge',
    bio: 'Building zero-code 3D parkour arenas, alpine worlds, and interactive visual-logic puzzles in WORLD FORGE.',
    avatarColor: '#f59e0b',
    isLocalDemoAccount: true,
    level: 7,
    followers: 142,
    following: ['KestrelWorks', 'NordicPoly'],
    activeBuildSeconds: 4860,
    idleSeconds: 740,
    achievements: [
      {
        id: 'ach_first_world',
        title: 'World Architect',
        description: 'Created your first 3D world project.',
        unlocked: true,
      },
      {
        id: 'ach_logic_weaver',
        title: 'Logic Weaver',
        description: 'Connected an Event-Condition-Action visual graph.',
        unlocked: true,
      },
      {
        id: 'ach_publisher',
        title: 'Live Publisher',
        description: 'Published a validated world snapshot to Discover.',
        unlocked: false,
      },
      {
        id: 'ach_terrain',
        title: 'Earth Shaper',
        description: 'Sculpted terrain hills, lakes, or mountains in 3D.',
        unlocked: false,
      },
    ],
  };
}

export function createSeedUniverses(published: PublishedGame[]): Universe[] {
  return [
    {
      id: 'univ_aether',
      name: 'Aether Reach Universe',
      description:
        'An interconnected frontier linking sky-island parkour trials with the alpine citadel valley via opt-in portals.',
      creatorName: 'KestrelWorks',
      worldIds: published.slice(0, 2).map((g) => g.id),
      sharedProgressionOptIn: true,
      portalLinks: [
        {
          fromWorldId: published[0]?.id || '',
          toWorldId: published[3]?.id || '',
          label: 'Summit Portal -> Aurora Citadel',
        },
      ],
      createdAt: '2026-11-02T12:00:00.000Z',
    },
  ];
}
