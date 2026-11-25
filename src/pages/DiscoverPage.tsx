import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Flag,
  Heart,
  MessageSquare,
  Play,
  Search,
  Share2,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import {
  GAME_CATEGORIES,
  type CommunityComment,
  type GameCategory,
  type PublishedGame,
} from '../types/world';
import { sanitizeUserText } from '../services/validation';

interface DiscoverPageProps {
  games: PublishedGame[];
  comments: CommunityComment[];
  followingCreators: string[];
  onPlayGame: (game: PublishedGame) => void;
  onRemixGame: (game: PublishedGame) => void;
  onToggleLike: (gameId: string) => void;
  onToggleFavorite: (gameId: string) => void;
  onToggleFollow: (creatorName: string) => void;
  onAddComment: (gameId: string, text: string) => void;
  onCreateNew: () => void;
}

export const DiscoverPage: React.FC<DiscoverPageProps> = ({
  games,
  comments,
  followingCreators,
  onPlayGame,
  onRemixGame,
  onToggleLike,
  onToggleFavorite,
  onToggleFollow,
  onAddComment,
  onCreateNew,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | GameCategory>('All');
  const [sortBy, setSortBy] = useState<'trending' | 'visits' | 'recent' | 'rating'>('trending');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [reportedGameId, setReportedGameId] = useState<string | null>(null);

  const visibleGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    return games
      .filter((g) => g.visibility === 'public')
      .filter((g) => (selectedCategory === 'All' ? true : g.category === selectedCategory))
      .filter((g) =>
        q
          ? g.title.toLowerCase().includes(q) ||
            g.description.toLowerCase().includes(q) ||
            g.creatorName.toLowerCase().includes(q) ||
            g.category.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => {
        if (sortBy === 'visits') return b.visits - a.visits;
        if (sortBy === 'recent')
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        if (sortBy === 'rating') return b.rating - a.rating;
        return b.activePlayers - a.activePlayers;
      });
  }, [games, search, selectedCategory, sortBy]);

  const featuredGame = games[0] || null;
  const activeGame = useMemo(
    () => games.find((g) => g.id === activeGameId) || null,
    [games, activeGameId]
  );
  const activeComments = useMemo(
    () => comments.filter((c) => c.gameId === activeGameId),
    [comments, activeGameId]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Featured Hero Showcase */}
      {featuredGame && (
        <section className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#161C28] grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 relative min-h-[260px] lg:min-h-[360px]">
            <img
              src={featuredGame.thumbnail}
              alt={featuredGame.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14]/85 via-[#0B0E14]/25 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#161C28]/25 lg:to-[#161C28]" />
          </div>

          <div className="lg:col-span-5 p-6 lg:p-8 flex flex-col justify-center space-y-5">
            <div className="text-xs text-amber-400 font-medium">
              Featured World · {featuredGame.category} ·{' '}
              {featuredGame.isDemoContent ? 'Demo World' : 'Published Creation'}
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white leading-tight">
              {featuredGame.title}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">{featuredGame.description}</p>
            <div className="text-xs text-slate-400 tabular-nums">
              By <span className="text-slate-200 font-medium">{featuredGame.creatorName}</span>
              {' · '}
              {featuredGame.activePlayers.toLocaleString()} playing
              {' · '}
              {featuredGame.visits.toLocaleString()} visits
              {' · '}
              {featuredGame.avgPlaytimeMinutes} min avg
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                data-start="true"
                onClick={() => onPlayGame(featuredGame)}
                className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                Play Now
              </button>
              <button
                type="button"
                onClick={() => onRemixGame(featuredGame)}
                className="px-4 py-2.5 rounded-lg bg-[#1E2636] hover:bg-[#2A354B] text-slate-100 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Wrench className="w-4 h-4 text-amber-400" />
                Open in Studio
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Search, Sort & Category Controls */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-white">Discover Worlds</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero-code 3D games built and published inside WORLD FORGE. Sample worlds are clearly labelled as Demo Worlds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search games or creators..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#161C28] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <select
              aria-label="Sort games by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 rounded-lg bg-[#161C28] border border-white/10 text-sm text-slate-200"
            >
              <option value="trending">Trending Now</option>
              <option value="visits">Most Visited</option>
              <option value="recent">Recently Published</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['All', ...GAME_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-[#161C28] text-slate-300 hover:bg-[#1E2636]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Game Marketplace Grid */}
      <section>
        {visibleGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visibleGames.map((game) => (
              <article
                key={game.id}
                className="rounded-xl overflow-hidden bg-[#161C28] border border-white/8 hover:border-amber-500/40 transition-colors flex flex-col group"
              >
                <button
                  type="button"
                  onClick={() => setActiveGameId(game.id)}
                  className="relative aspect-video overflow-hidden bg-[#0B0E14] text-left block w-full"
                >
                  <img
                    src={game.thumbnail}
                    alt={game.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-slate-200 tabular-nums">
                    <span>{game.category}</span>
                    <span>{game.activePlayers.toLocaleString()} playing</span>
                  </div>
                </button>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400">
                      {game.isDemoContent ? 'Demo World' : `Published v${game.version}`} · By{' '}
                      {game.creatorName}
                    </div>
                    <h3 className="text-base font-display font-semibold text-white leading-snug">
                      <button
                        type="button"
                        onClick={() => setActiveGameId(game.id)}
                        className="text-left hover:text-amber-300 transition-colors"
                      >
                        {game.title}
                      </button>
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{game.description}</p>
                  </div>

                  <div className="pt-2 border-t border-white/8 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {game.visits.toLocaleString()} visits · ★ {game.rating.toFixed(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPlayGame(game)}
                      className="px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Play
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#161C28] border border-white/10 p-10 text-center space-y-3">
            <h3 className="text-base font-semibold text-white">No matching worlds found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No worlds match your current search or category filter. Clear your filters or forge a brand-new 3D world in the Studio.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 rounded-lg bg-[#1E2636] text-xs font-medium text-white"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={onCreateNew}
                className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold"
              >
                Create World
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Creator Callout Strip */}
      <section className="rounded-xl bg-[#111620] border border-white/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Zero Programming Required
          </div>
          <h3 className="text-lg font-display font-semibold text-white">
            Build, sculpt, wire visual logic, and publish your own 3D game in minutes.
          </h3>
          <p className="text-xs text-slate-400">
            Optimized for integrated graphics and browser playback. Every published game saves as a versioned, engine-independent world snapshot.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm whitespace-nowrap shrink-0"
        >
          Launch World Studio
        </button>
      </section>

      {/* Game Detail & Community Drawer Modal */}
      {activeGame && (
        <div className="fixed inset-0 z-40 bg-[#0B0E14]/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-[#161C28] border border-white/12 overflow-hidden my-8">
            <div className="relative h-56 sm:h-64">
              <img
                src={activeGame.thumbnail}
                alt={activeGame.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#161C28] via-[#161C28]/30 to-transparent" />
              <button
                type="button"
                onClick={() => setActiveGameId(null)}
                aria-label="Close game details"
                className="absolute top-3 right-3 p-2 rounded-lg bg-[#0B0E14]/85 text-white hover:bg-[#1E2636]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-amber-400">
                    {activeGame.category} ·{' '}
                    {activeGame.isDemoContent ? 'Demo World' : `Published v${activeGame.version}`}
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white">{activeGame.title}</h2>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>By {activeGame.creatorName}</span>
                    <button
                      type="button"
                      onClick={() => onToggleFollow(activeGame.creatorName)}
                      className="text-amber-400 hover:underline font-medium"
                    >
                      {followingCreators.includes(activeGame.creatorName) ? 'Following' : '+ Follow'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPlayGame(activeGame)}
                    className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Play 3D World
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveGameId(null);
                      onRemixGame(activeGame);
                    }}
                    className="px-4 py-2.5 rounded-lg bg-[#1E2636] hover:bg-[#2A354B] text-slate-100 text-sm font-medium"
                  >
                    Remix in Studio
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-300">{activeGame.description}</p>

              {/* Stats & Community Interactions */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-white/10 text-xs">
                <div className="text-slate-300 tabular-nums">
                  {activeGame.visits.toLocaleString()} Visits ·{' '}
                  {activeGame.activePlayers.toLocaleString()} Active · Avg{' '}
                  {activeGame.avgPlaytimeMinutes}m · Integrated GPU Ready
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleLike(activeGame.id)}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 ${
                      activeGame.likedByMe
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-[#0B0E14] text-slate-300 hover:bg-[#1E2636]'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span className="tabular-nums">{activeGame.likes}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(activeGame.id)}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 ${
                      activeGame.favoritedByMe
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-[#0B0E14] text-slate-300 hover:bg-[#1E2636]'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {activeGame.favoritedByMe ? 'Saved' : 'Favorite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(`${window.location.origin}/?play=${activeGame.id}`)
                        .catch(() => {});
                      setShareFeedback('Link copied');
                      setTimeout(() => setShareFeedback(null), 1800);
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#0B0E14] hover:bg-[#1E2636] text-slate-300 flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {shareFeedback || 'Share'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportedGameId(activeGame.id)}
                    className="px-2.5 py-1.5 rounded-md bg-[#0B0E14] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                    aria-label="Report game"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {reportedGameId === activeGame.id && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200">
                  Moderation report logged locally. In production deployments, reports route to server-side trust &amp; safety review.
                </div>
              )}

              {/* Community Comments */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  Community Feedback ({activeComments.length})
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const clean = sanitizeUserText(commentDraft, 220);
                    if (!clean) return;
                    onAddComment(activeGame.id, clean);
                    setCommentDraft('');
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Write a comment about this world..."
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold"
                  >
                    Post
                  </button>
                </form>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {activeComments.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-[#0B0E14] text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span className="font-semibold text-slate-200">{c.author}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-300">{c.text}</p>
                    </div>
                  ))}
                  {activeComments.length === 0 && (
                    <p className="text-xs text-slate-500">No comments yet. Be the first to share feedback.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
