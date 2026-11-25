import React, { useEffect, useRef } from 'react';
import {
  Camera,
  Film,
  Pause,
  Play,
  Plus,
  Repeat,
  Square,
  Trash2,
} from 'lucide-react';
import type { AnimationClip, GameObject, WorldProject } from '../../types/world';
import { upsertKeyframe } from './animationMath';

interface AnimationTimelinePanelProps {
  project: WorldProject;
  selectedObject: GameObject | null;
  playheadTime: number;
  isPlaying: boolean;
  cinematicPreviewActive: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleCinematicPreview: () => void;
  onUpdateProject: (patch: Partial<WorldProject>) => void;
  onSelectObject: (id: string) => void;
}

export const AnimationTimelinePanel: React.FC<AnimationTimelinePanelProps> = ({
  project,
  selectedObject,
  playheadTime,
  isPlaying,
  cinematicPreviewActive,
  onSeek,
  onTogglePlay,
  onStop,
  onToggleCinematicPreview,
  onUpdateProject,
  onSelectObject,
}) => {
  const clips = project.animationClips || [];
  const duration = Math.max(
    6,
    ...clips.map((c) => c.duration),
    ...project.cinematics.map((k) => k.time + 2)
  );
  const rulerRef = useRef<HTMLDivElement | null>(null);

  // Advance playhead smoothly while playing
  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const next = playheadTime + dt;
      onSeek(next > duration ? 0 : Number(next.toFixed(2)));
    }, 50);
    return () => window.clearInterval(id);
  }, [isPlaying, playheadTime, duration, onSeek]);

  const handleRulerPointer = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(Number((ratio * duration).toFixed(2)));
  };

  const handleRecordObjectKeyframe = () => {
    if (!selectedObject) return;
    const existing = clips.find((c) => c.targetObjectId === selectedObject.id);
    if (existing) {
      const updated = clips.map((c) =>
        c.id === existing.id
          ? {
              ...c,
              duration: Math.max(c.duration, Math.ceil(playheadTime + 1)),
              keyframes: upsertKeyframe(c.keyframes, playheadTime, selectedObject.transform),
            }
          : c
      );
      onUpdateProject({ animationClips: updated });
    } else {
      const newClip: AnimationClip = {
        id: `clip_${Date.now().toString(36)}`,
        name: `${selectedObject.name} Motion`,
        targetObjectId: selectedObject.id,
        duration: Math.max(4, Math.ceil(playheadTime + 2)),
        loop: true,
        autoplayInPlaytest: true,
        keyframes: upsertKeyframe([], playheadTime, selectedObject.transform),
      };
      onUpdateProject({ animationClips: [...clips, newClip] });
    }
  };

  const handleApplyMotionPreset = (preset: 'float' | 'spin' | 'patrol') => {
    if (!selectedObject) return;
    const base = selectedObject.transform;
    let keyframes = upsertKeyframe([], 0, base);

    if (preset === 'float') {
      keyframes = upsertKeyframe(keyframes, 2, {
        ...base,
        position: { ...base.position, y: Number((base.position.y + 1.8).toFixed(2)) },
      });
      keyframes = upsertKeyframe(keyframes, 4, base);
    } else if (preset === 'spin') {
      keyframes = upsertKeyframe(keyframes, 2, {
        ...base,
        rotation: { ...base.rotation, y: Number((base.rotation.y + Math.PI).toFixed(2)) },
      });
      keyframes = upsertKeyframe(keyframes, 4, {
        ...base,
        rotation: { ...base.rotation, y: Number((base.rotation.y + Math.PI * 2).toFixed(2)) },
      });
    } else {
      keyframes = upsertKeyframe(keyframes, 2.5, {
        ...base,
        position: { ...base.position, x: Number((base.position.x + 4).toFixed(2)) },
      });
      keyframes = upsertKeyframe(keyframes, 5, base);
    }

    const existing = clips.find((c) => c.targetObjectId === selectedObject.id);
    if (existing) {
      onUpdateProject({
        animationClips: clips.map((c) =>
          c.id === existing.id ? { ...c, duration: preset === 'patrol' ? 5 : 4, keyframes } : c
        ),
      });
    } else {
      onUpdateProject({
        animationClips: [
          ...clips,
          {
            id: `clip_${Date.now().toString(36)}`,
            name: `${selectedObject.name} (${preset})`,
            targetObjectId: selectedObject.id,
            duration: preset === 'patrol' ? 5 : 4,
            loop: true,
            autoplayInPlaytest: true,
            keyframes,
          },
        ],
      });
    }
  };

  const handleAddCameraShot = () => {
    const nextTime = Number(playheadTime.toFixed(1));
    const idx = project.cinematics.length + 1;
    onUpdateProject({
      cinematics: [
        ...project.cinematics,
        {
          id: `kf_${Date.now().toString(36)}`,
          time: nextTime,
          position: { x: 14 - idx * 3, y: 11, z: 18 - idx * 2 },
          lookAt: { x: 0, y: 2, z: 0 },
          caption: `Camera Shot ${idx}`,
        },
      ].sort((a, b) => a.time - b.time),
    });
  };

  const playheadPct = Math.max(0, Math.min(100, (playheadTime / duration) * 100));

  return (
    <div className="h-full flex flex-col bg-[#111318] text-zinc-100 select-none">
      {/* Transport & Action Toolbar */}
      <div className="px-3 py-2 border-b border-white/8 bg-[#14161B] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 ${
              isPlaying
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-[#1C1F26] hover:bg-[#252A34] text-zinc-100'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play Clips'}
          </button>
          <button
            type="button"
            onClick={onStop}
            className="p-1.5 rounded bg-[#1C1F26] hover:bg-[#252A34] text-zinc-300"
            aria-label="Stop animation playback"
            title="Stop & Reset Playhead"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 py-1 rounded bg-[#0D0E11] border border-white/8 font-mono text-xs tabular-nums text-amber-400">
            {playheadTime.toFixed(2)}s / {duration.toFixed(1)}s
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={!selectedObject}
            onClick={handleRecordObjectKeyframe}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Keyframe {selectedObject ? `"${selectedObject.name}"` : '(Select Object)'}
          </button>

          {selectedObject && (
            <>
              <button
                type="button"
                onClick={() => handleApplyMotionPreset('float')}
                className="px-2 py-1 rounded bg-[#1C1F26] hover:bg-[#252A34] text-[11px] text-zinc-300 whitespace-nowrap"
              >
                + Float
              </button>
              <button
                type="button"
                onClick={() => handleApplyMotionPreset('spin')}
                className="px-2 py-1 rounded bg-[#1C1F26] hover:bg-[#252A34] text-[11px] text-zinc-300 whitespace-nowrap"
              >
                + Spin
              </button>
              <button
                type="button"
                onClick={() => handleApplyMotionPreset('patrol')}
                className="px-2 py-1 rounded bg-[#1C1F26] hover:bg-[#252A34] text-[11px] text-zinc-300 whitespace-nowrap"
              >
                + Patrol
              </button>
            </>
          )}

          <div className="w-px h-4 bg-white/10 mx-1" />

          <button
            type="button"
            onClick={handleAddCameraShot}
            className="px-2.5 py-1 rounded bg-[#1C1F26] hover:bg-[#252A34] text-xs text-zinc-200 flex items-center gap-1 whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5 text-teal-400" />
            + Camera Key
          </button>
          <button
            type="button"
            onClick={onToggleCinematicPreview}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
              cinematicPreviewActive
                ? 'bg-rose-600 text-white'
                : 'bg-teal-600 hover:bg-teal-500 text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            {cinematicPreviewActive ? 'Stop Cam' : 'Preview Cam'}
          </button>
        </div>
      </div>

      {/* Tracks + Interactive Time Ruler */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Track Headers */}
        <div className="w-56 border-r border-white/8 bg-[#14161B] overflow-y-auto shrink-0">
          <div className="h-7 px-3 border-b border-white/8 flex items-center text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            Animation Tracks
          </div>

          {/* Camera Track Header */}
          <div className="h-10 px-3 border-b border-white/6 flex items-center justify-between text-xs text-teal-300">
            <span className="flex items-center gap-1.5 truncate">
              <Camera className="w-3.5 h-3.5 shrink-0" />
              Cinematic Camera
            </span>
            <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
              {project.cinematics.length}
            </span>
          </div>

          {/* Object Clip Track Headers */}
          {clips.map((clip) => {
            const target = project.objects.find((o) => o.id === clip.targetObjectId);
            return (
              <div
                key={clip.id}
                className={`h-10 px-3 border-b border-white/6 flex items-center justify-between gap-1.5 text-xs ${
                  selectedObject?.id === clip.targetObjectId
                    ? 'bg-amber-500/12 text-amber-200'
                    : 'text-zinc-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectObject(clip.targetObjectId)}
                  className="truncate text-left flex-1 hover:text-white"
                >
                  {target?.name || clip.name}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProject({
                      animationClips: clips.map((c) =>
                        c.id === clip.id ? { ...c, loop: !c.loop } : c
                      ),
                    })
                  }
                  className={`p-1 rounded ${
                    clip.loop ? 'text-amber-400' : 'text-zinc-600'
                  }`}
                  title="Toggle loop"
                  aria-label={`Toggle loop for ${clip.name}`}
                >
                  <Repeat className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProject({
                      animationClips: clips.filter((c) => c.id !== clip.id),
                    })
                  }
                  className="p-1 rounded text-zinc-500 hover:text-rose-400"
                  title="Delete clip"
                  aria-label={`Delete animation clip ${clip.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {clips.length === 0 && (
            <div className="p-3 text-[11px] text-zinc-500">
              Select a 3D object and click <strong className="text-zinc-300">+ Keyframe</strong> or a motion preset to animate it live.
            </div>
          )}
        </div>

        {/* Right Timeline Grid & Keyframe Diamonds */}
        <div className="flex-1 overflow-y-auto relative bg-[#0D0E11]">
          {/* Clickable Time Ruler */}
          <div
            ref={rulerRef}
            onClick={handleRulerPointer}
            className="h-7 border-b border-white/10 bg-[#14161B] relative cursor-ew-resize"
          >
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, sec) => (
              <div
                key={sec}
                style={{ left: `${(sec / duration) * 100}%` }}
                className="absolute top-0 bottom-0 border-l border-white/10 pl-1 text-[10px] font-mono text-zinc-500 flex items-center"
              >
                {sec}s
              </div>
            ))}
          </div>

          {/* Playhead Vertical Line */}
          <div
            style={{ left: `${playheadPct}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-20 pointer-events-none"
          >
            <div className="w-2.5 h-2.5 bg-amber-400 -ml-1 rotate-45 -mt-0.5" />
          </div>

          {/* Camera Keyframes Row */}
          <div
            onClick={handleRulerPointer}
            className="h-10 border-b border-white/6 relative cursor-pointer"
          >
            {project.cinematics.map((kf) => (
              <button
                key={kf.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(kf.time);
                }}
                style={{ left: `${Math.min(98, (kf.time / duration) * 100)}%` }}
                title={`${kf.caption} (${kf.time}s)`}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-teal-400 border border-zinc-950 hover:scale-125 transition-transform z-10"
              />
            ))}
          </div>

          {/* Object Clip Rows */}
          {clips.map((clip) => (
            <div
              key={clip.id}
              onClick={handleRulerPointer}
              className="h-10 border-b border-white/6 relative cursor-pointer"
            >
              {/* Active clip span bar */}
              {clip.keyframes.length >= 2 && (
                <div
                  style={{
                    left: `${(clip.keyframes[0].time / duration) * 100}%`,
                    width: `${
                      ((clip.keyframes[clip.keyframes.length - 1].time - clip.keyframes[0].time) /
                        duration) *
                      100
                    }%`,
                  }}
                  className="absolute top-2.5 bottom-2.5 rounded bg-amber-500/20 border border-amber-500/40 pointer-events-none"
                />
              )}

              {clip.keyframes.map((kf) => (
                <button
                  key={kf.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectObject(clip.targetObjectId);
                    onSeek(kf.time);
                  }}
                  style={{ left: `${Math.min(98, (kf.time / duration) * 100)}%` }}
                  title={`Keyframe at ${kf.time}s (Pos ${kf.position.x.toFixed(1)}, ${kf.position.y.toFixed(1)}, ${kf.position.z.toFixed(1)})`}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-amber-400 border border-zinc-950 hover:scale-125 transition-transform z-10"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
