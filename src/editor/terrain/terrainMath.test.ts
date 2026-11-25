import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTerrainBrush, createTerrain, groundHeightAt } from './terrainMath';
import { createInitialPlayerState, stepPlayerPhysics } from '../../gameplay/physicsMath';
import { createProjectFromTemplate } from '../../world-format/templates';
import { validateProjectForPublish, sanitizeUserText } from '../../services/validation';

test('terrain brush raises height and bilinear interpolation samples smoothly', () => {
  const terrain = createTerrain(80, 80, 32, 32, 'meadow');
  assert.equal(groundHeightAt(terrain, 0, 0), 0);

  const raised = applyTerrainBrush(terrain, {
    tool: 'raise',
    worldX: 0,
    worldZ: 0,
    radius: 10,
    strength: 3,
  });
  assert.ok(groundHeightAt(raised, 0, 0) > 2.5);
  assert.equal(groundHeightAt(raised, 35, 35), 0);
});

test('lake stamp lowers terrain and enables water plane', () => {
  const terrain = createTerrain(80, 80, 32, 32, 'meadow', false, -1.2);
  const withLake = applyTerrainBrush(terrain, {
    tool: 'stamp_lake',
    worldX: 0,
    worldZ: 0,
    radius: 10,
    strength: 3,
  });
  assert.equal(withLake.waterEnabled, true);
  assert.ok(groundHeightAt(withLake, 0, 0) < -1.5);
});

test('playtest physics moves player forward and supports coyote jump', () => {
  const project = createProjectFromTemplate('parkour', 'Physics Test World');
  const player = createInitialPlayerState(project.objects, project.terrain);
  const startZ = player.position.z;

  const stepped = stepPlayerPhysics(
    player,
    {
      forward: true,
      backward: false,
      left: false,
      right: false,
      jumpJustPressed: true,
      jumpHeld: true,
      sprint: false,
    },
    project.terrain,
    project.objects,
    {},
    project.gameplay,
    project.environment.worldBoundary,
    0.016
  );

  assert.equal(stepped.justJumped, true);
  assert.ok(stepped.player.velocity.y > 5);
  assert.ok(stepped.player.position.z < startZ);
});

test('publish validation rejects missing spawn points and short titles, passes valid templates', () => {
  const project = createProjectFromTemplate('parkour', 'Skyline Parkour Test');
  const validReport = validateProjectForPublish(project);
  assert.equal(validReport.canPublish, true);

  const invalidProject = {
    ...project,
    title: 'Hi',
    objects: project.objects.filter((o) => o.assetType !== 'spawn_point'),
  };
  const invalidReport = validateProjectForPublish(invalidProject);
  assert.equal(invalidReport.canPublish, false);
  assert.ok(invalidReport.items.some((i) => i.id === 'title' && i.status === 'error'));
  assert.ok(invalidReport.items.some((i) => i.id === 'spawn' && i.status === 'error'));

  assert.equal(sanitizeUserText('<script>alert(1)</script>Hello'), 'scriptalert(1)/scriptHello');
});
