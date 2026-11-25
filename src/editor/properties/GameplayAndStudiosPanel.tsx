import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Film,
  Globe,
  Info,
  Play,
  Plus,
  Rocket,
  Shield,
  Sliders,
  Trash2,
  User,
  Users,
  Volume2,
} from 'lucide-react';
import {
  GAME_CATEGORIES,
  type CollaboratorRole,
  type GameCategory,
  type TemplateType,
  type WorldProject,
} from '../../types/world';
import { validateProjectForPublish, sanitizeUserText } from '../../services/validation';
import { DEMO_THUMBNAILS } from '../../world-format/templates';
import { audioSynth } from '../../services/audioSynth';

export type StudioWorkspaceTab =
  | 'world'
  | 'gameplay'
  | 'logic'
  | 'character_ui'
  | 'cinematic_audio'
  | 'multiplayer_publish';

interface GameplayAndStudiosPanelProps {
  activeTab: Exclude<StudioWorkspaceTab, 'world' | 'logic'>;
  project: WorldProject;
  cinematicPreviewActive: boolean;
  onUpdateProject: (patch: Partial<WorldProject>) => void;
  onApplyTemplate: (template: TemplateType) => void;
  onToggleCinematicPreview: () => void;
  onPublishProject: (opts: {
    title: string;
    description: string;
    category: GameCategory;
    thumbnail: string;
    visibility: 'public' | 'unlisted';
  }) => void;
}

export const GameplayAndStudiosPanel: React.FC<GameplayAndStudiosPanelProps> = ({
  activeTab,
  project,
  cinematicPreviewActive,
  onUpdateProject,
  onApplyTemplate,
  onToggleCinematicPreview,
  onPublishProject,
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<CollaboratorRole>('Editor');
  const [publishVisibility, setPublishVisibility] = useState<'public' | 'unlisted'>('public');
  const [copiedCode, setCopiedCode] = useState(false);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);

  const validation = useMemo(() => validateProjectForPublish(project), [project]);

  if (activeTab === 'gameplay') {
    const gp = project.gameplay;
    return (
      <div className="h-full overflow-y-auto bg-[#0B0E14] p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Gameplay Rules &amp; Mechanics</h2>
              <p className="text-sm text-slate-400 mt-1">
                Configure match rules, teams, player physics, and win conditions visually without code.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onApplyTemplate('parkour')}
                className="px-3 py-2 rounded-lg bg-[#161C28] hover:bg-[#1E2636] border border-white/10 text-xs font-medium text-slate-200 whitespace-nowrap"
              >
                Load Parkour Template
              </button>
              <button
                type="button"
                onClick={() => onApplyTemplate('tdm')}
                className="px-3 py-2 rounded-lg bg-[#161C28] hover:bg-[#1E2636] border border-white/10 text-xs font-medium text-slate-200 whitespace-nowrap"
              >
                Load Team Deathmatch Template
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Rules */}
            <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Identity &amp; Match Setup
              </h3>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Game Title</label>
                <input
                  type="text"
                  value={project.title}
                  onChange={(e) => onUpdateProject({ title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-sm text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Description</label>
                <textarea
                  rows={3}
                  value={project.description}
                  onChange={(e) => onUpdateProject({ description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Max Players</label>
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
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-sm font-mono tabular-nums text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Match Duration (sec)</label>
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
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-sm font-mono tabular-nums text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Win Condition</label>
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
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-sm text-white"
                  >
                    <option value="reach_checkpoint">Reach Goal Checkpoint</option>
                    <option value="reach_score">Reach Score Limit</option>
                    <option value="survive_timer">Survive Countdown</option>
                    <option value="eliminate_targets">Eliminate Targets</option>
                    <option value="free_play">Open Sandbox (No Timer)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Score Limit</label>
                  <input
                    type="number"
                    min={10}
                    max={10000}
                    value={gp.scoreLimit}
                    onChange={(e) =>
                      onUpdateProject({
                        gameplay: { ...gp, scoreLimit: Math.max(10, Number(e.target.value)) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-sm font-mono tabular-nums text-white"
                  />
                </div>
              </div>
            </section>

            {/* Player Health, Teams, Physics, Inventory */}
            <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
              <h3 className="text-sm font-semibold text-white">Player Physics &amp; Combat</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Player Max Health</label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={gp.playerHealth}
                    onChange={(e) =>
                      onUpdateProject({
                        gameplay: { ...gp, playerHealth: Math.max(10, Number(e.target.value)) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-sm font-mono tabular-nums text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Respawn Time (sec)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={gp.respawnTime}
                    onChange={(e) =>
                      onUpdateProject({
                        gameplay: { ...gp, respawnTime: Math.max(0, Number(e.target.value)) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-sm font-mono tabular-nums text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Gravity</label>
                  <input
                    type="number"
                    min={8}
                    max={50}
                    value={gp.gravity}
                    onChange={(e) =>
                      onUpdateProject({ gameplay: { ...gp, gravity: Number(e.target.value) } })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10 text-sm font-mono tabular-nums text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Jump Force</label>
                  <input
                    type="number"
                    min={4}
                    max={25}
                    step={0.5}
                    value={gp.jumpForce}
                    onChange={(e) =>
                      onUpdateProject({ gameplay: { ...gp, jumpForce: Number(e.target.value) } })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10 text-sm font-mono tabular-nums text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Move Speed</label>
                  <input
                    type="number"
                    min={3}
                    max={24}
                    step={0.5}
                    value={gp.moveSpeed}
                    onChange={(e) =>
                      onUpdateProject({ gameplay: { ...gp, moveSpeed: Number(e.target.value) } })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10 text-sm font-mono tabular-nums text-white"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between text-xs text-slate-200 pt-1 cursor-pointer">
                <span>Enable Teams ({gp.teamNames.join(' vs ')})</span>
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

              {/* Starting Inventory */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <label className="text-xs text-slate-400 block">Starting Inventory</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add item (e.g. Flashlight, Gold Key)"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = sanitizeUserText(newItemText, 40);
                      if (!clean) return;
                      onUpdateProject({
                        gameplay: {
                          ...gp,
                          startingInventory: [...gp.startingInventory, clean],
                        },
                      });
                      setNewItemText('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gp.startingInventory.map((item, idx) => (
                    <span
                      key={`${item}_${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0E14] border border-white/10 text-xs text-slate-200"
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
                        className="text-slate-500 hover:text-rose-400"
                        aria-label={`Remove ${item}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {gp.startingInventory.length === 0 && (
                    <span className="text-xs text-slate-500">No starting items configured.</span>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'character_ui') {
    const ch = project.character;
    const ui = project.customUI;
    return (
      <div className="h-full overflow-y-auto bg-[#0B0E14] p-6 lg:p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Character Studio */}
          <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Character Creator Studio</h2>
            </div>
            <p className="text-xs text-slate-400">
              Customize the playable 3rd-person avatar rendered live during Playtest mode.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Archetype</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['human', 'scifi', 'fantasy', 'robot'] as const).map((arch) => (
                  <button
                    key={arch}
                    type="button"
                    onClick={() => onUpdateProject({ character: { ...ch, archetype: arch } })}
                    className={`py-2 rounded-md text-xs font-medium capitalize ${
                      ch.archetype === arch
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-[#0B0E14] text-slate-300 hover:bg-[#1E2636]'
                    }`}
                  >
                    {arch}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Back / Arm Equipment Attachment</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['none', 'jetpack', 'shield', 'cape'] as const).map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => onUpdateProject({ character: { ...ch, equipment: eq } })}
                    className={`py-2 rounded-md text-xs font-medium capitalize ${
                      ch.equipment === eq
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-[#0B0E14] text-slate-300 hover:bg-[#1E2636]'
                    }`}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="space-y-1 block">
                <span className="text-xs text-slate-400">Primary Suit</span>
                <input
                  type="color"
                  value={ch.primaryColor}
                  onChange={(e) => onUpdateProject({ character: { ...ch, primaryColor: e.target.value } })}
                  className="w-full h-9 rounded bg-transparent cursor-pointer"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs text-slate-400">Secondary Gear</span>
                <input
                  type="color"
                  value={ch.secondaryColor}
                  onChange={(e) =>
                    onUpdateProject({ character: { ...ch, secondaryColor: e.target.value } })
                  }
                  className="w-full h-9 rounded bg-transparent cursor-pointer"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs text-slate-400">Visor / Accent</span>
                <input
                  type="color"
                  value={ch.visorColor}
                  onChange={(e) => onUpdateProject({ character: { ...ch, visorColor: e.target.value } })}
                  className="w-full h-9 rounded bg-transparent cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Body Proportions Scale</span>
                <span className="font-mono tabular-nums">{ch.bodyScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.75}
                max={1.35}
                step={0.05}
                value={ch.bodyScale}
                onChange={(e) =>
                  onUpdateProject({ character: { ...ch, bodyScale: Number(e.target.value) } })
                }
                className="w-full"
              />
            </div>

            <div className="p-3 rounded-lg bg-[#0B0E14] border border-white/5 text-xs text-slate-400">
              Custom GLB/glTF Rig Import Pipeline: Architecture prepared for licensed model upload; procedural composite rigs are active in browser runtime.
            </div>
          </section>

          {/* Custom Game UI Studio */}
          <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
            <h2 className="text-base font-semibold text-white">Custom Game UI &amp; HUD Studio</h2>
            <p className="text-xs text-slate-400">
              Design the in-game player HUD visually. Changes take effect immediately in Playtest.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Objective Banner Copy</label>
              <input
                type="text"
                value={ui.objectiveBanner}
                onChange={(e) =>
                  onUpdateProject({ customUI: { ...ui, objectiveBanner: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>HUD Accent Color</span>
              <input
                type="color"
                value={ui.hudAccent}
                onChange={(e) => onUpdateProject({ customUI: { ...ui, hudAccent: e.target.value } })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {(
                [
                  ['showHealthBar', 'Health Vitality Bar'],
                  ['showScore', 'Score Readout'],
                  ['showTimer', 'Countdown Timer'],
                  ['showInventory', 'Inventory Strip'],
                  ['showMinimap', 'Radar Minimap'],
                  ['showCrosshair', 'Center Crosshair'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B0E14] border border-white/5 text-xs text-slate-200 cursor-pointer"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={ui[key]}
                    onChange={(e) =>
                      onUpdateProject({ customUI: { ...ui, [key]: e.target.checked } })
                    }
                    className="accent-amber-500"
                  />
                </label>
              ))}
            </div>

            {/* Live Mini HUD Preview */}
            <div className="relative h-36 rounded-lg bg-[#0B0E14] border border-white/10 p-3 overflow-hidden">
              <div className="flex justify-between items-start text-[11px]">
                {ui.showHealthBar && (
                  <div className="space-y-1">
                    <div className="text-slate-400">HP 100</div>
                    <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full w-4/5" style={{ backgroundColor: ui.hudAccent }} />
                    </div>
                  </div>
                )}
                {ui.showScore && (
                  <div className="font-mono tabular-nums text-white font-semibold">SCORE 120</div>
                )}
                {ui.showTimer && (
                  <div className="font-mono tabular-nums text-slate-300">02:45</div>
                )}
              </div>
              {ui.showCrosshair && (
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border"
                  style={{ borderColor: ui.hudAccent }}
                />
              )}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between text-[10px] text-slate-300">
                <span className="truncate max-w-[65%]">{ui.objectiveBanner}</span>
                {ui.showMinimap && (
                  <div className="w-10 h-10 rounded border border-white/15 bg-slate-900/90 flex items-center justify-center text-[9px] text-slate-400">
                    MAP
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (activeTab === 'cinematic_audio') {
    return (
      <div className="h-full overflow-y-auto bg-[#0B0E14] p-6 lg:p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cinematic Timeline */}
          <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-semibold text-white">Cinematic Camera Timeline</h2>
              </div>
              <button
                type="button"
                onClick={onToggleCinematicPreview}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  cinematicPreviewActive
                    ? 'bg-rose-500 text-white'
                    : 'bg-teal-600 hover:bg-teal-500 text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                {cinematicPreviewActive ? 'Stop Preview' : 'Preview in 3D'}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Sequence keyframed intro cameras and story captions without writing code.
            </p>

            <div className="space-y-2.5">
              {project.cinematics.map((kf, idx) => (
                <div
                  key={kf.id}
                  className="p-3 rounded-lg bg-[#0B0E14] border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-300 font-mono tabular-nums">
                      Keyframe {idx + 1} · {kf.time}s
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateProject({
                          cinematics: project.cinematics.filter((c) => c.id !== kf.id),
                        })
                      }
                      className="text-slate-400 hover:text-rose-400"
                      aria-label={`Delete keyframe ${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={kf.caption}
                    onChange={(e) =>
                      onUpdateProject({
                        cinematics: project.cinematics.map((c) =>
                          c.id === kf.id ? { ...c, caption: e.target.value } : c
                        ),
                      })
                    }
                    placeholder="Cutscene subtitle caption"
                    className="w-full px-2.5 py-1.5 rounded bg-[#161C28] border border-white/5 text-xs text-white"
                  />
                  <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono">
                    <input
                      type="number"
                      value={kf.time}
                      onChange={(e) =>
                        onUpdateProject({
                          cinematics: project.cinematics.map((c) =>
                            c.id === kf.id ? { ...c, time: Math.max(0, Number(e.target.value)) } : c
                          ),
                        })
                      }
                      className="px-2 py-1 rounded bg-[#161C28] text-white"
                      title="Time (s)"
                    />
                    {(['x', 'y', 'z'] as const).map((axis) => (
                      <input
                        key={axis}
                        type="number"
                        value={kf.position[axis]}
                        onChange={(e) =>
                          onUpdateProject({
                            cinematics: project.cinematics.map((c) =>
                              c.id === kf.id
                                ? {
                                    ...c,
                                    position: { ...c.position, [axis]: Number(e.target.value) },
                                  }
                                : c
                            ),
                          })
                        }
                        className="px-2 py-1 rounded bg-[#161C28] text-white"
                        title={`Camera ${axis.toUpperCase()}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  onUpdateProject({
                    cinematics: [
                      ...project.cinematics,
                      {
                        id: `kf_${Date.now().toString(36)}`,
                        time: project.cinematics.length * 3,
                        position: { x: 14, y: 12, z: 18 },
                        lookAt: { x: 0, y: 2, z: 0 },
                        caption: 'New Camera Angle',
                      },
                    ],
                  })
                }
                className="w-full py-2 rounded-lg bg-[#0B0E14] hover:bg-[#1E2636] border border-dashed border-white/15 text-xs text-slate-300 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Camera Keyframe
              </button>
            </div>
          </section>

          {/* Audio Studio */}
          <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Procedural Audio Studio</h2>
            </div>
            <p className="text-xs text-slate-400">
              All gameplay footsteps, jumps, door hydraulics, and victory cues synthesize in real time via Web Audio.
            </p>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Master Output Volume</span>
                <span className="font-mono tabular-nums">
                  {Math.round(project.audio.masterVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={project.audio.masterVolume}
                onChange={(e) => {
                  const vol = Number(e.target.value);
                  audioSynth.setVolume(vol);
                  onUpdateProject({ audio: { ...project.audio, masterVolume: vol } });
                }}
                className="w-full"
              />
            </div>

            <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
              <span>Enable Gameplay SFX</span>
              <input
                type="checkbox"
                checked={project.audio.sfxEnabled}
                onChange={(e) => {
                  audioSynth.setMuted(!e.target.checked);
                  onUpdateProject({ audio: { ...project.audio, sfxEnabled: e.target.checked } });
                }}
                className="accent-amber-500"
              />
            </label>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-xs text-slate-400">Audition Procedural Sound Effects</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => audioSynth.playJump()}
                  className="py-2 rounded-lg bg-[#0B0E14] hover:bg-[#1E2636] text-xs text-slate-200"
                >
                  Test Jump Synth
                </button>
                <button
                  type="button"
                  onClick={() => audioSynth.playPickup()}
                  className="py-2 rounded-lg bg-[#0B0E14] hover:bg-[#1E2636] text-xs text-slate-200"
                >
                  Test Pickup Chime
                </button>
                <button
                  type="button"
                  onClick={() => audioSynth.playDoorOpen()}
                  className="py-2 rounded-lg bg-[#0B0E14] hover:bg-[#1E2636] text-xs text-slate-200"
                >
                  Test Vault Door
                </button>
                <button
                  type="button"
                  onClick={() => audioSynth.playVictory()}
                  className="py-2 rounded-lg bg-[#0B0E14] hover:bg-[#1E2636] text-xs text-slate-200"
                >
                  Test Victory Fanfare
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Multiplayer & Publishing Studio
  const mp = project.multiplayer;
  return (
    <div className="h-full overflow-y-auto bg-[#0B0E14] p-6 lg:p-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guided Publishing Workflow */}
        <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Publishing Workflow</h2>
            </div>
            <span className="text-xs text-slate-400 tabular-nums">
              {project.status === 'published'
                ? `Published v${project.publishedVersion}`
                : 'Draft Snapshot'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Publishing creates an immutable playable snapshot in Discover while keeping your draft safely editable.
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">1. Game Name</label>
              <input
                type="text"
                value={project.title}
                onChange={(e) => onUpdateProject({ title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-sm text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">2. Description</label>
              <textarea
                rows={2}
                value={project.description}
                onChange={(e) => onUpdateProject({ description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">3. Category</label>
                <select
                  value={project.category}
                  onChange={(e) =>
                    onUpdateProject({ category: e.target.value as GameCategory })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                >
                  {GAME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">4. Visibility</label>
                <select
                  value={publishVisibility}
                  onChange={(e) =>
                    setPublishVisibility(e.target.value as 'public' | 'unlisted')
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                >
                  <option value="public">Public (Listed in Discover)</option>
                  <option value="unlisted">Unlisted (Direct Link Only)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">5. Cover Artwork</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(DEMO_THUMBNAILS).map(([key, src]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onUpdateProject({ thumbnail: src })}
                    className={`rounded-md overflow-hidden border-2 transition-colors aspect-video ${
                      project.thumbnail === src ? 'border-amber-400' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={src}
                      alt={`${key} cover artwork`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 6 Validation Checklist */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="text-xs font-semibold text-white">6. Pre-Publish Validation</div>
            {validation.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-[#0B0E14] text-xs"
              >
                {item.status === 'pass' ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      item.status === 'error' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  />
                )}
                <div>
                  <div className="font-medium text-slate-200">{item.label}</div>
                  <div className="text-[11px] text-slate-400">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={!validation.canPublish}
            onClick={() => {
              onPublishProject({
                title: sanitizeUserText(project.title, 80),
                description: sanitizeUserText(project.description, 400),
                category: project.category,
                thumbnail: project.thumbnail,
                visibility: publishVisibility,
              });
              setPublishSuccessMsg(
                project.status === 'published'
                  ? `Updated live snapshot v${project.publishedVersion + 1} in Discover!`
                  : 'Published live to Discover marketplace!'
              );
            }}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-semibold text-sm transition-colors"
          >
            {project.status === 'published'
              ? `Update Published Snapshot (v${project.publishedVersion + 1})`
              : 'Publish World to Discover'}
          </button>

          {publishSuccessMsg && (
            <div className="p-3 rounded-lg bg-teal-500/15 border border-teal-500/30 text-xs text-teal-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {publishSuccessMsg}
            </div>
          )}

          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
            <span>Supported Target: WebGL2 Browser</span>
            <span>Planned Roadmap: Windows · Android Native</span>
          </div>
        </section>

        {/* Multiplayer Foundation (Honest Local Demo Mode) */}
        <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              <h2 className="text-base font-semibold text-white">Multiplayer &amp; Co-Editing</h2>
            </div>
            <span className="text-xs text-amber-300 font-medium">Local Demo Mode</span>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <strong>Real-time networking credentials are not configured.</strong> Session roles, invite codes, and state boundaries run in honest local demo mode ready for a WebSocket / server-authoritative relay backend.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Session Channel</label>
              <select
                value={mp.collaborationChannel}
                onChange={(e) =>
                  onUpdateProject({
                    multiplayer: {
                      ...mp,
                      collaborationChannel: e.target.value as 'editing' | 'gameplay',
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              >
                <option value="editing">Collaborative World Editing</option>
                <option value="gameplay">Gameplay Multiplayer Match</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Session Access</label>
              <select
                value={mp.sessionVisibility}
                onChange={(e) =>
                  onUpdateProject({
                    multiplayer: {
                      ...mp,
                      sessionVisibility: e.target.value as 'public' | 'private',
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              >
                <option value="public">Public Lobby</option>
                <option value="private">Private (Invite Code Only)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B0E14] border border-white/10 flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] text-slate-400">Session Invite Code</div>
              <div className="text-sm font-mono font-semibold text-white tracking-wider">
                {mp.inviteCode}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(mp.inviteCode).catch(() => {});
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 1800);
              }}
              className="px-3 py-1.5 rounded-md bg-[#1E2636] hover:bg-[#273247] text-xs text-slate-200 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedCode ? 'Copied' : 'Copy Code'}
            </button>
          </div>

          {/* Creator Permissions Roster */}
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Collaborators &amp; Permissions
            </div>
            <div className="space-y-1.5">
              {mp.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0B0E14] text-xs"
                >
                  <div>
                    <div className="font-medium text-white">{m.username}</div>
                    <div className="text-[11px] text-slate-500">
                      {m.status === 'local_host' ? 'Local Host' : 'Demo Roster Entry'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      disabled={m.status === 'local_host'}
                      onChange={(e) =>
                        onUpdateProject({
                          multiplayer: {
                            ...mp,
                            members: mp.members.map((mem) =>
                              mem.id === m.id
                                ? { ...mem, role: e.target.value as CollaboratorRole }
                                : mem
                            ),
                          },
                        })
                      }
                      className="px-2 py-1 rounded bg-[#161C28] border border-white/10 text-xs text-slate-200"
                    >
                      <option value="Owner">Owner</option>
                      <option value="Editor">Editor</option>
                      <option value="Tester">Tester</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                    {m.status !== 'local_host' && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProject({
                            multiplayer: {
                              ...mp,
                              members: mp.members.filter((mem) => mem.id !== m.id),
                            },
                          })
                        }
                        className="text-slate-500 hover:text-rose-400"
                        aria-label={`Remove ${m.username}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Invite username..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as CollaboratorRole)}
                className="px-2 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              >
                <option value="Editor">Editor</option>
                <option value="Tester">Tester</option>
                <option value="Viewer">Viewer</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  const clean = sanitizeUserText(newMemberName, 32);
                  if (!clean) return;
                  onUpdateProject({
                    multiplayer: {
                      ...mp,
                      members: [
                        ...mp.members,
                        {
                          id: `mem_${Date.now().toString(36)}`,
                          username: clean,
                          role: newMemberRole,
                          status: 'offline_demo',
                        },
                      ],
                    },
                  });
                  setNewMemberName('');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#1E2636] hover:bg-[#2A354B] text-xs font-medium text-white whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
            <Globe className="w-3.5 h-3.5" />
            Server-authoritative sync schema v{project.schemaVersion} ready
          </div>
        </section>
      </div>
    </div>
  );
};
