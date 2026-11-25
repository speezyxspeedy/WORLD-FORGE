import React, { useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Globe2,
  Package,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type {
  MarketplaceAsset,
  PublishedGame,
  Universe,
  WorldProject,
} from '../types/world';
import { MARKETPLACE_DEMO_ASSETS } from '../editor/assets/assetCatalog';
import { sanitizeUserText } from '../services/validation';

interface CommunityPageProps {
  universes: Universe[];
  publishedGames: PublishedGame[];
  projects: WorldProject[];
  onCreateUniverse: (name: string, description: string, sharedOptIn: boolean) => void;
  onInstallAssetToProject: (projectId: string, asset: MarketplaceAsset) => void;
  onPlayGame: (game: PublishedGame) => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({
  universes,
  publishedGames,
  projects,
  onCreateUniverse,
  onInstallAssetToProject,
  onPlayGame,
}) => {
  const [section, setSection] = useState<'universes' | 'marketplace' | 'studios'>('universes');
  const [univName, setUnivName] = useState('');
  const [univDesc, setUnivDesc] = useState('');
  const [sharedOptIn, setSharedOptIn] = useState(true);
  const [targetProjectId, setTargetProjectId] = useState(projects[0]?.id || '');
  const [installedIds, setInstalledIds] = useState<string[]>([]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
            Community Ecosystem
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect worlds into shared Universes, browse licensed Asset Packs, and organize virtual Game Studios.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#161C28] border border-white/8">
          <button
            type="button"
            onClick={() => setSection('universes')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
              section === 'universes'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            Universes
          </button>
          <button
            type="button"
            onClick={() => setSection('marketplace')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
              section === 'marketplace'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Asset Marketplace
          </button>
          <button
            type="button"
            onClick={() => setSection('studios')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
              section === 'studios'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Creator Studios
          </button>
        </div>
      </div>

      {section === 'universes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            {universes.map((u) => {
              const linkedWorlds = publishedGames.filter((g) => u.worldIds.includes(g.id));
              return (
                <article
                  key={u.id}
                  className="p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-amber-400">
                        Interconnected Universe · Created by {u.creatorName}
                      </div>
                      <h2 className="text-lg font-display font-semibold text-white mt-0.5">
                        {u.name}
                      </h2>
                    </div>
                    <span className="text-xs text-teal-300">
                      {u.sharedProgressionOptIn
                        ? 'Cross-World Progression Opt-In'
                        : 'Isolated Worlds'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{u.description}</p>

                  {linkedWorlds.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {linkedWorlds.map((w) => (
                        <div
                          key={w.id}
                          className="p-3 rounded-lg bg-[#0B0E14] border border-white/8 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {w.title}
                            </div>
                            <div className="text-[11px] text-slate-400">{w.category}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onPlayGame(w)}
                            className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium shrink-0"
                          >
                            Enter
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <aside className="lg:col-span-4 p-5 rounded-xl bg-[#161C28] border border-white/10 space-y-4 h-fit">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Compass className="w-4 h-4 text-amber-400" />
              Create New Universe
            </div>
            <p className="text-xs text-slate-400">
              Group multiple published worlds with visual portal transitions and explicit opt-in shared progression.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = sanitizeUserText(univName, 60);
                const desc = sanitizeUserText(univDesc, 200);
                if (name.length < 3) return;
                onCreateUniverse(
                  name,
                  desc || 'Custom interconnected universe built in WORLD FORGE.',
                  sharedOptIn
                );
                setUnivName('');
                setUnivDesc('');
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                minLength={3}
                placeholder="Universe name (e.g. Solar Frontier)"
                value={univName}
                onChange={(e) => setUnivName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              />
              <textarea
                rows={3}
                placeholder="Shared lore & connected worlds description..."
                value={univDesc}
                onChange={(e) => setUnivDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              />
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Opt-in Shared Inventory</span>
                <input
                  type="checkbox"
                  checked={sharedOptIn}
                  onChange={(e) => setSharedOptIn(e.target.checked)}
                  className="accent-amber-500"
                />
              </label>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Universe
              </button>
            </form>
          </aside>
        </div>
      )}

      {section === 'marketplace' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-[#161C28] border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              All assets display explicit licensing metadata. Add free demo prefabs straight into any local project.
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Target Project:</span>
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MARKETPLACE_DEMO_ASSETS.map((asset) => {
              const isAdded = installedIds.includes(asset.id);
              return (
                <div
                  key={asset.id}
                  className="p-5 rounded-xl bg-[#161C28] border border-white/8 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{asset.category} · {asset.priceLabel}</span>
                      <span className="tabular-nums">★ {asset.rating.toFixed(1)}</span>
                    </div>
                    <h3 className="text-base font-display font-semibold text-white">{asset.name}</h3>
                    <p className="text-xs text-slate-400">{asset.description}</p>
                    <div className="text-[11px] text-slate-500 pt-1">
                      By {asset.creator} · License: {asset.license} ·{' '}
                      {asset.downloads.toLocaleString()} installs
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!targetProjectId}
                    onClick={() => {
                      if (!targetProjectId) return;
                      onInstallAssetToProject(targetProjectId, asset);
                      setInstalledIds((prev) => [...prev, asset.id]);
                    }}
                    className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      isAdded
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'bg-[#1E2636] hover:bg-amber-500 hover:text-slate-950 text-white'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Added to Project
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Add Prefab to Project
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {section === 'studios' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-[#161C28] border border-white/10 space-y-4">
            <div className="text-xs text-amber-400 font-medium">Local Studio Workspace</div>
            <h2 className="text-xl font-display font-bold text-white">Forge Collective (Demo Studio)</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Organize solo or team game pipelines with role-based access (Owner, Editor, Tester, Viewer), shared prefabs, and transparent contributor credits.
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-[#0B0E14]">
                <div className="text-lg font-mono font-bold tabular-nums text-white">
                  {projects.length}
                </div>
                <div className="text-[11px] text-slate-400">Active Projects</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0E14]">
                <div className="text-lg font-mono font-bold tabular-nums text-amber-400">
                  {publishedGames.filter((g) => !g.isDemoContent).length}
                </div>
                <div className="text-[11px] text-slate-400">Live Releases</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0E14]">
                <div className="text-lg font-mono font-bold tabular-nums text-teal-400">
                  100%
                </div>
                <div className="text-[11px] text-slate-400">Zero-Code</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[#161C28] border border-white/10 space-y-3">
            <h3 className="text-base font-display font-semibold text-white">
              Creator Economy &amp; Extension Boundary
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              WORLD FORGE separates client-side creation from cloud billing, payout verification, and third-party plugin sandboxes. Because payment &amp; identity backend credentials are not connected in this local build, earnings and cross-device studio syncing are clearly paused rather than simulated.
            </p>
            <ul className="space-y-2 text-xs text-slate-300 pt-1">
              <li>• Versioned Engine-Independent World Schema (v1.2.0) — Ready</li>
              <li>• Explicit Asset Licensing &amp; Copyright Reporting — Active Locally</li>
              <li>• Cloud Payouts, Tax Compliance &amp; Plugin Review — Requires Backend Credentials</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
