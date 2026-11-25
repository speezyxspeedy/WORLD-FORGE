import React, { useMemo, useState } from 'react';
import {
  Award,
  Cpu,
  Info,
  Monitor,
  Play,
  RotateCcw,
  Save,
  Sliders,
} from 'lucide-react';
import type {
  CreatorProfile,
  GraphicsSettings,
  PublishedGame,
  QualityPreset,
  StudioTier,
  WorldProject,
} from '../types/world';
import {
  detectHardwareProfile,
  getGraphicsPresetConfig,
} from '../services/hardwareDetect';
import { sanitizeUserText } from '../services/validation';

interface ProfilePageProps {
  profile: CreatorProfile;
  projects: WorldProject[];
  publishedGames: PublishedGame[];
  onUpdateProfile: (profile: CreatorProfile) => void;
  onPlayGame: (game: PublishedGame) => void;
}

export const CreatorProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  projects,
  publishedGames,
  onUpdateProfile,
  onPlayGame,
}) => {
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [savedNotice, setSavedNotice] = useState(false);

  const myPublished = publishedGames.filter(
    (g) => !g.isDemoContent || g.creatorName === profile.username
  );
  const totalVisits = myPublished.reduce((sum, g) => sum + g.visits, 0);
  const activeHours = (profile.activeBuildSeconds / 3600).toFixed(1);
  const idleMinutes = Math.round(profile.idleSeconds / 60);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-center gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-amber-400" />
        <span>
          <strong>Local Demo Profile:</strong> Stored in your browser&apos;s IndexedDB. Cloud authentication and cross-device account syncing require external auth credentials.
        </span>
      </div>

      {/* Header Card */}
      <section className="p-6 rounded-2xl bg-[#161C28] border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col sm:flex-row gap-5 items-start">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-display font-bold text-slate-950 shrink-0"
            style={{ backgroundColor: profile.avatarColor }}
          >
            {profile.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-3 flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                aria-label="Creator username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10 text-lg font-display font-bold text-white"
              />
              <span className="text-xs text-amber-400 font-medium tabular-nums">
                Creator Level {profile.level}
              </span>
            </div>
            <textarea
              rows={2}
              aria-label="Creator bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-slate-200"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onUpdateProfile({
                    ...profile,
                    username: sanitizeUserText(username, 32) || profile.username,
                    bio: sanitizeUserText(bio, 240),
                  });
                  setSavedNotice(true);
                  setTimeout(() => setSavedNotice(false), 1800);
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {savedNotice ? 'Profile Saved' : 'Save Profile'}
              </button>
              <span className="text-xs text-slate-400 tabular-nums">
                {profile.followers} Followers · {profile.following.length} Following
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-[#0B0E14] border border-white/5">
            <div className="text-xs text-slate-400">Active Creation Time</div>
            <div className="text-2xl font-mono font-bold tabular-nums text-amber-400 mt-1">
              {activeHours}h
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {idleMinutes}m idle tracked separately
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0E14] border border-white/5">
            <div className="text-xs text-slate-400">Projects &amp; Releases</div>
            <div className="text-2xl font-mono font-bold tabular-nums text-white mt-1">
              {projects.length} / {myPublished.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {totalVisits.toLocaleString()} total visits
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Creator Achievements
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {profile.achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-xl border ${
                ach.unlocked
                  ? 'bg-[#161C28] border-amber-500/30'
                  : 'bg-[#111620] border-white/5 opacity-60'
              }`}
            >
              <div className="text-xs font-medium text-amber-400">
                {ach.unlocked ? 'Unlocked' : 'Locked'}
              </div>
              <div className="text-sm font-semibold text-white mt-1">{ach.title}</div>
              <p className="text-xs text-slate-400 mt-1">{ach.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Published Games List */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-white">Published Games</h2>
        {myPublished.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {myPublished.map((g) => (
              <div
                key={g.id}
                className="rounded-xl overflow-hidden bg-[#161C28] border border-white/10"
              >
                <img
                  src={g.thumbnail}
                  alt={g.title}
                  referrerPolicy="no-referrer"
                  className="w-full aspect-video object-cover"
                />
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{g.title}</div>
                    <div className="text-xs text-slate-400 tabular-nums">
                      v{g.version} · {g.visits} visits
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlayGame(g)}
                    className="px-3 py-1.5 rounded-md bg-teal-600 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Play
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-[#161C28] border border-white/8 text-center text-xs text-slate-400">
            You haven&apos;t published any custom worlds yet. Open a project in Studio and use the Publish tab to launch it into Discover!
          </div>
        )}
      </section>
    </div>
  );
};

interface SettingsPageProps {
  graphics: GraphicsSettings;
  studioTier: StudioTier;
  onUpdateGraphics: (g: GraphicsSettings) => void;
  onChangeStudioTier: (tier: StudioTier) => void;
  onResetLocalData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  graphics,
  studioTier,
  onUpdateGraphics,
  onChangeStudioTier,
  onResetLocalData,
}) => {
  const hw = useMemo(() => detectHardwareProfile(), []);
  const [resetDone, setResetDone] = useState(false);

  const presets: QualityPreset[] = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA', 'CUSTOM'];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
          Engine &amp; Hardware Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          WORLD FORGE automatically adapts rendering budgets for integrated graphics while preserving full source project quality.
        </p>
      </div>

      {/* Hardware Capability Diagnostics */}
      <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Cpu className="w-4 h-4 text-amber-400" />
          Detected Device Capabilities
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#0B0E14]">
            <div className="text-slate-400">Active Backend</div>
            <div className="text-white font-medium mt-1">{hw.rendererBackend}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B0E14]">
            <div className="text-slate-400">WebGL Renderer</div>
            <div className="text-white font-medium mt-1 truncate" title={hw.gpuRenderer}>
              {hw.gpuRenderer}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B0E14]">
            <div className="text-slate-400">CPU Threads / RAM</div>
            <div className="text-white font-mono tabular-nums mt-1">
              {hw.logicalCores} threads · {hw.deviceMemoryGb ? `${hw.deviceMemoryGb} GB` : 'Auto'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B0E14]">
            <div className="text-slate-400">Recommended Preset</div>
            <div className="text-amber-400 font-semibold mt-1">{hw.recommendedPreset}</div>
          </div>
        </div>
      </section>

      {/* Graphics Quality Presets */}
      <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Monitor className="w-4 h-4 text-amber-400" />
          Graphics Quality Preset
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onUpdateGraphics(getGraphicsPresetConfig(p))}
              className={`py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                graphics.preset === p
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-[#0B0E14] text-slate-300 hover:bg-[#1E2636]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Viewport Resolution Scale</span>
              <span className="font-mono tabular-nums">
                {Math.round(graphics.resolutionScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={graphics.resolutionScale}
              onChange={(e) =>
                onUpdateGraphics({
                  ...graphics,
                  preset: 'CUSTOM',
                  resolutionScale: Number(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Max Scene Object Budget</span>
              <span className="font-mono tabular-nums">{graphics.maxObjects}</span>
            </div>
            <input
              type="range"
              min={150}
              max={1200}
              step={50}
              value={graphics.maxObjects}
              onChange={(e) =>
                onUpdateGraphics({
                  ...graphics,
                  preset: 'CUSTOM',
                  maxObjects: Number(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          <label className="flex items-center justify-between p-3 rounded-lg bg-[#0B0E14] text-xs text-slate-200 cursor-pointer">
            <span>Directional Shadows (GPU Only)</span>
            <input
              type="checkbox"
              checked={graphics.shadowsEnabled}
              onChange={(e) =>
                onUpdateGraphics({
                  ...graphics,
                  preset: 'CUSTOM',
                  shadowsEnabled: e.target.checked,
                })
              }
              className="accent-amber-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-[#0B0E14] text-xs text-slate-200 cursor-pointer">
            <span>Atmospheric Horizon Fog</span>
            <input
              type="checkbox"
              checked={graphics.fogEnabled}
              onChange={(e) =>
                onUpdateGraphics({
                  ...graphics,
                  preset: 'CUSTOM',
                  fogEnabled: e.target.checked,
                })
              }
              className="accent-amber-500"
            />
          </label>
        </div>
      </section>

      {/* Studio Experience Tier */}
      <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sliders className="w-4 h-4 text-amber-400" />
          Adaptive Creator Studio Preset
        </div>
        <p className="text-xs text-slate-400">
          Choose your preferred workspace layout density. Every tier preserves full zero-code creative freedom.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['Creator Studio', 'Advanced Studio', 'Pro Studio', 'AAA Studio'] as StudioTier[]).map(
            (tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => onChangeStudioTier(tier)}
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  studioTier === tier
                    ? 'bg-amber-500/15 border-amber-400 text-white'
                    : 'bg-[#0B0E14] border-white/8 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="text-xs font-semibold">{tier}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {tier === 'Creator Studio'
                    ? 'Clean guided toolbar & templates'
                    : tier === 'Advanced Studio'
                    ? 'Expanded logic & gameplay panels'
                    : tier === 'Pro Studio'
                    ? 'Full material, terrain & timeline tools'
                    : 'All engine subsystems unlocked'}
                </div>
              </button>
            )
          )}
        </div>
      </section>

      {/* Local Storage Reset */}
      <section className="p-5 rounded-xl bg-[#161C28] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Local IndexedDB Persistence</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Restore default starter templates and demo worlds if you want a clean slate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onResetLocalData();
            setResetDone(true);
            setTimeout(() => setResetDone(false), 2000);
          }}
          className="px-4 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {resetDone ? 'Demo Data Restored' : 'Reset Demo Data'}
        </button>
      </section>
    </div>
  );
};
