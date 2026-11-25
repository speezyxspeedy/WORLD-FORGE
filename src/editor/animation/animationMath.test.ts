import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAnimationClip, snapValue, snapVec3XZ, upsertKeyframe } from './animationMath';
import type { AnimationClip } from '../../types/world';

test('snapValue snaps cleanly to grid increments and passes through when disabled', () => {
  assert.equal(snapValue(2.34, 0.5), 2.5);
  assert.equal(snapValue(2.34, 1), 2);
  assert.equal(snapValue(-3.7, 2), -4);
  assert.equal(snapValue(2.34, 0), 2.34);

  const snapped = snapVec3XZ({ x: 1.4, y: 0.77, z: -2.6 }, 1);
  assert.deepEqual(snapped, { x: 1, y: 0.77, z: -3 });
});

test('evaluateAnimationClip smoothly interpolates keyframes and loops cleanly', () => {
  const clip: AnimationClip = {
    id: 'clip_1',
    name: 'Platform Lift',
    targetObjectId: 'obj_plat',
    duration: 4,
    loop: true,
    autoplayInPlaytest: true,
    keyframes: [
      {
        id: 'k1',
        time: 0,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      {
        id: 'k2',
        time: 2,
        position: { x: 0, y: 4, z: 0 },
        rotation: { x: 0, y: Math.PI, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
    ],
  };

  const atStart = evaluateAnimationClip(clip, 0);
  assert.ok(atStart);
  assert.equal(atStart.position.y, 0);

  const atMid = evaluateAnimationClip(clip, 1);
  assert.ok(atMid);
  assert.equal(atMid.position.y, 2);

  const atPeak = evaluateAnimationClip(clip, 2);
  assert.ok(atPeak);
  assert.equal(atPeak.position.y, 4);

  // Looping wrap back toward start between 2s and 4s
  const atReturnMid = evaluateAnimationClip(clip, 3);
  assert.ok(atReturnMid);
  assert.equal(atReturnMid.position.y, 2);

  // Modulo wrap past duration
  const atWrap = evaluateAnimationClip(clip, 5);
  assert.ok(atWrap);
  assert.equal(atWrap.position.y, 2);
});

test('upsertKeyframe updates near-duplicate timestamps and keeps keyframes sorted', () => {
  const kfs = upsertKeyframe([], 2, {
    position: { x: 2, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  });
  const kfs2 = upsertKeyframe(kfs, 0.5, {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  });
  assert.equal(kfs2.length, 2);
  assert.equal(kfs2[0].time, 0.5);
  assert.equal(kfs2[1].time, 2);

  // Replace keyframe at 2.02s (within 0.05s tolerance)
  const kfs3 = upsertKeyframe(kfs2, 2.02, {
    position: { x: 9, y: 1, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  });
  assert.equal(kfs3.length, 2);
  assert.equal(kfs3[1].position.x, 9);
});
