import React, { useCallback, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type {
  CommunityComment,
  CreatorProfile,
  GameCategory,
  GraphicsSettings,
  MarketplaceAsset,
  PublishedGame,
  StudioTier,
  TemplateType,
  Universe,
  WorldProject,
} from './types/world';
import {
  loadPlatformState,
  resetAllLocalData,
  saveComments,
  saveGraphicsSettings,
  saveProfile,
  saveProjects,
  savePublishedGames,
  saveStudioTier,
  saveUniverses,
} from './storage/projectStore';
import { createProjectFromTemplate } from './world-format/templates';
import { createGameObjectFromCatalog } from './editor/assets/assetCatalog';
import { groundHeightAt } from './editor/terrain/terrainMath';
import { DiscoverPage } from './pages/DiscoverPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { CommunityPage } from './pages/CommunityPage';
import {
  CreatorProfilePage,
  SettingsPage,
} from './pages/ProfileAndSettingsPages';
import { WorldStudio } from './editor/WorldStudio';
import { StandalonePlayer } from './gameplay/StandalonePlayer';

type PlatformNavSection = 'discover' | 'projects' | 'community' | 'profile' | 'settings';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [nav, setNav] = useState<PlatformNavSection>('discover');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [projects, setProjects] = useState<WorldProject[]>([]);
  const [publishedGames, setPublishedGames] = useState<PublishedGame[]>([]);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings | null>(null);
  const [studioTier, setStudioTier] = useState<StudioTier>('Creator Studio');

  const [activeStudioProjectId, setActiveStudioProjectId] = useState<string | null>(null);
  const [playingWorld, setPlayingWorld] = useState<WorldProject | null>(null);

  useEffect(() => {
    let mounted = true;
    loadPlatformState().then((state) => {
      if (!mounted) return;
      setProjects(state.projects);
      setPublishedGames(state.publishedGames);
      setProfile(state.profile);
      setComments(state.comments);
      setUniverses(state.universes);
      setGraphicsSettings(state.graphicsSettings);
      setStudioTier(state.studioTier);
      setLoading(false);

      // Support ?autostart=1 to jump directly into playable 3D world
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' && state.publishedGames[0]) {
        setPlayingWorld(state.publishedGames[0].worldSnapshot);
      } else if (params.get('studio') === '1' && state.projects[0]) {
        setActiveStudioProjectId(state.projects[0].id);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveProject = useCallback((updated: WorldProject) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      const next = exists
        ? prev.map((p) => (p.id === updated.id ? updated : p))
        : [updated, ...prev];
      saveProjects(next);
      return next;
    });
  }, []);

  const handleCreateProject = useCallback(
    (template: TemplateType, customTitle?: string) => {
      const created = createProjectFromTemplate(template, customTitle);
      setProjects((prev) => {
        const next = [created, ...prev];
        saveProjects(next);
        return next;
      });
      setActiveStudioProjectId(created.id);
    },
    []
  );

  const handleRenameProject = useCallback((id: string, title: string) => {
    setProjects((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, title, updatedAt: new Date().toISOString() } : p
      );
      saveProjects(next);
      return next;
    });
  }, []);

  const handleDuplicateProject = useCallback((id: string) => {
    setProjects((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;
      const now = new Date().toISOString();
      const copy: WorldProject = {
        ...JSON.parse(JSON.stringify(target)),
        id: `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        title: `${target.title} Copy`,
        status: 'draft',
        publishedGameId: undefined,
        publishedVersion: 0,
        createdAt: now,
        updatedAt: now,
      };
      const next = [copy, ...prev];
      saveProjects(next);
      return next;
    });
  }, []);

  const handleDeleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveProjects(next);
      return next;
    });
  }, []);

  const handlePublishProject = useCallback(
    (
      project: WorldProject,
      opts: {
        title: string;
        description: string;
        category: GameCategory;
        thumbnail: string;
        visibility: 'public' | 'unlisted';
      }
    ) => {
      const now = new Date().toISOString();
      const snapshot: WorldProject = JSON.parse(JSON.stringify(project));

      setPublishedGames((prev) => {
        const existingIdx = prev.findIndex((g) => g.sourceProjectId === project.id);
        let next: PublishedGame[];
        if (existingIdx >= 0) {
          const old = prev[existingIdx];
          const updatedGame: PublishedGame = {
            ...old,
            version: project.publishedVersion,
            title: opts.title,
            description: opts.description,
            category: opts.category,
            thumbnail: opts.thumbnail,
            visibility: opts.visibility,
            updatedAt: now,
            worldSnapshot: snapshot,
          };
          next = prev.map((g, i) => (i === existingIdx ? updatedGame : g));
        } else {
          const newGame: PublishedGame = {
            id: `pub_${Date.now().toString(36)}`,
            sourceProjectId: project.id,
            version: project.publishedVersion,
            title: opts.title,
            description: opts.description,
            category: opts.category,
            creatorName: profile?.username || 'AlexForge',
            creatorAvatar: profile?.avatarColor || '#f59e0b',
            thumbnail: opts.thumbnail,
            isDemoContent: false,
            visibility: opts.visibility,
            publishedAt: now,
            updatedAt: now,
            visits: 1,
            activePlayers: 1,
            avgPlaytimeMinutes: 8,
            likes: 1,
            likedByMe: true,
            rating: 5.0,
            worldSnapshot: snapshot,
          };
          next = [newGame, ...prev];
        }
        savePublishedGames(next);
        return next;
      });
    },
    [profile]
  );

  const handlePlayPublishedGame = useCallback((game: PublishedGame) => {
    setPublishedGames((prev) => {
      const next = prev.map((g) => (g.id === game.id ? { ...g, visits: g.visits + 1 } : g));
      savePublishedGames(next);
      return next;
    });
    setPlayingWorld(JSON.parse(JSON.stringify(game.worldSnapshot)));
  }, []);

  const handleRemixGame = useCallback((game: PublishedGame) => {
    const now = new Date().toISOString();
    const remix: WorldProject = {
      ...JSON.parse(JSON.stringify(game.worldSnapshot)),
      id: `proj_${Date.now().toString(36)}`,
      title: `${game.title} Remix`,
      status: 'draft',
      publishedGameId: undefined,
      publishedVersion: 0,
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => {
      const next = [remix, ...prev];
      saveProjects(next);
      return next;
    });
    setActiveStudioProjectId(remix.id);
  }, []);

  const handleToggleLike = useCallback((gameId: string) => {
    setPublishedGames((prev) => {
      const next = prev.map((g) => {
        if (g.id !== gameId) return g;
        const liked = !g.likedByMe;
        return { ...g, likedByMe: liked, likes: Math.max(0, g.likes + (liked ? 1 : -1)) };
      });
      savePublishedGames(next);
      return next;
    });
  }, []);

  const handleToggleFavorite = useCallback((gameId: string) => {
    setPublishedGames((prev) => {
      const next = prev.map((g) =>
        g.id === gameId ? { ...g, favoritedByMe: !g.favoritedByMe } : g
      );
      savePublishedGames(next);
      return next;
    });
  }, []);

  const handleToggleFollow = useCallback((creatorName: string) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const already = prev.following.includes(creatorName);
      const next: CreatorProfile = {
        ...prev,
        following: already
          ? prev.following.filter((c) => c !== creatorName)
          : [...prev.following, creatorName],
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleAddComment = useCallback(
    (gameId: string, text: string) => {
      const entry: CommunityComment = {
        id: `cmt_${Date.now().toString(36)}`,
        gameId,
        author: profile?.username || 'AlexForge',
        text,
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => {
        const next = [entry, ...prev];
        saveComments(next);
        return next;
      });
    },
    [profile]
  );

  const handleCreateUniverse = useCallback(
    (name: string, description: string, sharedProgressionOptIn: boolean) => {
      const created: Universe = {
        id: `univ_${Date.now().toString(36)}`,
        name,
        description,
        creatorName: profile?.username || 'AlexForge',
        worldIds: publishedGames.slice(0, 1).map((g) => g.id),
        sharedProgressionOptIn,
        portalLinks: [],
        createdAt: new Date().toISOString(),
      };
      setUniverses((prev) => {
        const next = [created, ...prev];
        saveUniverses(next);
        return next;
      });
    },
    [profile, publishedGames]
  );

  const handleInstallAssetToProject = useCallback(
    (projectId: string, asset: MarketplaceAsset) => {
      setProjects((prev) => {
        const next = prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const x = (proj.objects.length % 5) * 3 - 6;
          const z = 4;
          const y = groundHeightAt(proj.terrain, x, z);
          const obj = createGameObjectFromCatalog(asset.assetType, { x, y, z }, asset.name);
          obj.material.color = asset.defaultColor;
          obj.transform.scale = { ...asset.defaultScale };
          return {
            ...proj,
            objects: [...proj.objects, obj],
            updatedAt: new Date().toISOString(),
          };
        });
        saveProjects(next);
        return next;
      });
    },
    []
  );

  const handleTrackBuildTime = useCallback((activeDelta: number, idleDelta: number) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next: CreatorProfile = {
        ...prev,
        activeBuildSeconds: prev.activeBuildSeconds + activeDelta,
        idleSeconds: prev.idleSeconds + idleDelta,
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleUnlockAchievement = useCallback((achId: string) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const target = prev.achievements.find((a) => a.id === achId);
      if (!target || target.unlocked) return prev;
      const next: CreatorProfile = {
        ...prev,
        level: prev.level + 1,
        achievements: prev.achievements.map((a) =>
          a.id === achId ? { ...a, unlocked: true } : a
        ),
      };
      saveProfile(next);
      return next;
    });
  }, []);

  if (loading || !profile || !graphicsSettings) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-slate-300 text-sm">
        Initializing WORLD FORGE Engine...
      </div>
    );
  }

  // Standalone 3D Game Player View
  if (playingWorld) {
    return (
      <StandalonePlayer
        project={playingWorld}
        graphics={graphicsSettings}
        onExit={() => {
          document.body.dataset.state = 'discover';
          setPlayingWorld(null);
        }}
      />
    );
  }

  // Full-Viewport 3D World Creation Studio View
  const activeStudioProject = activeStudioProjectId
    ? projects.find((p) => p.id === activeStudioProjectId) || null
    : null;

  if (activeStudioProject) {
    return (
      <WorldStudio
        project={activeStudioProject}
        graphics={graphicsSettings}
        studioTier={studioTier}
        onChangeStudioTier={(tier) => {
          setStudioTier(tier);
          saveStudioTier(tier);
        }}
        onSaveProject={handleSaveProject}
        onPublishProject={handlePublishProject}
        onTrackBuildTime={handleTrackBuildTime}
        onUnlockAchievement={handleUnlockAchievement}
        onBackToProjects={() => {
          document.body.dataset.state = 'platform';
          setActiveStudioProjectId(null);
        }}
      />
    );
  }

  const navItems: Array<{ id: PlatformNavSection; label: string }> = [
    { id: 'discover', label: 'Discover' },
    { id: 'projects', label: 'My Projects' },
    { id: 'community', label: 'Community' },
    { id: 'profile', label: 'Profile' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#EDF1F7] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract: [Brand] — [5 single-line nav links] — [1 primary CTA] */}
      <header className="sticky top-0 z-30 h-16 border-b border-white/10 bg-[#0B0E14]/95 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => setNav('discover')}
          className="text-lg font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <polygon points="12,2 22,7.5 12,13 2,7.5" fill="#F59E0B" />
            <polygon points="2,7.5 12,13 12,22 2,16.5" fill="#B45309" />
            <polygon points="22,7.5 12,13 12,22 22,16.5" fill="#14B8A6" />
          </svg>
          WORLD FORGE
        </button>

        <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNav(item.id)}
              className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                nav === item.id
                  ? 'text-white border-amber-500'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (projects.length > 0) {
                setActiveStudioProjectId(projects[0].id);
              } else {
                handleCreateProject('parkour');
              }
            }}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0"
          >
            Create World
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-[#161C28]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-b border-white/10 bg-[#111620] px-4 py-3 flex flex-col gap-1"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setNav(item.id);
                setMobileMenuOpen(false);
              }}
              className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                nav === item.id ? 'bg-[#1E2636] text-amber-400' : 'text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      {/* Active Platform Section */}
      <main className="flex-1">
        {nav === 'discover' && (
          <DiscoverPage
            games={publishedGames}
            comments={comments}
            followingCreators={profile.following}
            onPlayGame={handlePlayPublishedGame}
            onRemixGame={handleRemixGame}
            onToggleLike={handleToggleLike}
            onToggleFavorite={handleToggleFavorite}
            onToggleFollow={handleToggleFollow}
            onAddComment={handleAddComment}
            onCreateNew={() => setNav('projects')}
          />
        )}

        {nav === 'projects' && (
          <ProjectsPage
            projects={projects}
            onCreateProject={handleCreateProject}
            onOpenProject={(p) => setActiveStudioProjectId(p.id)}
            onPlayProject={(p) => setPlayingWorld(JSON.parse(JSON.stringify(p)))}
            onRenameProject={handleRenameProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {nav === 'community' && (
          <CommunityPage
            universes={universes}
            publishedGames={publishedGames}
            projects={projects}
            onCreateUniverse={handleCreateUniverse}
            onInstallAssetToProject={handleInstallAssetToProject}
            onPlayGame={handlePlayPublishedGame}
          />
        )}

        {nav === 'profile' && (
          <CreatorProfilePage
            profile={profile}
            projects={projects}
            publishedGames={publishedGames}
            onUpdateProfile={(next) => {
              setProfile(next);
              saveProfile(next);
            }}
            onPlayGame={handlePlayPublishedGame}
          />
        )}

        {nav === 'settings' && (
          <SettingsPage
            graphics={graphicsSettings}
            studioTier={studioTier}
            onUpdateGraphics={(g) => {
              setGraphicsSettings(g);
              saveGraphicsSettings(g);
            }}
            onChangeStudioTier={(tier) => {
              setStudioTier(tier);
              saveStudioTier(tier);
            }}
            onResetLocalData={async () => {
              const fresh = await resetAllLocalData();
              setProjects(fresh.projects);
              setPublishedGames(fresh.publishedGames);
              setProfile(fresh.profile);
              setComments(fresh.comments);
              setUniverses(fresh.universes);
              setGraphicsSettings(fresh.graphicsSettings);
              setStudioTier(fresh.studioTier);
            }}
          />
        )}
      </main>

      <footer className="border-t border-white/8 py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>WORLD FORGE · Zero-Code 3D World &amp; Universe Platform</span>
          <span>Local IndexedDB Storage · Hardware-Adaptive WebGL2 Renderer</span>
        </div>
      </footer>
    </div>
  );
}
