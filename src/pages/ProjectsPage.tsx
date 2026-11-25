import React, { useState } from 'react';
import {
  Copy,
  Download,
  FolderOpen,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { TemplateType, WorldProject } from '../types/world';
import { DEMO_THUMBNAILS } from '../world-format/templates';

interface ProjectsPageProps {
  projects: WorldProject[];
  onCreateProject: (template: TemplateType, title?: string) => void;
  onOpenProject: (project: WorldProject) => void;
  onPlayProject: (project: WorldProject) => void;
  onRenameProject: (id: string, title: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

const TEMPLATE_CARDS: Array<{
  template: TemplateType;
  title: string;
  subtitle: string;
  thumbnail: string;
}> = [
  {
    template: 'parkour',
    title: 'Skyline Parkour Template',
    subtitle: 'Pre-wired Key & Vault Door visual logic, ramps, checkpoints, and sky islands.',
    thumbnail: DEMO_THUMBNAILS.parkour,
  },
  {
    template: 'tdm',
    title: 'Team Deathmatch Arena',
    subtitle: 'Symmetric Red vs. Teal bases, watchtowers, cover barriers, and team scoring.',
    thumbnail: DEMO_THUMBNAILS.tdm,
  },
  {
    template: 'racing',
    title: 'Canyon Rally Circuit',
    subtitle: 'Desert terrain, oasis lake, launch ramp, vehicles, and checkpoint gates.',
    thumbnail: DEMO_THUMBNAILS.racing,
  },
  {
    template: 'blank',
    title: 'Open Valley Sandbox',
    subtitle: 'Sunlit meadow with lake, starter cottage, and clean slate for custom genres.',
    thumbnail: DEMO_THUMBNAILS.sandbox,
  },
];

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  onCreateProject,
  onOpenProject,
  onPlayProject,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
}) => {
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  const exportProjectJson = (proj: WorldProject) => {
    const blob = new Blob([JSON.stringify(proj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.worldforge.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Start New Project Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              Create &amp; Manage Worlds
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Start from an editable gameplay template or open an existing local IndexedDB project.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Optional new world name..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#161C28] border border-white/10 text-xs text-white w-56"
            />
            <button
              type="button"
              onClick={() => {
                onCreateProject('parkour', newTitle.trim() || undefined);
                setNewTitle('');
              }}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New World
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATE_CARDS.map((card) => (
            <button
              key={card.template}
              type="button"
              onClick={() => {
                onCreateProject(card.template, newTitle.trim() || undefined);
                setNewTitle('');
              }}
              className="text-left rounded-xl overflow-hidden bg-[#161C28] border border-white/8 hover:border-amber-500/50 transition-colors group flex flex-col"
            >
              <div className="aspect-video overflow-hidden bg-[#0B0E14]">
                <img
                  src={card.thumbnail}
                  alt={card.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3.5 space-y-1 flex-1">
                <div className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                  {card.title}
                </div>
                <p className="text-xs text-slate-400 leading-snug">{card.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Saved Local Projects */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
          <h2 className="text-xl font-display font-bold text-white">
            My Projects <span className="text-slate-500 text-base tabular-nums">({projects.length})</span>
          </h2>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter my projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#161C28] border border-white/10 text-xs text-white"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((proj) => (
              <div
                key={proj.id}
                className="rounded-xl overflow-hidden bg-[#161C28] border border-white/8 flex flex-col"
              >
                <div className="relative aspect-video bg-[#0B0E14]">
                  <img
                    src={proj.thumbnail}
                    alt={proj.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161C28] via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 text-[11px] text-slate-200">
                    {proj.status === 'published'
                      ? `Published v${proj.publishedVersion}`
                      : 'Local Draft'}{' '}
                    · Schema v{proj.schemaVersion}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    {editingId === proj.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (renameDraft.trim()) onRenameProject(proj.id, renameDraft.trim());
                          setEditingId(null);
                        }}
                        className="flex gap-1.5"
                      >
                        <input
                          type="text"
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          autoFocus
                          className="flex-1 px-2 py-1 rounded bg-[#0B0E14] border border-amber-500 text-xs text-white"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-xs font-semibold"
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-display font-semibold text-white truncate">
                          {proj.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(proj.id);
                            setRenameDraft(proj.title);
                          }}
                          className="text-[11px] text-slate-400 hover:text-amber-300 shrink-0"
                        >
                          Rename
                        </button>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      {proj.category} · {proj.objects.length} objects · {proj.logicGraph.nodes.length}{' '}
                      logic nodes · Updated {new Date(proj.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/8">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenProject(proj)}
                        className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Open Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => onPlayProject(proj)}
                        className="px-2.5 py-1.5 rounded-md bg-[#1E2636] hover:bg-teal-600 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Play
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onDuplicateProject(proj.id)}
                        className="p-1.5 rounded hover:bg-[#1E2636] text-slate-400 hover:text-white"
                        aria-label={`Duplicate ${proj.title}`}
                        title="Duplicate project"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => exportProjectJson(proj)}
                        className="p-1.5 rounded hover:bg-[#1E2636] text-slate-400 hover:text-white"
                        aria-label={`Backup ${proj.title}`}
                        title="Download JSON backup"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(proj.id)}
                        className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                        aria-label={`Delete ${proj.title}`}
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#161C28] border border-white/10 p-10 text-center space-y-3">
            <h3 className="text-base font-semibold text-white">No saved projects yet</h3>
            <p className="text-xs text-slate-400">
              Pick one of the templates above to launch your first 3D world in the Studio.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
