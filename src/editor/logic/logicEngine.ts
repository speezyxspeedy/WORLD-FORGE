import type {
  ActionNodeType,
  ConditionNodeType,
  EventNodeType,
  GameObject,
  LogicGraph,
  LogicNode,
} from '../../types/world';

export interface LogicValidationIssue {
  severity: 'error' | 'warning';
  nodeId?: string;
  message: string;
}

export interface LogicValidationResult {
  valid: boolean;
  issues: LogicValidationIssue[];
}

export interface RuntimePlayerState {
  health: number;
  maxHealth: number;
  score: number;
  team: string;
  inventory: string[];
  position: { x: number; y: number; z: number };
}

export interface RuntimeWorldState {
  player: RuntimePlayerState;
  doorsOpen: Record<string, boolean>;
  objects: GameObject[];
  notifications: string[];
  activeTimerSeconds: number | null;
  matchEnded: boolean;
  matchOutcome: 'victory' | 'defeat' | null;
  spawnedObjects: Array<{ assetType: string; x: number; y: number; z: number }>;
  executionLog: string[];
}

export interface TriggerEventContext {
  eventType: EventNodeType;
  targetObjectId?: string;
  targetObjectName?: string;
}

export interface NodeCatalogEntry {
  type: EventNodeType | ConditionNodeType | ActionNodeType;
  category: 'event' | 'condition' | 'action';
  label: string;
  description: string;
  defaultParams: Record<string, string | number | boolean>;
}

export const LOGIC_NODE_CATALOG: NodeCatalogEntry[] = [
  // EVENTS
  {
    type: 'player_joins',
    category: 'event',
    label: 'Player Joins',
    description: 'Fires when the player enters the world.',
    defaultParams: {},
  },
  {
    type: 'player_leaves',
    category: 'event',
    label: 'Player Leaves',
    description: 'Fires when a player exits the session.',
    defaultParams: {},
  },
  {
    type: 'player_enters_area',
    category: 'event',
    label: 'Player Enters Area',
    description: 'Fires when the player walks into a named Trigger Zone.',
    defaultParams: { targetName: 'Gate Trigger' },
  },
  {
    type: 'player_exits_area',
    category: 'event',
    label: 'Player Exits Area',
    description: 'Fires when the player leaves a Trigger Zone.',
    defaultParams: { targetName: 'Gate Trigger' },
  },
  {
    type: 'player_dies',
    category: 'event',
    label: 'Player Dies',
    description: 'Fires when player health reaches zero.',
    defaultParams: {},
  },
  {
    type: 'timer_starts',
    category: 'event',
    label: 'Timer Starts',
    description: 'Fires when a gameplay countdown begins.',
    defaultParams: { timerName: 'MatchTimer' },
  },
  {
    type: 'object_touched',
    category: 'event',
    label: 'Object Touched',
    description: 'Fires when player touches a pickup, checkpoint, or prop.',
    defaultParams: { targetName: 'Gold Key' },
  },
  {
    type: 'button_pressed',
    category: 'event',
    label: 'Button Pressed',
    description: 'Fires when player presses E near an interactive button.',
    defaultParams: { targetName: 'Bridge Switch' },
  },

  // CONDITIONS
  {
    type: 'has_item',
    category: 'condition',
    label: 'Has Item',
    description: 'Checks whether the player inventory contains an item.',
    defaultParams: { itemName: 'Gold Key' },
  },
  {
    type: 'player_health',
    category: 'condition',
    label: 'Player Health',
    description: 'Compares player health against a threshold.',
    defaultParams: { operator: '>=', value: 50 },
  },
  {
    type: 'player_score',
    category: 'condition',
    label: 'Player Score',
    description: 'Compares player score against a target value.',
    defaultParams: { operator: '>=', value: 100 },
  },
  {
    type: 'player_team',
    category: 'condition',
    label: 'Player Team',
    description: 'Checks whether player belongs to a specific team.',
    defaultParams: { teamName: 'Alpha' },
  },
  {
    type: 'distance_check',
    category: 'condition',
    label: 'Distance Check',
    description: 'Checks if player is within distance of a world object.',
    defaultParams: { targetName: 'Vault Door', maxDistance: 6 },
  },
  {
    type: 'comparison',
    category: 'condition',
    label: 'Value Comparison',
    description: 'Compares score or health dynamically.',
    defaultParams: { field: 'score', operator: '>=', value: 10 },
  },
  {
    type: 'and',
    category: 'condition',
    label: 'AND Gate',
    description: 'Passes when both item and score criteria are satisfied.',
    defaultParams: { itemName: 'Gold Key', minScore: 0 },
  },
  {
    type: 'or',
    category: 'condition',
    label: 'OR Gate',
    description: 'Passes when either item or minimum score is satisfied.',
    defaultParams: { itemName: 'Gold Key', minScore: 50 },
  },
  {
    type: 'not',
    category: 'condition',
    label: 'NOT Gate',
    description: 'Passes when player does NOT hold the specified item.',
    defaultParams: { itemName: 'Gold Key' },
  },

  // ACTIONS
  {
    type: 'open_door',
    category: 'action',
    label: 'Open Door',
    description: 'Opens a named Door Gate in the world.',
    defaultParams: { targetName: 'Vault Door' },
  },
  {
    type: 'close_door',
    category: 'action',
    label: 'Close Door',
    description: 'Closes a named Door Gate in the world.',
    defaultParams: { targetName: 'Vault Door' },
  },
  {
    type: 'teleport_player',
    category: 'action',
    label: 'Teleport Player',
    description: 'Moves the player to target X/Y/Z coordinates.',
    defaultParams: { x: 0, y: 2, z: 0 },
  },
  {
    type: 'give_item',
    category: 'action',
    label: 'Give Item',
    description: 'Adds an item into the player inventory.',
    defaultParams: { itemName: 'Gold Key' },
  },
  {
    type: 'remove_item',
    category: 'action',
    label: 'Remove Item',
    description: 'Removes an item from the player inventory.',
    defaultParams: { itemName: 'Gold Key' },
  },
  {
    type: 'add_score',
    category: 'action',
    label: 'Add Score',
    description: 'Increments the player score.',
    defaultParams: { amount: 25 },
  },
  {
    type: 'change_health',
    category: 'action',
    label: 'Change Health',
    description: 'Heals (+) or damages (-) player health.',
    defaultParams: { delta: 20 },
  },
  {
    type: 'spawn_object',
    category: 'action',
    label: 'Spawn Object',
    description: 'Spawns a prop or pickup at world coordinates.',
    defaultParams: { assetType: 'medkit', x: 0, y: 1, z: 4 },
  },
  {
    type: 'display_notification',
    category: 'action',
    label: 'Display Notification',
    description: 'Shows an on-screen HUD message to the player.',
    defaultParams: { message: 'Door is locked — find the Gold Key!' },
  },
  {
    type: 'start_timer',
    category: 'action',
    label: 'Start Timer',
    description: 'Starts or resets the gameplay countdown timer.',
    defaultParams: { seconds: 60 },
  },
  {
    type: 'end_match',
    category: 'action',
    label: 'End Match',
    description: 'Concludes the match with Victory or Defeat.',
    defaultParams: { outcome: 'victory', message: 'Course Complete!' },
  },
];

/**
 * Validates a LogicGraph deterministically: checks node integrity, dangling edges,
 * illegal category links (e.g. Action -> Event), and cycles.
 */
export function validateLogicGraph(graph: LogicGraph): LogicValidationResult {
  const issues: LogicValidationIssue[] = [];
  const nodeMap = new Map<string, LogicNode>();

  for (const node of graph.nodes) {
    if (nodeMap.has(node.id)) {
      issues.push({ severity: 'error', nodeId: node.id, message: `Duplicate node ID "${node.id}".` });
    }
    nodeMap.set(node.id, node);
  }

  for (const edge of graph.edges) {
    const from = nodeMap.get(edge.fromNodeId);
    const to = nodeMap.get(edge.toNodeId);
    if (!from || !to) {
      issues.push({
        severity: 'error',
        message: `Broken wire (${edge.id}) references a missing node.`,
      });
      continue;
    }
    if (edge.fromNodeId === edge.toNodeId) {
      issues.push({
        severity: 'error',
        nodeId: from.id,
        message: `Node "${from.label}" cannot connect to itself.`,
      });
    }
    if (to.category === 'event') {
      issues.push({
        severity: 'error',
        nodeId: to.id,
        message: `Event node "${to.label}" cannot have incoming connections.`,
      });
    }
    if (from.category === 'event' && edge.branch !== 'default') {
      issues.push({
        severity: 'warning',
        nodeId: from.id,
        message: `Event "${from.label}" should connect via its default output.`,
      });
    }
  }

  // Cycle detection using DFS
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) adj.set(node.id, []);
  for (const edge of graph.edges) {
    adj.get(edge.fromNodeId)?.push(edge.toNodeId);
  }

  const state = new Map<string, 0 | 1 | 2>(); // 0=unvisited, 1=visiting, 2=done
  const hasCycle = (id: string): boolean => {
    state.set(id, 1);
    for (const next of adj.get(id) || []) {
      const st = state.get(next) || 0;
      if (st === 1) return true;
      if (st === 0 && hasCycle(next)) return true;
    }
    state.set(id, 2);
    return false;
  };

  for (const node of graph.nodes) {
    if ((state.get(node.id) || 0) === 0) {
      if (hasCycle(node.id)) {
        issues.push({
          severity: 'error',
          nodeId: node.id,
          message: `Circular loop detected involving "${node.label}". Disconnect the loop to prevent infinite execution.`,
        });
        break;
      }
    }
  }

  // Warn about disconnected event nodes
  for (const node of graph.nodes) {
    if (node.category === 'event') {
      const outgoing = graph.edges.filter((e) => e.fromNodeId === node.id);
      if (outgoing.length === 0) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `Event "${node.label}" has no connected actions or conditions.`,
        });
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  return { valid: !hasErrors, issues };
}

function compareNumbers(actual: number, operator: string, target: number): boolean {
  switch (operator) {
    case '>':
      return actual > target;
    case '>=':
      return actual >= target;
    case '<':
      return actual < target;
    case '<=':
      return actual <= target;
    case '==':
      return actual === target;
    case '!=':
      return actual !== target;
    default:
      return actual >= target;
  }
}

function evaluateCondition(node: LogicNode, world: RuntimeWorldState): boolean {
  const p = node.params;
  switch (node.type as ConditionNodeType) {
    case 'has_item': {
      const itemName = String(p.itemName || '').trim().toLowerCase();
      return world.player.inventory.some((it) => it.toLowerCase() === itemName);
    }
    case 'player_health':
      return compareNumbers(world.player.health, String(p.operator || '>='), Number(p.value ?? 50));
    case 'player_score':
      return compareNumbers(world.player.score, String(p.operator || '>='), Number(p.value ?? 100));
    case 'player_team':
      return world.player.team.toLowerCase() === String(p.teamName || '').toLowerCase();
    case 'distance_check': {
      const targetName = String(p.targetName || '').toLowerCase();
      const obj = world.objects.find((o) => o.name.toLowerCase() === targetName);
      if (!obj) return false;
      const dx = world.player.position.x - obj.transform.position.x;
      const dy = world.player.position.y - obj.transform.position.y;
      const dz = world.player.position.z - obj.transform.position.z;
      return Math.hypot(dx, dy, dz) <= Number(p.maxDistance ?? 6);
    }
    case 'comparison': {
      const field = String(p.field || 'score');
      const actual = field === 'health' ? world.player.health : world.player.score;
      return compareNumbers(actual, String(p.operator || '>='), Number(p.value ?? 0));
    }
    case 'and': {
      const item = String(p.itemName || '').toLowerCase();
      const hasIt = !item || world.player.inventory.some((i) => i.toLowerCase() === item);
      const scoreOk = world.player.score >= Number(p.minScore ?? 0);
      return hasIt && scoreOk;
    }
    case 'or': {
      const item = String(p.itemName || '').toLowerCase();
      const hasIt = Boolean(item) && world.player.inventory.some((i) => i.toLowerCase() === item);
      const scoreOk = world.player.score >= Number(p.minScore ?? 50);
      return hasIt || scoreOk;
    }
    case 'not': {
      const item = String(p.itemName || '').toLowerCase();
      return !world.player.inventory.some((i) => i.toLowerCase() === item);
    }
    default:
      return false;
  }
}

function executeAction(node: LogicNode, world: RuntimeWorldState): void {
  const p = node.params;
  switch (node.type as ActionNodeType) {
    case 'open_door': {
      const targetName = String(p.targetName || 'Vault Door');
      world.doorsOpen[targetName] = true;
      world.executionLog.push(`Opened door "${targetName}"`);
      break;
    }
    case 'close_door': {
      const targetName = String(p.targetName || 'Vault Door');
      world.doorsOpen[targetName] = false;
      world.executionLog.push(`Closed door "${targetName}"`);
      break;
    }
    case 'teleport_player': {
      world.player.position = {
        x: Number(p.x ?? 0),
        y: Number(p.y ?? 2),
        z: Number(p.z ?? 0),
      };
      world.executionLog.push(
        `Teleported player to (${world.player.position.x}, ${world.player.position.y}, ${world.player.position.z})`
      );
      break;
    }
    case 'give_item': {
      const itemName = String(p.itemName || 'Gold Key').trim();
      if (itemName && !world.player.inventory.includes(itemName)) {
        world.player.inventory.push(itemName);
        world.executionLog.push(`Gave item "${itemName}"`);
      }
      break;
    }
    case 'remove_item': {
      const itemName = String(p.itemName || '').trim().toLowerCase();
      world.player.inventory = world.player.inventory.filter((i) => i.toLowerCase() !== itemName);
      world.executionLog.push(`Removed item "${p.itemName}"`);
      break;
    }
    case 'add_score': {
      const amount = Number(p.amount ?? 10);
      world.player.score += amount;
      world.executionLog.push(`Added ${amount} score (total ${world.player.score})`);
      break;
    }
    case 'change_health': {
      const delta = Number(p.delta ?? 0);
      world.player.health = Math.max(0, Math.min(world.player.maxHealth, world.player.health + delta));
      world.executionLog.push(`Changed health by ${delta} (now ${world.player.health})`);
      break;
    }
    case 'spawn_object': {
      world.spawnedObjects.push({
        assetType: String(p.assetType || 'medkit'),
        x: Number(p.x ?? 0),
        y: Number(p.y ?? 1),
        z: Number(p.z ?? 0),
      });
      world.executionLog.push(`Spawned ${String(p.assetType || 'medkit')}`);
      break;
    }
    case 'display_notification': {
      const msg = String(p.message || '').slice(0, 140);
      if (msg) {
        world.notifications.push(msg);
        world.executionLog.push(`Notification: "${msg}"`);
      }
      break;
    }
    case 'start_timer': {
      world.activeTimerSeconds = Math.max(1, Number(p.seconds ?? 60));
      world.executionLog.push(`Started timer (${world.activeTimerSeconds}s)`);
      break;
    }
    case 'end_match': {
      world.matchEnded = true;
      world.matchOutcome = String(p.outcome) === 'defeat' ? 'defeat' : 'victory';
      if (p.message) world.notifications.push(String(p.message));
      world.executionLog.push(`Match ended (${world.matchOutcome})`);
      break;
    }
  }
}

/**
 * Deterministic, sandboxed execution of a LogicGraph for a given TriggerEventContext.
 * Caps traversal steps at 64 so malformed graphs can never hang the browser.
 */
export function executeLogicEvent(
  graph: LogicGraph,
  initialState: RuntimeWorldState,
  event: TriggerEventContext
): RuntimeWorldState {
  const validation = validateLogicGraph(graph);
  if (!validation.valid) {
    return {
      ...initialState,
      executionLog: [...initialState.executionLog, 'Skipped logic execution: graph has validation errors.'],
    };
  }

  const nextState: RuntimeWorldState = {
    player: {
      ...initialState.player,
      inventory: [...initialState.player.inventory],
      position: { ...initialState.player.position },
    },
    doorsOpen: { ...initialState.doorsOpen },
    objects: initialState.objects,
    notifications: [...initialState.notifications],
    activeTimerSeconds: initialState.activeTimerSeconds,
    matchEnded: initialState.matchEnded,
    matchOutcome: initialState.matchOutcome,
    spawnedObjects: [...initialState.spawnedObjects],
    executionLog: [...initialState.executionLog],
  };

  const nodeMap = new Map<string, LogicNode>(graph.nodes.map((n) => [n.id, n]));

  const matchingEvents = graph.nodes.filter((n) => {
    if (n.category !== 'event' || n.type !== event.eventType) return false;
    const expectedTarget = String(n.params.targetName || '').trim().toLowerCase();
    if (!expectedTarget) return true;
    const actualName = (event.targetObjectName || '').trim().toLowerCase();
    return actualName === expectedTarget || event.targetObjectId === String(n.params.targetName);
  });

  const queue: string[] = [];
  for (const evNode of matchingEvents) {
    nextState.executionLog.push(`Event triggered: ${evNode.label}`);
    const outgoing = graph.edges.filter((e) => e.fromNodeId === evNode.id);
    for (const edge of outgoing) queue.push(edge.toNodeId);
  }

  let steps = 0;
  const MAX_STEPS = 64;

  while (queue.length > 0 && steps < MAX_STEPS) {
    steps++;
    const currentId = queue.shift()!;
    const node = nodeMap.get(currentId);
    if (!node) continue;

    if (node.category === 'condition') {
      const passed = evaluateCondition(node, nextState);
      nextState.executionLog.push(`Condition "${node.label}" -> ${passed ? 'TRUE' : 'FALSE'}`);
      const branch = passed ? 'true' : 'false';
      const matchingEdges = graph.edges.filter(
        (e) => e.fromNodeId === node.id && (e.branch === branch || (passed && e.branch === 'default'))
      );
      for (const edge of matchingEdges) queue.push(edge.toNodeId);
    } else if (node.category === 'action') {
      executeAction(node, nextState);
      const nextEdges = graph.edges.filter((e) => e.fromNodeId === node.id);
      for (const edge of nextEdges) queue.push(edge.toNodeId);
    }
  }

  return nextState;
}
