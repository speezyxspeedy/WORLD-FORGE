import type {
  CommunityComment,
  CreatorProfile,
  GraphicsSettings,
  PublishedGame,
  SavedCharacterAsset,
  StudioTier,
  Universe,
  WorldProject,
} from '../types/world';
import {
  createDefaultProfile,
  createProjectFromTemplate,
  createSeedPublishedGames,
  createSeedUniverses,
} from '../world-format/templates';
import { detectHardwareProfile, getGraphicsPresetConfig } from '../services/hardwareDetect';

const DB_NAME = 'WorldForgeDB';
const DB_VERSION = 1;
const STORE_NAME = 'kv_store';

const KEYS = {
  PROJECTS: 'wf_projects_v1',
  PUBLISHED: 'wf_published_v1',
  PROFILE: 'wf_profile_v1',
  COMMENTS: 'wf_comments_v1',
  UNIVERSES: 'wf_universes_v1',
  SETTINGS: 'wf_graphics_v1',
  STUDIO_TIER: 'wf_studio_tier_v1',
  CHARACTERS: 'wf_characters_v1',
};

function createSeedCharacters(): SavedCharacterAsset[] {
  return [
    {
      id: 'char_explorer',
      name: 'Skyline Explorer',
      createdAt: '2026-11-15T10:00:00.000Z',
      config: {
        archetype: 'scifi',
        bodyScale: 1.0,
        shoulderScale: 1.0,
        primaryColor: '#f59e0b',
        secondaryColor: '#1e293b',
        visorColor: '#38bdf8',
        equipment: 'jetpack',
        idleAnimation: 'breathing',
      },
    },
    {
      id: 'char_knight',
      name: 'Citadel Vanguard',
      createdAt: '2026-11-16T10:00:00.000Z',
      config: {
        archetype: 'fantasy',
        bodyScale: 1.08,
        shoulderScale: 1.15,
        primaryColor: '#475569',
        secondaryColor: '#b45309',
        visorColor: '#fbbf24',
        equipment: 'shield',
        idleAnimation: 'combat_ready',
      },
    },
    {
      id: 'char_golem',
      name: 'Basalt Guardian',
      createdAt: '2026-11-17T10:00:00.000Z',
      config: {
        archetype: 'creature',
        bodyScale: 1.25,
        shoulderScale: 1.3,
        primaryColor: '#52525b',
        secondaryColor: '#27272a',
        visorColor: '#14b8a6',
        equipment: 'crown',
        idleAnimation: 'hover',
      },
    },
  ];
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or disabled
  }
}

export interface LoadedPlatformState {
  projects: WorldProject[];
  publishedGames: PublishedGame[];
  profile: CreatorProfile;
  comments: CommunityComment[];
  universes: Universe[];
  graphicsSettings: GraphicsSettings;
  studioTier: StudioTier;
  savedCharacters: SavedCharacterAsset[];
}

export async function loadPlatformState(): Promise<LoadedPlatformState> {
  let projects = await idbGet<WorldProject[]>(KEYS.PROJECTS);
  let publishedGames = await idbGet<PublishedGame[]>(KEYS.PUBLISHED);
  let profile = await idbGet<CreatorProfile>(KEYS.PROFILE);
  let comments = await idbGet<CommunityComment[]>(KEYS.COMMENTS);
  let universes = await idbGet<Universe[]>(KEYS.UNIVERSES);
  let graphicsSettings = await idbGet<GraphicsSettings>(KEYS.SETTINGS);
  let studioTier = await idbGet<StudioTier>(KEYS.STUDIO_TIER);
  let savedCharacters = await idbGet<SavedCharacterAsset[]>(KEYS.CHARACTERS);

  if (!projects || projects.length === 0) {
    projects = [
      createProjectFromTemplate('parkour', 'My Skyline Parkour'),
      createProjectFromTemplate('tdm', 'Outpost Arena Prototype'),
    ];
    await idbSet(KEYS.PROJECTS, projects);
  }

  if (!publishedGames || publishedGames.length === 0) {
    publishedGames = createSeedPublishedGames();
    await idbSet(KEYS.PUBLISHED, publishedGames);
  }

  if (!profile) {
    profile = createDefaultProfile();
    await idbSet(KEYS.PROFILE, profile);
  }

  if (!comments) {
    comments = [
      {
        id: 'cmt_1',
        gameId: 'demo_skyline_parkour',
        author: 'MayaVoxel',
        text: 'The visual-logic locked Vault Door on the summit platform feels super rewarding to unlock!',
        createdAt: '2026-11-16T15:20:00.000Z',
      },
      {
        id: 'cmt_2',
        gameId: 'demo_outpost_tdm',
        author: 'RicoBuilds',
        text: 'Clean sightlines between both towers and runs smoothly on my laptop integrated GPU.',
        createdAt: '2026-11-19T11:45:00.000Z',
      },
    ];
    await idbSet(KEYS.COMMENTS, comments);
  }

  if (!universes) {
    universes = createSeedUniverses(publishedGames);
    await idbSet(KEYS.UNIVERSES, universes);
  }

  if (!graphicsSettings) {
    const hw = detectHardwareProfile();
    graphicsSettings = getGraphicsPresetConfig(hw.recommendedPreset);
    await idbSet(KEYS.SETTINGS, graphicsSettings);
  }

  if (!studioTier) {
    studioTier = 'Creator Studio';
    await idbSet(KEYS.STUDIO_TIER, studioTier);
  }

  if (!savedCharacters || savedCharacters.length === 0) {
    savedCharacters = createSeedCharacters();
    await idbSet(KEYS.CHARACTERS, savedCharacters);
  }

  return {
    projects,
    publishedGames,
    profile,
    comments,
    universes,
    graphicsSettings,
    studioTier,
    savedCharacters,
  };
}

export async function saveProjects(projects: WorldProject[]): Promise<void> {
  await idbSet(KEYS.PROJECTS, projects);
}

export async function savePublishedGames(games: PublishedGame[]): Promise<void> {
  await idbSet(KEYS.PUBLISHED, games);
}

export async function saveProfile(profile: CreatorProfile): Promise<void> {
  await idbSet(KEYS.PROFILE, profile);
}

export async function saveComments(comments: CommunityComment[]): Promise<void> {
  await idbSet(KEYS.COMMENTS, comments);
}

export async function saveUniverses(universes: Universe[]): Promise<void> {
  await idbSet(KEYS.UNIVERSES, universes);
}

export async function saveGraphicsSettings(settings: GraphicsSettings): Promise<void> {
  await idbSet(KEYS.SETTINGS, settings);
}

export async function saveStudioTier(tier: StudioTier): Promise<void> {
  await idbSet(KEYS.STUDIO_TIER, tier);
}

export async function saveCharacters(characters: SavedCharacterAsset[]): Promise<void> {
  await idbSet(KEYS.CHARACTERS, characters);
}

export async function resetAllLocalData(): Promise<LoadedPlatformState> {
  const projects = [
    createProjectFromTemplate('parkour', 'My Skyline Parkour'),
    createProjectFromTemplate('tdm', 'Outpost Arena Prototype'),
  ];
  const publishedGames = createSeedPublishedGames();
  const profile = createDefaultProfile();
  const comments: CommunityComment[] = [];
  const universes = createSeedUniverses(publishedGames);
  const hw = detectHardwareProfile();
  const graphicsSettings = getGraphicsPresetConfig(hw.recommendedPreset);
  const studioTier: StudioTier = 'Creator Studio';
  const savedCharacters = createSeedCharacters();

  await Promise.all([
    saveProjects(projects),
    savePublishedGames(publishedGames),
    saveProfile(profile),
    saveComments(comments),
    saveUniverses(universes),
    saveGraphicsSettings(graphicsSettings),
    saveStudioTier(studioTier),
    saveCharacters(savedCharacters),
  ]);

  return {
    projects,
    publishedGames,
    profile,
    comments,
    universes,
    graphicsSettings,
    studioTier,
    savedCharacters,
  };
}
