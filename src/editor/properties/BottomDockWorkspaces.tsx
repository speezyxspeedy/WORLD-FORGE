import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Sliders,
  Volume2,
  VolumeX,
  Layout,
  Plus,
} from 'lucide-react';
import type { TemplateType, WorldProject } from '../../types/world';
import { audioSynth } from '../../services/audioSynth';
import { sanitizeUserText } from '../../services/validation';

interface GameplayDockProps {
  project: WorldProject;
  onUpdateProject: (patch: Partial<WorldProject>) => void;
  onApplyTemplate: (template: TemplateType) => void;
}

export const GameplayDockPanel: React.FC<GameplayDockProps> = ({
  project,
  onUpdateProject,
  onApplyTemplate,
}) => {
  const [newItem, setNewItem] = useState('');
  const gp = project.gameplay;

  return (
    <div className="h-full overflow-y-auto bg-[#111318] p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Match Rules */}
        <div className="p-3.5 rounded-lg bg-[#14161B] border border-white/8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Match &amp; Win Conditions
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] text-zinc-400">Win Rule</span>
              <select
                value={gp.winCondition}
                onChange={(e) =>
                  onUpdateProject({
                    gameplay: {
                      ...gp,
                      winCondition: e.target.value as WorldProject['gameplay']['winCondition'],
                    },
                  })
                }
                className="w-full px-2 py-1.5 rounded bg-[#0D0E11] border border-white/10 text-xs text-white"
              >
                <option value="reach_checkpoint">Reach Goal</option>
                <option value="reach_score">Score Limit</option>
                <option value="survive_timer">Survive Timer</option>
                <option value="eliminate_targets">Eliminate Targets</option>
                <option value="free_play">Open Sandbox</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-zinc-400">Duration (sec)</span>
              <input
                type="number"
                min={30}
                max={3600}
                value={gp.matchDuration}
                onChange={(e) =>
                  onUpdateProject({
                    gameplay: { ...gp, matchDuration: Math.max(30, Number(e.target.value)) },
                  })
                }
                className="w-full px-2 py-1.5 rounded bg-[#0D0E11] border border-white/10 text-xs font-mono tabular-nums text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-zinc-400">Score Limit</span>
              <input
                type="number"
                min={10}
                value={gp.scoreLimit}
                onChange={(e) =>
                  onUpdateProject({
                    gameplay: { ...gp, scoreLimit: Math.max(10, Number(e.target.value)) },
                  })
                }
                className="w-full px-2 py-1.5 rounded bg-[#0D0E11] border border-white/10 text-xs font-mono tabular-nums text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-zinc-400">Max Players</span>
              <input
                type="number"
                min={1}
                max={64}
                value={gp.maxPlayers}
                onChange={(e) =>
                  onUpdateProject({
                    gameplay: { ...gp, maxPlayers: Math.max(1, Number(e.target.value)) },
                  })
                }
                className="w-full px-2 py-1.5 rounded bg-[#0D0E11] border border-white/10 text-xs font-mono tabular-nums text-white"
              />
            </label>
          </div>
          <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer pt-1">
            <span>Teams ({gp.teamNames.join(' vs ')})</span>
            <input
              type="checkbox"
              checked={gp.teamsEnabled}
              onChange={(e) =>
                onUpdateProject({
                  gameplay: {
                    ...gp,
                    teamsEnabled: e.target.checked,
                    teamNames: e.target.checked ? ['Alpha Red', 'Bravo Teal'] : ['Solo'],
                  },
                })
              }
              className="accent-amber-500"
            />
          </label>
        </div>

        {/* Player Physics & Starting Inventory */}
        <div className="p-3.5 rounded-lg bg-[#14161B] border border-white/8 space-y-3">
          <div className="text-xs font-semibold text-white">Player Physics &amp; Inventory</div>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ['playerHealth', 'HP'],
                ['moveSpeed', 'Speed'],
                ['jumpForce', 'Jump'],
                ['gravity', 'Gravity'],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="space-y-1">
                <span className="text-[10px] text-zinc-400">{label}</span>
                <input
                  type="number"
                  step={field === 'playerHealth' ? 10 : 0.5}
                  value={gp[field]}
                  onChange={(e) =>
                    onUpdateProject({
                      gameplay: { ...gp, [field]: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-[#0D0E11] border border-white/10 text-xs font-mono tabular-nums text-white"
                />
              </label>
            ))}
          </div>

          <div className="space-y-1.5 pt-1 border-t border-white/8">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Starting item (e.g. Gold Key)"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="flex-1 px-2.5 py-1 rounded bg-[#0D0E11] border border-white/10 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const clean = sanitizeUserText(newItem, 36);
                  if (!clean) return;
                  onUpdateProject({
                    gameplay: {
                      ...gp,
                      startingInventory: [...gp.startingInventory, clean],
                    },
                  });
                  setNewItem('');
                }}
                className="px-2.5 py-1 rounded bg-amber-500 text-zinc-950 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {gp.startingInventory.map((item, idx) => (
                <span
                  key={`${item}_${idx}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0D0E11] border border-white/10 text-[11px] text-zinc-200"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProject({
                        gameplay: {
                          ...gp,
                          startingInventory: gp.startingInventory.filter((_, i) => i !== idx),
                        },
                      })
                    }
                    className="text-zinc-500 hover:text-rose-400"
                    aria-label={`Remove ${item}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {gp.startingInventory.length === 0 && (
                <span className="text-[11px] text-zinc-500">Empty starting loadout</span>
              )}
            </div>
          </div>
        </div>

        {/* Playable World Templates */}
        <div className="p-3.5 rounded-lg bg-[#14161B] border border-white/8 space-y-2.5">
          <div className="text-xs font-semibold text-white">Switch Playable Genre Template</div>
          <p className="text-[11px] text-zinc-400">
            Re-initializes terrain, objects, rules, and visual logic nodes for rapid prototyping.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['parkour', 'Skyline Parkour'],
                ['tdm', 'Team Deathmatch'],
                ['racing', 'Canyon Rally'],
                ['blank', 'Open Sandbox'],
              ] as const
            ).map(([tpl, label]) => (
              <button
                key={tpl}
                type="button"
                onClick={() => onApplyTemplate(tpl)}
                className="px-2.5 py-2 rounded bg-[#1C1F26] hover:bg-[#252A34] border border-white/8 text-xs text-zinc-200 text-left font-medium"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface UIDesignerDockProps {
  project: WorldProject;
  showLiveHudPreview: boolean;
  onToggleLiveHudPreview: () => void;
  onUpdateProject: (patch: Partial<WorldProject>) => void;
}

export const UIDesignerDockPanel: React.FC<UIDesignerDockProps> = ({
  project,
  showLiveHudPreview,
  onToggleLiveHudPreview,
  onUpdateProject,
}) => {
  const ui = project.customUI;

  return (
    <div className="h-full overflow-y-auto bg-[#111318] p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* HUD Components */}
        <div className="p-3.5 rounded-lg bg-[#14161B] border border-white/8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-amber-400" />
              HUD &amp; Interface Modules
            </span>
            <button
              type="button"
              onClick={onToggleLiveHudPreview}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${
                showLiveHudPreview
                  ? 'bg-teal-600 text-white'
                  : 'bg-[#1C1F26] text-zinc-300 hover:bg-[#252A34]'
              }`}
            >
              {showLiveHudPreview ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {showLiveHudPreview ? 'Viewport Preview On' : 'Preview on 3D'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                ['showHealthBar', 'Health Bar'],
                ['showScore', 'Score Readout'],
                ['showTimer', 'Match Timer'],
                ['showInventory', 'Inventory Strip'],
                ['showMinimap', 'Radar Minimap'],
                ['showCrosshair', 'Center Crosshair'],
                ['showScoreboard', 'Scoreboard'],
                ['showDialogueBox', 'Dialogue Box'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#0D0E11] border border-white/6 text-[11px] text-zinc-200 cursor-pointer"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(ui[key])}
                  onChange={(e) =>
                    onUpdateProject({ customUI: { ...ui, [key]: e.target.checked } })
                  }
                  className="accent-amber-500"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Objective & Menu Copy */}
        <div className="p-3.5 rounded-lg bg-[#14161B] border border-white/8 space-y-3">
          <div className="text-xs font-semibold text-white">Objectives, Menus &amp; Theme</div>
          <label className="space-y-1 block">
            <span className="text-[11px] text-zinc-400">Objective Notification Banner</span>
            <input
              type="text"
              value={ui.objectiveBanner}
              onChange={(e) =>
                onUpdateProject({ customUI: { ...ui, objectiveBanner: e.target.value } })
              }
              className="w-full px-2.5 py-1.5 rounded bg-[#0D0E11] border border-white/10 text-xs text-white"
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-[11px] text-zinc-400">Game Menu / Pause Header</span>
            <input
              type="text"
              value={ui.menuTitle || project.title}
              onChange={(e) =>
                onUpdateProject({ customUI: { ...ui, menuTitle: e.target.value } })
              }
              className="w-full px-2.5 py-1.5 rounded bg-[#0D0E11] border border-white/10 text-xs text-white"
            />
          </label>
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span>HUD Accent Color</span>
            <input
              type="color"
              value={ui.hudAccent}
              onChange={(e) =>
                onUpdateProject({ customUI: { ...ui, hudAccent: e.target.value } })
              }
              className="w-8 h-7 rounded bg-transparent cursor-pointer"
            />
          </div>
        </div>

        {/* Dialogue Box Config */}
        <div className="p-3.5 rounded-lg bg-[#14161B] border border-white/8 space-y-3">
          <div className="text-xs font-semibold text-white">Interactive Dialogue Box</div>
          <label className="space-y-1 block">
            <span className="text-[11px] text-zinc-400">Speaker Name</span>
            <input
              type="text"
              placeholder="e.g. Citadel Guide"
              value={ui.dialogueSpeaker || 'World Guide'}
              onChange={(e) =>
                onUpdateProject({ customUI: { ...ui, dialogueSpeaker: e.target.value } })
              }
              className="w-full px-2.5 py-1.5 rounded bg-[#0D0E11] border border-white/10 text-xs text-white"
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-[11px] text-zinc-400">Dialogue Line</span>
            <textarea
              rows={2}
              value={
                ui.dialogueText ||
                'Collect the Gold Key on Sky Platform 1 to unlock the Summit Vault Door.'
              }
              onChange={(e) =>
                onUpdateProject({ customUI: { ...ui, dialogueText: e.target.value } })
              }
              className="w-full px-2.5 py-1.5 rounded bg-[#0D0E11] border border-white/10 text-xs text-white"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

interface AudioDockProps {
  project: WorldProject;
  onUpdateProject: (patch: Partial<WorldProject>) => void;
}

export const AudioDockPanel: React.FC<AudioDockProps> = ({ project, onUpdateProject }) => {
  const audio = project.audio;

  return (
    <div className="h-full overflow-y-auto bg-[#111318] p-4">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-lg bg-[#14161B] border border-white/8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              {audio.sfxEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              )}
              Master Mixer
            </span>
            <span className="font-mono text-xs tabular-nums text-amber-400">
              {Math.round(audio.masterVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audio.masterVolume}
            onChange={(e) => {
              const v = Number(e.target.value);
              audioSynth.setVolume(v);
              onUpdateProject({ audio: { ...audio, masterVolume: v } });
            }}
            className="w-full"
          />
          <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
            <span>Enable Gameplay SFX</span>
            <input
              type="checkbox"
              checked={audio.sfxEnabled}
              onChange={(e) => {
                audioSynth.setMuted(!e.target.checked);
                onUpdateProject({ audio: { ...audio, sfxEnabled: e.target.checked } });
              }}
              className="accent-amber-500"
            />
          </label>
        </div>

        <div className="p-3.5 rounded-lg bg-[#14161B] border border-white/8 space-y-2.5">
          <div className="text-xs font-semibold text-white">Environment Soundscape</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                ['none', 'Silent'],
                ['wind', 'Alpine Wind'],
                ['synth_pad', 'Sky Synth Pad'],
                ['arena_pulse', 'Arena Drone'],
              ] as const
            ).map(([mood, label]) => (
              <button
                key={mood}
                type="button"
                onClick={() => {
                  onUpdateProject({ audio: { ...audio, ambientMood: mood } });
                  audioSynth.playAmbientPreview(mood);
                }}
                className={`py-1.5 px-2 rounded text-xs font-medium ${
                  audio.ambientMood === mood
                    ? 'bg-amber-500 text-zinc-950 font-semibold'
                    : 'bg-[#1C1F26] text-zinc-300 hover:bg-[#252A34]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#14161B] border border-white/8 space-y-2.5">
          <div className="text-xs font-semibold text-white">Audition Procedural SFX</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => audioSynth.playJump()}
              className="py-1.5 rounded bg-[#1C1F26] hover:bg-[#252A34] text-xs text-zinc-200"
            >
              Jump Impulse
            </button>
            <button
              type="button"
              onClick={() => audioSynth.playPickup()}
              className="py-1.5 rounded bg-[#1C1F26] hover:bg-[#252A34] text-xs text-zinc-200"
            >
              Item Pickup
            </button>
            <button
              type="button"
              onClick={() => audioSynth.playDoorOpen()}
              className="py-1.5 rounded bg-[#1C1F26] hover:bg-[#252A34] text-xs text-zinc-200"
            >
              Vault Hydraulics
            </button>
            <button
              type="button"
              onClick={() => audioSynth.playVictory()}
              className="py-1.5 rounded bg-[#1C1F26] hover:bg-[#252A34] text-xs text-zinc-200"
            >
              Victory Cue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
