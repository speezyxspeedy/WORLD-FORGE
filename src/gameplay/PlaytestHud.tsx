import React, { useState } from 'react';
import {
  Camera,
  Pause,
  RotateCcw,
  Square,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { WorldProject } from '../types/world';
import type { PlaytestHudSnapshot } from '../editor/viewport/WorldViewport';
import { audioSynth } from '../services/audioSynth';

interface PlaytestHudProps {
  project: WorldProject;
  hud: PlaytestHudSnapshot;
  isStandalonePlayer?: boolean;
  onStopPlaytest: () => void;
}

export const PlaytestHud: React.FC<PlaytestHudProps> = ({
  project,
  hud,
  isStandalonePlayer = false,
  onStopPlaytest,
}) => {
  const [muted, setMuted] = useState(audioSynth.isMuted());
  const ui = project.customUI;

  const dispatchCmd = (cmd: string) => {
    window.dispatchEvent(new CustomEvent('wf-playtest-cmd', { detail: cmd }));
  };

  const healthPct = Math.max(0, Math.min(100, (hud.health / Math.max(1, hud.maxHealth)) * 100));
  const mins = Math.floor(hud.timeRemaining / 60);
  const secs = hud.timeRemaining % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none">
      {/* Top Perimeter Status Clusters (Zero backdrop-filter over WebGL) */}
      <div className="flex items-start justify-between p-4 gap-4">
        {/* Top-Left: Vitality & Objective */}
        <div className="space-y-2 max-w-xs">
          {ui.showHealthBar && (
            <div className="px-3.5 py-2.5 rounded-lg bg-[#0B0E14]/88 border border-white/12">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[11px] font-semibold tracking-wider text-slate-400">HP</span>
                <span className="text-xl font-display font-bold tabular-nums text-white leading-none">
                  {hud.health}
                  <span className="text-xs font-normal text-slate-400"> / {hud.maxHealth}</span>
                </span>
              </div>
              <div className="mt-2 h-2 w-44 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full transition-all duration-150"
                  style={{
                    width: `${healthPct}%`,
                    backgroundColor: healthPct < 30 ? '#ef4444' : ui.hudAccent,
                  }}
                />
              </div>
            </div>
          )}

          {ui.objectiveBanner && (
            <div className="px-3 py-1.5 rounded-md bg-[#0B0E14]/82 border border-white/10 text-xs text-slate-200">
              {ui.objectiveBanner}
            </div>
          )}
        </div>

        {/* Top-Center: Score & Timer */}
        {(ui.showScore || ui.showTimer) && (
          <div className="flex items-center gap-5 px-4 py-2 rounded-lg bg-[#0B0E14]/88 border border-white/12">
            {ui.showScore && (
              <div className="text-center">
                <div className="text-[10px] font-semibold tracking-wider text-slate-400">SCORE</div>
                <div
                  className="text-xl font-display font-bold tabular-nums leading-none mt-0.5"
                  style={{ color: ui.hudAccent }}
                >
                  {hud.score}
                </div>
              </div>
            )}
            {ui.showScore && ui.showTimer && <div className="w-px h-7 bg-white/10" />}
            {ui.showTimer && (
              <div className="text-center">
                <div className="text-[10px] font-semibold tracking-wider text-slate-400">TIME</div>
                <div className="text-xl font-mono font-semibold tabular-nums text-white leading-none mt-0.5">
                  {formattedTime}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top-Right: Utility Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              dispatchCmd('toggle_camera');
            }}
            className="px-3 py-2 rounded-lg bg-[#0B0E14]/90 hover:bg-[#1E2636] border border-white/12 text-xs font-medium text-slate-100 flex items-center gap-1.5 whitespace-nowrap"
            aria-label="Toggle camera perspective"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            {hud.cameraView === 'third' ? '3rd Person [V]' : '1st Person [V]'}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              const next = !muted;
              audioSynth.setMuted(next);
              setMuted(next);
            }}
            className="p-2 rounded-lg bg-[#0B0E14]/90 hover:bg-[#1E2636] border border-white/12 text-slate-200"
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              dispatchCmd('pause');
            }}
            className="p-2 rounded-lg bg-[#0B0E14]/90 hover:bg-[#1E2636] border border-white/12 text-slate-200"
            aria-label="Pause playtest"
          >
            <Pause className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onStopPlaytest();
            }}
            className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
          >
            <Square className="w-3 h-3 fill-current" />
            {isStandalonePlayer ? 'Exit Game' : 'Stop Playtest'}
          </button>
        </div>
      </div>

      {/* Exact Center Crosshair */}
      {ui.showCrosshair && !hud.paused && !hud.outcome && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="2.2" stroke={ui.hudAccent} strokeWidth="1.5" />
            <line x1="10" y1="2" x2="10" y2="5.5" stroke="#ffffff" strokeWidth="1.4" strokeOpacity="0.85" />
            <line x1="10" y1="14.5" x2="10" y2="18" stroke="#ffffff" strokeWidth="1.4" strokeOpacity="0.85" />
            <line x1="2" y1="10" x2="5.5" y2="10" stroke="#ffffff" strokeWidth="1.4" strokeOpacity="0.85" />
            <line x1="14.5" y1="10" x2="18" y2="10" stroke="#ffffff" strokeWidth="1.4" strokeOpacity="0.85" />
          </svg>
        </div>
      )}

      {/* Nearby Interact Prompt */}
      {hud.nearbyInteractPrompt && !hud.paused && !hud.outcome && (
        <div className="fixed left-1/2 bottom-24 -translate-x-1/2 px-4 py-2 rounded-lg bg-[#0B0E14]/92 border border-amber-400/50 text-xs font-semibold text-amber-300">
          {hud.nearbyInteractPrompt}
        </div>
      )}

      {/* Visual Logic Notifications */}
      {hud.notifications.length > 0 && (
        <div className="fixed top-22 left-1/2 -translate-x-1/2 space-y-1.5 max-w-md w-full px-4">
          {hud.notifications.map((msg, idx) => (
            <div
              key={`${msg}_${idx}`}
              className="px-4 py-2 rounded-lg bg-[#0B0E14]/92 border border-amber-500/40 text-center text-xs font-medium text-amber-100"
            >
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Perimeter: Inventory + Control Hints + Radar Minimap */}
      <div className="fixed bottom-4 left-4 right-4 flex items-end justify-between gap-4">
        <div className="space-y-2">
          {ui.showInventory && (
            <div className="flex items-center gap-2">
              {hud.inventory.length > 0 ? (
                hud.inventory.map((item) => (
                  <div
                    key={item}
                    className="px-3 py-1.5 rounded-md bg-[#0B0E14]/90 border border-amber-500/40 text-xs font-medium text-amber-200"
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div className="px-3 py-1.5 rounded-md bg-[#0B0E14]/80 border border-white/10 text-xs text-slate-400">
                  Inventory Empty
                </div>
              )}
            </div>
          )}
          <div className="text-[11px] text-slate-200 bg-[#0B0E14]/78 px-3 py-1 rounded inline-block">
            WASD Move · Space Jump · Drag Mouse Look · E Interact · V Camera · Esc Pause
          </div>
        </div>

        {/* Live Radar Minimap projecting real world objects */}
        {ui.showMinimap && (
          <div className="w-28 h-28 rounded-lg bg-[#0B0E14]/90 border border-white/15 relative overflow-hidden shrink-0">
            <svg width="112" height="112" viewBox="-45 -45 90 90">
              <line x1="-45" y1="0" x2="45" y2="0" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <line x1="0" y1="-45" x2="0" y2="45" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              {project.objects.slice(0, 60).map((obj) => (
                <circle
                  key={obj.id}
                  cx={Math.max(-42, Math.min(42, obj.transform.position.x))}
                  cy={Math.max(-42, Math.min(42, obj.transform.position.z))}
                  r={obj.assetType === 'checkpoint' || obj.assetType === 'key_item' ? 3 : 1.8}
                  fill={
                    obj.assetType === 'checkpoint'
                      ? '#14b8a6'
                      : obj.assetType === 'key_item'
                      ? '#f59e0b'
                      : obj.assetType === 'damage_zone'
                      ? '#ef4444'
                      : '#64748b'
                  }
                />
              ))}
              <circle
                cx={Math.max(-42, Math.min(42, hud.playerPos.x))}
                cy={Math.max(-42, Math.min(42, hud.playerPos.z))}
                r="3.6"
                fill="#ffffff"
                stroke={ui.hudAccent}
                strokeWidth="1.5"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Pause Modal */}
      {hud.paused && !hud.outcome && (
        <div className="fixed inset-0 bg-[#0B0E14]/80 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-sm rounded-xl bg-[#161C28] border border-white/15 p-6 space-y-5 text-center">
            <div>
              <h2 className="text-xl font-display font-bold text-white">Paused</h2>
              <p className="text-xs text-slate-400 mt-1">{project.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-[#0B0E14]">
                <div className="text-[11px] text-slate-400">Score</div>
                <div className="text-lg font-mono font-bold tabular-nums text-amber-400">
                  {hud.score}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0E14]">
                <div className="text-[11px] text-slate-400">Health</div>
                <div className="text-lg font-mono font-bold tabular-nums text-white">
                  {hud.health}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => dispatchCmd('resume')}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={() => dispatchCmd('restart')}
                className="w-full py-2.5 rounded-lg bg-[#1E2636] hover:bg-[#273247] text-slate-100 font-medium text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Restart Run
              </button>
              <button
                type="button"
                onClick={onStopPlaytest}
                className="w-full py-2.5 rounded-lg bg-[#0B0E14] hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 font-medium text-sm"
              >
                {isStandalonePlayer ? 'Return to Discover' : 'Return to Editor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory / Defeat Outcome Modal */}
      {hud.outcome && (
        <div className="fixed inset-0 bg-[#0B0E14]/85 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-sm rounded-xl bg-[#161C28] border border-white/15 p-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-amber-500/20 text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-white">
                {hud.outcome === 'victory' ? 'Victory!' : 'Run Complete'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">{project.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#0B0E14]">
                <div className="text-[11px] text-slate-400">Final Score</div>
                <div className="text-xl font-mono font-bold tabular-nums text-amber-400">
                  {hud.score}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0E14]">
                <div className="text-[11px] text-slate-400">Time Left</div>
                <div className="text-xl font-mono font-bold tabular-nums text-white">
                  {formattedTime}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                data-start="true"
                onClick={() => dispatchCmd('restart')}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onStopPlaytest}
                className="w-full py-2.5 rounded-lg bg-[#1E2636] hover:bg-[#273247] text-slate-100 font-medium text-sm"
              >
                {isStandalonePlayer ? 'Back to Discover' : 'Back to World Studio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
