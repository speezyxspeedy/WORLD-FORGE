import type { AnimationClip, ObjectAnimationKeyframe, Transform, Vec3 } from '../../types/world';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

/**
 * Snaps a coordinate to the active grid increment (returns original value when snapSize <= 0).
 */
export function snapValue(value: number, snapSize: number): number {
  if (!snapSize || snapSize <= 0) return Number(value.toFixed(2));
  return Number((Math.round(value / snapSize) * snapSize).toFixed(2));
}

export function snapVec3XZ(pos: Vec3, snapSize: number): Vec3 {
  return {
    x: snapValue(pos.x, snapSize),
    y: Number(pos.y.toFixed(2)),
    z: snapValue(pos.z, snapSize),
  };
}

/**
 * Evaluates an AnimationClip at time `timeSec`, smoothly interpolating position, rotation, and scale.
 */
export function evaluateAnimationClip(clip: AnimationClip, timeSec: number): Transform | null {
  if (!clip.keyframes || clip.keyframes.length === 0) return null;
  const sorted = [...clip.keyframes].sort((a, b) => a.time - b.time);

  if (sorted.length === 1) {
    const k = sorted[0];
    return {
      position: { ...k.position },
      rotation: { ...k.rotation },
      scale: { ...k.scale },
    };
  }

  const duration = Math.max(clip.duration, sorted[sorted.length - 1].time, 0.1);
  let t = timeSec;
  if (clip.loop) {
    t = ((timeSec % duration) + duration) % duration;
  } else {
    t = Math.max(0, Math.min(duration, timeSec));
  }

  if (t <= sorted[0].time) {
    const k = sorted[0];
    return {
      position: { ...k.position },
      rotation: { ...k.rotation },
      scale: { ...k.scale },
    };
  }

  const last = sorted[sorted.length - 1];
  if (t >= last.time) {
    if (clip.loop && duration > last.time) {
      const span = duration - last.time;
      const alpha = smoothstep((t - last.time) / span);
      return {
        position: lerpVec3(last.position, sorted[0].position, alpha),
        rotation: lerpVec3(last.rotation, sorted[0].rotation, alpha),
        scale: lerpVec3(last.scale, sorted[0].scale, alpha),
      };
    }
    return {
      position: { ...last.position },
      rotation: { ...last.rotation },
      scale: { ...last.scale },
    };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (t >= a.time && t <= b.time) {
      const span = Math.max(0.0001, b.time - a.time);
      const alpha = smoothstep((t - a.time) / span);
      return {
        position: lerpVec3(a.position, b.position, alpha),
        rotation: lerpVec3(a.rotation, b.rotation, alpha),
        scale: lerpVec3(a.scale, b.scale, alpha),
      };
    }
  }

  return null;
}

/**
 * Inserts or updates a keyframe at `timeSec` (within 0.05s tolerance) keeping keyframes time-sorted.
 */
export function upsertKeyframe(
  keyframes: ObjectAnimationKeyframe[],
  timeSec: number,
  transform: Transform
): ObjectAnimationKeyframe[] {
  const cleanTime = Number(Math.max(0, timeSec).toFixed(2));
  const existingIdx = keyframes.findIndex((k) => Math.abs(k.time - cleanTime) < 0.05);
  const entry: ObjectAnimationKeyframe = {
    id: existingIdx >= 0 ? keyframes[existingIdx].id : `akf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    time: cleanTime,
    position: { ...transform.position },
    rotation: { ...transform.rotation },
    scale: { ...transform.scale },
  };
  const next =
    existingIdx >= 0
      ? keyframes.map((k, idx) => (idx === existingIdx ? entry : k))
      : [...keyframes, entry];
  return next.sort((a, b) => a.time - b.time);
}
