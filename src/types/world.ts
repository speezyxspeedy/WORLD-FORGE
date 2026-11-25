export const WORLD_SCHEMA_VERSION = '1.2.0';

export type GameCategory =
  | 'Parkour'
  | 'FPS'
  | 'Battle Royale'
  | 'Racing'
  | 'Horror'
  | 'Survival'
  | 'Roleplay'
  | 'Simulation'
  | 'Adventure'
  | 'Strategy'
  | 'Sandbox'
  | 'Experimental';

export const GAME_CATEGORIES: GameCategory[] = [
  'Parkour',
  'FPS',
  'Battle Royale',
  'Racing',
  'Horror',
  'Survival',
  'Roleplay',
  'Simulation',
  'Adventure',
  'Strategy',
  'Sandbox',
  'Experimental',
];

export type StudioTier = 'Creator Studio' | 'Advanced Studio' | 'Pro Studio' | 'AAA Studio';
export type QualityPreset = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'CUSTOM';
export type ProjectStatus = 'draft' | 'published' | 'unpublished';
export type TemplateType = 'blank' | 'parkour' | 'tdm' | 'racing' | 'sandbox';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vec3;
  rotation: Vec3; // radians
  scale: Vec3;
}

export type MaterialPreset =
  | 'matte'
  | 'stone'
  | 'wood'
  | 'metal'
  | 'glass'
  | 'emissive'
  | 'plastic';

export interface MaterialConfig {
  color: string;
  roughness: number;
  metalness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  preset: MaterialPreset;
}

export interface PhysicsBodyConfig {
  collidable: boolean;
  isStatic: boolean;
  mass: number;
  friction: number;
  bounce: number;
  isTrigger: boolean;
}

export type AssetCategory =
  | 'Environment'
  | 'Buildings'
  | 'Nature'
  | 'Vehicles'
  | 'Weapons'
  | 'Props'
  | 'Obstacles'
  | 'Decorations';

export type AssetType =
  | 'cube'
  | 'wall'
  | 'floor'
  | 'ramp'
  | 'platform'
  | 'tree_pine'
  | 'tree_oak'
  | 'rock'
  | 'house'
  | 'watchtower'
  | 'road'
  | 'bridge'
  | 'door_gate'
  | 'barrier'
  | 'checkpoint'
  | 'spawn_point'
  | 'trigger_zone'
  | 'damage_zone'
  | 'safe_zone'
  | 'button_pad'
  | 'key_item'
  | 'medkit'
  | 'weapon_crate'
  | 'vehicle_rover'
  | 'vehicle_speeder'
  | 'crystal_spire'
  | 'lamp_post'
  | 'crate_stack'
  | 'campfire'
  | 'npc_guard'
  | 'custom_character'
  | 'imported_model';

export interface GameObject {
  id: string;
  name: string;
  assetType: AssetType;
  category: AssetCategory;
  transform: Transform;
  material: MaterialConfig;
  physics: PhysicsBodyConfig;
  locked: boolean;
  visible: boolean;
  tags: string[];
  /** Optional gameplay metadata (e.g., team, itemName, characterId, importedModelId) */
  metadata?: Record<string, string | number | boolean>;
}

export interface TerrainData {
  width: number;
  depth: number;
  segmentsX: number;
  segmentsZ: number;
  /** Length = (segmentsX + 1) * (segmentsZ + 1) */
  heights: number[];
  /** Per-vertex hex colors */
  colors: string[];
  waterEnabled: boolean;
  waterLevel: number;
  groundPreset: 'meadow' | 'desert' | 'alpine' | 'obsidian' | 'sky';
}

export interface EnvironmentConfig {
  skyColor: string;
  horizonColor: string;
  fogEnabled: boolean;
  fogDensity: number;
  ambientIntensity: number;
  sunIntensity: number;
  sunElevation: number; // degrees 5 - 85
  sunAzimuth: number; // degrees 0 - 360
  timeOfDay: 'dawn' | 'day' | 'sunset' | 'night';
  weather: 'clear' | 'rain' | 'snow';
  worldBoundary: number; // half-extent in meters
}

export type WinCondition =
  | 'reach_score'
  | 'reach_checkpoint'
  | 'survive_timer'
  | 'eliminate_targets'
  | 'free_play';

export interface GameplayConfig {
  maxPlayers: number;
  teamsEnabled: boolean;
  teamNames: string[];
  playerHealth: number;
  startingInventory: string[];
  respawnTime: number;
  matchDuration: number; // seconds
  scoreLimit: number;
  winCondition: WinCondition;
  gravity: number;
  jumpForce: number;
  moveSpeed: number;
}

export type LogicNodeCategory = 'event' | 'condition' | 'action';

export type EventNodeType =
  | 'player_joins'
  | 'player_leaves'
  | 'player_enters_area'
  | 'player_exits_area'
  | 'player_dies'
  | 'timer_starts'
  | 'object_touched'
  | 'button_pressed';

export type ConditionNodeType =
  | 'player_health'
  | 'player_score'
  | 'player_team'
  | 'has_item'
  | 'distance_check'
  | 'and'
  | 'or'
  | 'not'
  | 'comparison';

export type ActionNodeType =
  | 'open_door'
  | 'close_door'
  | 'teleport_player'
  | 'give_item'
  | 'remove_item'
  | 'add_score'
  | 'change_health'
  | 'spawn_object'
  | 'display_notification'
  | 'start_timer'
  | 'end_match';

export type LogicNodeType = EventNodeType | ConditionNodeType | ActionNodeType;

export interface LogicNode {
  id: string;
  category: LogicNodeCategory;
  type: LogicNodeType;
  label: string;
  position: { x: number; y: number };
  params: Record<string, string | number | boolean>;
}

export interface LogicEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  branch: 'default' | 'true' | 'false';
}

export interface LogicGraph {
  nodes: LogicNode[];
  edges: LogicEdge[];
}

export interface CharacterConfig {
  archetype: 'human' | 'scifi' | 'fantasy' | 'robot' | 'creature';
  bodyScale: number;
  shoulderScale?: number;
  primaryColor: string;
  secondaryColor: string;
  visorColor: string;
  equipment: 'none' | 'jetpack' | 'shield' | 'cape' | 'crown';
  idleAnimation: 'breathing' | 'combat_ready' | 'hover';
}

export interface SavedCharacterAsset {
  id: string;
  name: string;
  createdAt: string;
  config: CharacterConfig;
}

export interface ObjectAnimationKeyframe {
  id: string;
  time: number; // seconds
  position: Vec3;
  rotation: Vec3; // radians
  scale: Vec3;
}

export interface AnimationClip {
  id: string;
  name: string;
  targetObjectId: string;
  duration: number;
  loop: boolean;
  autoplayInPlaytest: boolean;
  keyframes: ObjectAnimationKeyframe[];
}

export interface ImportedModelAsset {
  id: string;
  name: string;
  fileName: string;
  format: 'glb' | 'gltf';
  /** Base64 data URL persisted locally for small models, or session blob URL */
  dataUrl: string;
  sizeBytes: number;
  importedAt: string;
}

export interface ProjectVersionSnapshot {
  id: string;
  label: string;
  createdAt: string;
  objectCount: number;
  nodeCount: number;
  snapshotJson: string;
}

export interface CustomUIConfig {
  hudAccent: string;
  showHealthBar: boolean;
  showScore: boolean;
  showTimer: boolean;
  showInventory: boolean;
  showMinimap: boolean;
  showCrosshair: boolean;
  objectiveBanner: string;
  showScoreboard?: boolean;
  showDialogueBox?: boolean;
  dialogueSpeaker?: string;
  dialogueText?: string;
  menuTitle?: string;
}

export interface CinematicKeyframe {
  id: string;
  time: number; // seconds
  position: Vec3;
  lookAt: Vec3;
  caption: string;
}

export interface AudioConfig {
  masterVolume: number;
  sfxEnabled: boolean;
  ambientMood: 'none' | 'wind' | 'synth_pad' | 'arena_pulse';
}

export type CollaboratorRole = 'Owner' | 'Editor' | 'Tester' | 'Viewer';

export interface CollaboratorMember {
  id: string;
  username: string;
  role: CollaboratorRole;
  status: 'local_host' | 'offline_demo';
}

export interface MultiplayerConfig {
  mode: 'local_demo' | 'backend_unconfigured';
  sessionVisibility: 'public' | 'private';
  collaborationChannel: 'editing' | 'gameplay';
  inviteCode: string;
  maxPlayers: number;
  members: CollaboratorMember[];
}

export interface WorldProject {
  schemaVersion: string;
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  thumbnail: string;
  template: TemplateType;
  status: ProjectStatus;
  publishedGameId?: string;
  publishedVersion: number;
  createdAt: string;
  updatedAt: string;
  activeCreationSeconds: number;
  studioTier: StudioTier;
  universeId?: string;
  terrain: TerrainData;
  objects: GameObject[];
  environment: EnvironmentConfig;
  gameplay: GameplayConfig;
  logicGraph: LogicGraph;
  character: CharacterConfig;
  customUI: CustomUIConfig;
  cinematics: CinematicKeyframe[];
  animationClips?: AnimationClip[];
  importedModels?: ImportedModelAsset[];
  versionHistory?: ProjectVersionSnapshot[];
  audio: AudioConfig;
  multiplayer: MultiplayerConfig;
}

export interface PublishedGame {
  id: string;
  sourceProjectId: string;
  version: number;
  title: string;
  description: string;
  category: GameCategory;
  creatorName: string;
  creatorAvatar: string;
  thumbnail: string;
  isDemoContent: boolean;
  visibility: 'public' | 'unlisted';
  playerMode?: 'singleplayer' | 'multiplayer';
  publishedAt: string;
  updatedAt: string;
  visits: number;
  activePlayers: number;
  avgPlaytimeMinutes: number;
  likes: number;
  likedByMe?: boolean;
  favoritedByMe?: boolean;
  rating: number;
  /** Immutable playable snapshot separate from editable draft */
  worldSnapshot: WorldProject;
}

export interface CommunityComment {
  id: string;
  gameId: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Universe {
  id: string;
  name: string;
  description: string;
  creatorName: string;
  worldIds: string[];
  sharedProgressionOptIn: boolean;
  portalLinks: Array<{ fromWorldId: string; toWorldId: string; label: string }>;
  createdAt: string;
}

export interface CreatorProfile {
  username: string;
  handle: string;
  bio: string;
  avatarColor: string;
  isLocalDemoAccount: boolean;
  level: number;
  followers: number;
  following: string[];
  recentlyPlayedIds?: string[];
  activeBuildSeconds: number;
  idleSeconds: number;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
  }>;
}

export interface GraphicsSettings {
  preset: QualityPreset;
  resolutionScale: number; // 0.5 - 1.5
  shadowsEnabled: boolean;
  fogEnabled: boolean;
  antialiasing: boolean;
  maxObjects: number;
  lodDistance: number;
}

export interface MarketplaceAsset {
  id: string;
  name: string;
  category: AssetCategory;
  assetType: AssetType;
  creator: string;
  license: 'CC0 Public Domain' | 'World Forge Standard' | 'Creator Attribution';
  priceLabel: 'Free' | 'Demo Pack';
  description: string;
  defaultColor: string;
  defaultScale: Vec3;
  downloads: number;
  rating: number;
}
