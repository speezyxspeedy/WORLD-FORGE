import type { GameObject, GameplayConfig, TerrainData, Vec3 } from '../types/world';
import { groundHeightAt } from '../editor/terrain/terrainMath';

export interface PlayerPhysicsState {
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  pitch: number;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  squashY: number;
  walkDistance: number;
}

export interface PlayerInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jumpJustPressed: boolean;
  jumpHeld: boolean;
  sprint: boolean;
}

export interface ObjectBounds {
  id: string;
  name: string;
  assetType: GameObject['assetType'];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  collidable: boolean;
  isTrigger: boolean;
}

const ASSET_BASE_DIMENSIONS: Partial<Record<GameObject['assetType'], [number, number, number]>> = {
  cube: [2, 2, 2],
  wall: [6, 3.6, 0.7],
  floor: [6, 0.4, 6],
  ramp: [4, 2, 6],
  platform: [5, 0.8, 5],
  house: [5.5, 4.6, 5.5],
  watchtower: [3.6, 7.5, 3.6],
  road: [5, 0.14, 10],
  bridge: [4.5, 0.5, 10],
  door_gate: [4.4, 4.0, 0.8],
  barrier: [3.2, 1.3, 0.9],
  tree_pine: [1.4, 5.2, 1.4],
  tree_oak: [1.8, 4.8, 1.8],
  rock: [2.4, 1.8, 2.4],
  checkpoint: [3.8, 3.8, 1.2],
  spawn_point: [2.4, 0.2, 2.4],
  trigger_zone: [4.2, 3.2, 4.2],
  damage_zone: [4.2, 0.5, 4.2],
  safe_zone: [5.2, 0.4, 5.2],
  button_pad: [1.2, 1.4, 1.2],
  key_item: [1.2, 1.2, 1.2],
  medkit: [1.2, 0.9, 1.2],
  weapon_crate: [1.8, 1.1, 1.2],
  vehicle_rover: [2.8, 1.9, 4.6],
  vehicle_speeder: [2.4, 1.3, 4.4],
  crystal_spire: [1.6, 4.2, 1.6],
  lamp_post: [0.8, 4.2, 0.8],
  crate_stack: [2.2, 2.0, 2.2],
  campfire: [1.5, 0.8, 1.5],
  npc_guard: [1.1, 2.1, 1.1],
};

export function getObjectBounds(obj: GameObject, isDoorOpen = false): ObjectBounds {
  const [bw, bh, bd] = ASSET_BASE_DIMENSIONS[obj.assetType] || [2, 2, 2];
  const sx = Math.abs(obj.transform.scale.x);
  const sy = Math.abs(obj.transform.scale.y);
  const sz = Math.abs(obj.transform.scale.z);
  const rotY = Math.abs(obj.transform.rotation.y % Math.PI);
  const swapped = rotY > Math.PI / 4 && rotY < (3 * Math.PI) / 4;
  const hw = ((swapped ? bd * sz : bw * sx) / 2);
  const hd = ((swapped ? bw * sx : bd * sz) / 2);
  const height = bh * sy;

  const collidable =
    obj.visible &&
    obj.physics.collidable &&
    !obj.physics.isTrigger &&
    !(obj.assetType === 'door_gate' && isDoorOpen);

  return {
    id: obj.id,
    name: obj.name,
    assetType: obj.assetType,
    minX: obj.transform.position.x - hw,
    maxX: obj.transform.position.x + hw,
    minY: obj.transform.position.y,
    maxY: obj.transform.position.y + height,
    minZ: obj.transform.position.z - hd,
    maxZ: obj.transform.position.z + hd,
    collidable,
    isTrigger:
      obj.physics.isTrigger ||
      obj.assetType === 'trigger_zone' ||
      obj.assetType === 'checkpoint' ||
      obj.assetType === 'damage_zone' ||
      obj.assetType === 'safe_zone' ||
      obj.assetType === 'key_item' ||
      obj.assetType === 'medkit' ||
      obj.assetType === 'weapon_crate',
  };
}

export function createInitialPlayerState(
  objects: GameObject[],
  terrain: TerrainData
): PlayerPhysicsState {
  const spawn = objects.find((o) => o.assetType === 'spawn_point');
  const x = spawn ? spawn.transform.position.x : 0;
  const z = spawn ? spawn.transform.position.z : 12;
  const baseY = spawn ? spawn.transform.position.y + 0.35 : groundHeightAt(terrain, x, z) + 0.1;

  return {
    position: { x, y: baseY, z },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: spawn ? spawn.transform.rotation.y : 0,
    pitch: -0.08,
    grounded: true,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    squashY: 1,
    walkDistance: 0,
  };
}

export interface StepPhysicsResult {
  player: PlayerPhysicsState;
  justJumped: boolean;
  justLanded: boolean;
  enteredTriggers: GameObject[];
  inDamageZone: boolean;
  inSafeZone: boolean;
}

/**
 * Advances playtest character physics by a clamped dt (<= 0.05s) with
 * coyote time, jump buffering, variable jump cut, terrain grounding, and AABB solid collisions.
 */
export function stepPlayerPhysics(
  state: PlayerPhysicsState,
  input: PlayerInputState,
  terrain: TerrainData,
  objects: GameObject[],
  doorsOpen: Record<string, boolean>,
  gameplay: GameplayConfig,
  worldBoundary: number,
  rawDt: number
): StepPhysicsResult {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
  const next: PlayerPhysicsState = {
    ...state,
    position: { ...state.position },
    velocity: { ...state.velocity },
  };

  const playerRadius = 0.45;
  const playerHeight = 1.8;

  // Input timers
  if (input.jumpJustPressed) {
    next.jumpBufferTimer = 0.12;
  } else {
    next.jumpBufferTimer = Math.max(0, next.jumpBufferTimer - dt);
  }

  if (next.grounded) {
    next.coyoteTimer = 0.1;
  } else {
    next.coyoteTimer = Math.max(0, next.coyoteTimer - dt);
  }

  // Movement vector relative to yaw (yaw = 0 faces -Z)
  const moveZ = (input.forward ? -1 : 0) + (input.backward ? 1 : 0);
  const moveX = (input.right ? 1 : 0) + (input.left ? -1 : 0);
  const speed = gameplay.moveSpeed * (input.sprint ? 1.45 : 1.0);

  let wishX = 0;
  let wishZ = 0;
  if (moveX !== 0 || moveZ !== 0) {
    const len = Math.hypot(moveX, moveZ);
    const nx = moveX / len;
    const nz = moveZ / len;
    const cos = Math.cos(next.yaw);
    const sin = Math.sin(next.yaw);
    wishX = (nx * cos + nz * sin) * speed;
    wishZ = (-nx * sin + nz * cos) * speed;
  }

  const accel = next.grounded ? 14 : 6;
  const blend = 1 - Math.exp(-accel * dt);
  next.velocity.x += (wishX - next.velocity.x) * blend;
  next.velocity.z += (wishZ - next.velocity.z) * blend;

  // Jump with coyote + buffer
  let justJumped = false;
  if (next.jumpBufferTimer > 0 && next.coyoteTimer > 0) {
    next.velocity.y = gameplay.jumpForce;
    next.grounded = false;
    next.coyoteTimer = 0;
    next.jumpBufferTimer = 0;
    next.squashY = 1.18;
    justJumped = true;
  }

  // Variable jump height cut
  if (!input.jumpHeld && next.velocity.y > gameplay.jumpForce * 0.45) {
    next.velocity.y *= 0.6;
  }

  // Gravity
  next.velocity.y -= gameplay.gravity * dt;

  const boundsList = objects.map((obj) => ({
    obj,
    bounds: getObjectBounds(obj, Boolean(doorsOpen[obj.name])),
  }));

  // Integrate X/Z and resolve horizontal collisions
  const prevX = next.position.x;
  const prevZ = next.position.z;
  next.position.x += next.velocity.x * dt;
  next.position.z += next.velocity.z * dt;

  // Clamp to world boundary
  const limit = Math.max(12, worldBoundary - 1);
  next.position.x = Math.max(-limit, Math.min(limit, next.position.x));
  next.position.z = Math.max(-limit, Math.min(limit, next.position.z));

  for (const { bounds } of boundsList) {
    if (!bounds.collidable) continue;
    // Only collide horizontally if player body overlaps vertical span (allow stepping up 0.55m)
    if (next.position.y + 0.55 >= bounds.maxY || next.position.y + playerHeight <= bounds.minY) {
      continue;
    }
    const closestX = Math.max(bounds.minX, Math.min(next.position.x, bounds.maxX));
    const closestZ = Math.max(bounds.minZ, Math.min(next.position.z, bounds.maxZ));
    const dx = next.position.x - closestX;
    const dz = next.position.z - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < playerRadius * playerRadius) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const push = playerRadius - dist;
        next.position.x += (dx / dist) * push;
        next.position.z += (dz / dist) * push;
      } else {
        next.position.x = prevX;
        next.position.z = prevZ;
      }
    }
  }

  // Track ground support (terrain + platforms/floors/ramps/bridges/cubes)
  let supportY = groundHeightAt(terrain, next.position.x, next.position.z);

  for (const { obj, bounds } of boundsList) {
    if (!bounds.collidable) continue;
    if (
      next.position.x + playerRadius > bounds.minX &&
      next.position.x - playerRadius < bounds.maxX &&
      next.position.z + playerRadius > bounds.minZ &&
      next.position.z - playerRadius < bounds.maxZ
    ) {
      let topY = bounds.maxY;
      // Ramp slope support
      if (obj.assetType === 'ramp') {
        const spanZ = Math.max(0.1, bounds.maxZ - bounds.minZ);
        const t = Math.max(0, Math.min(1, (bounds.maxZ - next.position.z) / spanZ));
        topY = bounds.minY + t * (bounds.maxY - bounds.minY);
      }
      if (state.position.y >= topY - 0.85) {
        supportY = Math.max(supportY, topY);
      }
    }
  }

  // Integrate Y
  const wasGrounded = state.grounded;
  next.position.y += next.velocity.y * dt;

  let justLanded = false;
  if (next.position.y <= supportY) {
    next.position.y = supportY;
    if (!wasGrounded && next.velocity.y < -3.5) {
      justLanded = true;
      next.squashY = 0.8;
    }
    next.velocity.y = 0;
    next.grounded = true;
  } else {
    next.grounded = false;
  }

  // Smooth squash-and-stretch recovery
  next.squashY += (1 - next.squashY) * (1 - Math.exp(-12 * dt));

  // Track distance walked for animation gait sync
  if (next.grounded) {
    next.walkDistance += Math.hypot(next.position.x - prevX, next.position.z - prevZ);
  }

  // Check triggers, pickups, checkpoints, damage/safe zones
  const enteredTriggers: GameObject[] = [];
  let inDamageZone = false;
  let inSafeZone = false;

  for (const { obj, bounds } of boundsList) {
    if (!obj.visible || !bounds.isTrigger) continue;
    const pad = 0.6;
    const overlaps =
      next.position.x >= bounds.minX - pad &&
      next.position.x <= bounds.maxX + pad &&
      next.position.z >= bounds.minZ - pad &&
      next.position.z <= bounds.maxZ + pad &&
      next.position.y + playerHeight >= bounds.minY - 0.5 &&
      next.position.y <= bounds.maxY + 1.0;

    if (overlaps) {
      enteredTriggers.push(obj);
      if (obj.assetType === 'damage_zone') inDamageZone = true;
      if (obj.assetType === 'safe_zone') inSafeZone = true;
    }
  }

  return {
    player: next,
    justJumped,
    justLanded,
    enteredTriggers,
    inDamageZone,
    inSafeZone,
  };
}

export function checkWinCondition(
  gameplay: GameplayConfig,
  score: number,
  timeRemaining: number,
  reachedGoal: boolean
): 'victory' | 'defeat' | null {
  switch (gameplay.winCondition) {
    case 'reach_score':
      if (score >= gameplay.scoreLimit) return 'victory';
      if (timeRemaining <= 0) return 'defeat';
      return null;
    case 'reach_checkpoint':
      if (reachedGoal) return 'victory';
      if (timeRemaining <= 0) return 'defeat';
      return null;
    case 'survive_timer':
      if (timeRemaining <= 0) return 'victory';
      return null;
    case 'eliminate_targets':
      if (score >= gameplay.scoreLimit) return 'victory';
      return null;
    case 'free_play':
    default:
      return null;
  }
}
