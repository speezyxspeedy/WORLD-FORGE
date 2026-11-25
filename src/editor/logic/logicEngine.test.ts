import test from 'node:test';
import assert from 'node:assert/strict';
import {
  executeLogicEvent,
  validateLogicGraph,
  type RuntimeWorldState,
} from './logicEngine';
import type { LogicGraph } from '../../types/world';

const lockedDoorGraph: LogicGraph = {
  nodes: [
    {
      id: 'ev_enter',
      category: 'event',
      type: 'player_enters_area',
      label: 'Player enters Gate Trigger',
      position: { x: 0, y: 0 },
      params: { targetName: 'Gate Trigger' },
    },
    {
      id: 'cond_key',
      category: 'condition',
      type: 'has_item',
      label: 'Has Gold Key',
      position: { x: 200, y: 0 },
      params: { itemName: 'Gold Key' },
    },
    {
      id: 'act_open',
      category: 'action',
      type: 'open_door',
      label: 'Open Vault Door',
      position: { x: 400, y: -50 },
      params: { targetName: 'Vault Door' },
    },
    {
      id: 'act_msg',
      category: 'action',
      type: 'display_notification',
      label: 'Locked Door Message',
      position: { x: 400, y: 80 },
      params: { message: 'Door is locked!' },
    },
  ],
  edges: [
    { id: 'e1', fromNodeId: 'ev_enter', toNodeId: 'cond_key', branch: 'default' },
    { id: 'e2', fromNodeId: 'cond_key', toNodeId: 'act_open', branch: 'true' },
    { id: 'e3', fromNodeId: 'cond_key', toNodeId: 'act_msg', branch: 'false' },
  ],
};

function makeState(inventory: string[]): RuntimeWorldState {
  return {
    player: {
      health: 100,
      maxHealth: 100,
      score: 0,
      team: 'Alpha',
      inventory,
      position: { x: 0, y: 0, z: 0 },
    },
    doorsOpen: { 'Vault Door': false },
    objects: [],
    notifications: [],
    activeTimerSeconds: null,
    matchEnded: false,
    matchOutcome: null,
    spawnedObjects: [],
    executionLog: [],
  };
}

test('validates clean event-condition-action graph', () => {
  const res = validateLogicGraph(lockedDoorGraph);
  assert.equal(res.valid, true);
  assert.equal(res.issues.length, 0);
});

test('detects cycles in malformed logic graphs', () => {
  const cyclic: LogicGraph = {
    nodes: lockedDoorGraph.nodes,
    edges: [
      ...lockedDoorGraph.edges,
      { id: 'e_cycle', fromNodeId: 'act_open', toNodeId: 'cond_key', branch: 'default' },
    ],
  };
  const res = validateLogicGraph(cyclic);
  assert.equal(res.valid, false);
  assert.ok(res.issues.some((i) => i.message.toLowerCase().includes('circular')));
});

test('executes FALSE branch when player lacks Gold Key', () => {
  const result = executeLogicEvent(lockedDoorGraph, makeState([]), {
    eventType: 'player_enters_area',
    targetObjectName: 'Gate Trigger',
  });
  assert.equal(result.doorsOpen['Vault Door'], false);
  assert.deepEqual(result.notifications, ['Door is locked!']);
});

test('executes TRUE branch and opens door when player holds Gold Key', () => {
  const result = executeLogicEvent(lockedDoorGraph, makeState(['Gold Key']), {
    eventType: 'player_enters_area',
    targetObjectName: 'Gate Trigger',
  });
  assert.equal(result.doorsOpen['Vault Door'], true);
  assert.equal(result.notifications.length, 0);
});
