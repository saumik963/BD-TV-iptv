import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Tv,
  Search,
  Heart,
  SlidersHorizontal,
  Menu,
  X,
  Settings,
  ChevronRight,
  Grid,
  Compass,
  RefreshCw,
  AlertCircle,
  FileWarning,
  Info,
  Sliders,
  Filter
} from 'lucide-react';

import { Channel, SortOption } from './types';
import { parseM3U } from './utils/m3uParser';
import { DEFAULT_M3U_URL, FALLBACK_M3U_CONTENT } from './data/defaultM3U';

import LivePlayer from './components/LivePlayer';
import ChannelCard from './components/ChannelCard';
import RecentlyWatched from './components/RecentlyWatched';
import SettingsModal from './components/SettingsModal';
import DisclaimerModal from './components/DisclaimerModal';

import logoUrl from '../assets/BD-tv.png';

export default function App() {
  // Playlist state
  const [playlistUrl, setPlaylistUrl] = useState(() => {
    return localStorage.getItem('lumina-playlist-url') || DEFAULT_M3U_URL;
  });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorString, setErrorString] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('Most Popular');

  // Interactive active feed states
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lumina-favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentlyWatched, setRecentlyWatched] = useState<Channel[]>(() => {
    try {
      const saved = localStorage.getItem('lumina-recently-watched');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // UI Panel Layout settings
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem('lumina-show-sidebar');
    return saved !== 'false'; // Default to true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Performance Infinite Scroll settings
  const [visibleCount, setVisibleCount] = useState(40);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');

  const sidebarFilteredChannels = useMemo(() => {
    if (!sidebarSearchQuery.trim()) return channels;
    const query = sidebarSearchQuery.toLowerCase().trim();
    return channels.filter(ch =>
      ch.name.toLowerCase().includes(query) ||
      (ch.category && ch.category.toLowerCase().includes(query))
    );
  }, [channels, sidebarSearchQuery]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Stream Status list
  const [offlineChannelIds, setOfflineChannelIds] = useState<Set<string>>(new Set());

  // 1. Fetch & Parse playlist implementation
  const fetchPlaylist = useCallback(async (url: string, showIndicator = true) => {
    if (showIndicator) setLoading(true);
    setErrorString(null);
    try {
      // Set short fetch timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, { signal: controller.signal })
        .catch(() => {
          // If direct fetch fails, we immediately fallback to local
          throw new Error("Network unreachable. Accessing fallback playlist.");
        });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const content = await response.text();
      const parsed = parseM3U(content);

      if (parsed.length === 0) {
        throw new Error("No channels found in M3U file contents.");
      }

      setChannels(parsed);
      setErrorString(null);
    } catch (err: any) {
      console.warn("CORS/Fetch fail, loading embedded playlist streams instead:", err.message);
      // Fallback content is guaranteed to load and always online
      const parsed = parseM3U(FALLBACK_M3U_CONTENT);
      setChannels(parsed);
      setErrorString(`Loaded fallback playlist because original URL had CORS restriction or was offline.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // First boot load or URL changes
  useEffect(() => {
    fetchPlaylist(playlistUrl, true);
  }, [playlistUrl, fetchPlaylist]);

  // Auto Refresh Playlist every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Automated M3U playlist refresh triggered...');
      fetchPlaylist(playlistUrl, false);
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [playlistUrl, fetchPlaylist]);

  // Sync favorites & recently watched with Local Storage
  useEffect(() => {
    localStorage.setItem('lumina-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('lumina-recently-watched', JSON.stringify(recentlyWatched));
  }, [recentlyWatched]);

  useEffect(() => {
    localStorage.setItem('lumina-show-sidebar', showSidebar.toString());
  }, [showSidebar]);

  // 2. Continue Watching Implementation
  useEffect(() => {
    if (channels.length > 0) {
      const savedLastId = localStorage.getItem('lumina-last-watched-id');
      if (savedLastId) {
        const matching = channels.find(c => c.id === savedLastId);
        if (matching) {
          setActiveChannel(matching);
          return;
        }
      }
      // If no saved, play the first channel default
      setActiveChannel(channels[0]);
    }
  }, [channels]);

  // Listen to select channel changes
  const handleSelectChannel = useCallback((channel: Channel) => {
    setActiveChannel(channel);
    localStorage.setItem('lumina-last-watched-id', channel.id);

    // Track Recently Watched (limit 20, move to front, no duplicates)
    setRecentlyWatched(prev => {
      const filtered = prev.filter(c => c.id !== channel.id);
      return [channel, ...filtered].slice(0, 20);
    });
  }, []);


  // Toggle favorite channel state
  const handleToggleFavorite = (id: string) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Clear viewing history helper
  const handleClearHistory = () => {
    setRecentlyWatched([]);
    localStorage.removeItem('lumina-recently-watched');
  };

  // 3. Dynamic Category Categories Extractor
  const categories = useMemo(() => {
    const groupsSet = new Set<string>();
    channels.forEach(ch => {
      if (ch.category) {
        groupsSet.add(ch.category);
      }
    });
    // Sort and return
    return ['All', ...Array.from(groupsSet).sort()];
  }, [channels]);

  // Filter channels logic with Search and Category
  const filteredAndSortedChannels = useMemo(() => {
    let result = [...channels];

    // Filter by favorites checkbox
    if (showFavoritesOnly) {
      result = result.filter(ch => favorites.includes(ch.id));
    }

    // Filter by active category
    if (selectedCategory !== 'All') {
      result = result.filter(ch => ch.category === selectedCategory);
    }

    // Real-time Search by Name or Category
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(ch =>
        ch.name.toLowerCase().includes(query) ||
        ch.category.toLowerCase().includes(query)
      );
    }

    // Sort execution logic
    if (sortOption === 'A-Z') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'Z-A') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === 'Recent') {
      // Sort so that items in recentlyWatched appear first
      const recentIds = recentlyWatched.map(c => c.id);
      result.sort((a, b) => {
        const indexA = recentIds.indexOf(a.id);
        const indexB = recentIds.indexOf(b.id);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
      });
    } else if (sortOption === 'Most Popular') {
      // Put favorite channels in higher relevance positions
      const favA = favorites.includes(a => a.id) ? 1 : 0;
      const favB = favorites.includes(b => b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
    }

    return result;
  }, [channels, searchQuery, selectedCategory, showFavoritesOnly, sortOption, favorites, recentlyWatched]);

  const handlePreviousChannel = useCallback(() => {
    if (!activeChannel) return;
    const currentIndex = filteredAndSortedChannels.findIndex(c => c.id === activeChannel.id);
    if (currentIndex > 0) {
      handleSelectChannel(filteredAndSortedChannels[currentIndex - 1]);
    } else if (currentIndex === 0 && filteredAndSortedChannels.length > 0) {
      handleSelectChannel(filteredAndSortedChannels[filteredAndSortedChannels.length - 1]);
    }
  }, [activeChannel, filteredAndSortedChannels, handleSelectChannel]);

  const handleNextChannel = useCallback(() => {
    if (!activeChannel) return;
    const currentIndex = filteredAndSortedChannels.findIndex(c => c.id === activeChannel.id);
    if (currentIndex !== -1 && currentIndex < filteredAndSortedChannels.length - 1) {
      handleSelectChannel(filteredAndSortedChannels[currentIndex + 1]);
    } else if (currentIndex === filteredAndSortedChannels.length - 1 && filteredAndSortedChannels.length > 0) {
      handleSelectChannel(filteredAndSortedChannels[0]);
    }
  }, [activeChannel, filteredAndSortedChannels, handleSelectChannel]);

  // Stream Health reporter
  const handleStreamError = (channelId: string) => {
    setOfflineChannelIds(prev => {
      const copy = new Set(prev);
      copy.add(channelId);
      return copy;
    });
  };

  const handleStreamSuccess = (channelId: string) => {
    setOfflineChannelIds(prev => {
      const copy = new Set(prev);
      copy.delete(channelId);
      return copy;
    });
  };

  // Reset infinite scroll page list on filter alterations
  useEffect(() => {
    setVisibleCount(40);
  }, [searchQuery, selectedCategory, showFavoritesOnly, sortOption]);

  // Infinite Scroll Trigger
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCount < filteredAndSortedChannels.length) {
        setVisibleCount(prev => Math.min(prev + 40, filteredAndSortedChannels.length));
      }
    }, { threshold: 0.1, rootMargin: '100px' });

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [visibleCount, filteredAndSortedChannels.length]);

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col relative font-sans selection:bg-cyan-500/20 overflow-x-hidden w-full">

      {/* Background neon blurs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Sticky Header Nav */}
      <header className="sticky top-0 w-full h-14 border-b border-gray-800 flex items-center justify-between px-3 md:px-6 z-50 transition-colors glass flex-shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedCategory('All'); setShowFavoritesOnly(false); }}>
            <div className="w-8 h-8 flex items-center justify-center">
              <img src={logoUrl} alt="BD-TV Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-cyan-400 italic">
              BD<span className="text-white not-italic font-extrabold text-[#FFFFFF]">-TV</span>
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-1.5 bg-gray-900/60 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => { setShowFavoritesOnly(false); setSelectedCategory('All'); }}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${!showFavoritesOnly && selectedCategory === 'All' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Watch Live
            </button>
            <button
              onClick={() => { setShowFavoritesOnly(true); }}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${showFavoritesOnly ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              <Heart className="w-3 h-3 fill-current" />
              Favorites
            </button>
          </nav>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          {/* Header Search bar */}
          <div className="relative hidden md:block">
            <div className="flex items-center bg-gray-900 px-3 py-1 rounded-full border border-gray-800 focus-within:border-cyan-500/50 transition-colors">
              <Search className="w-3.5 h-3.5 text-gray-500 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels..."
                className="bg-transparent text-[11px] w-48 focus:outline-none text-white placeholder-gray-500 font-bold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => fetchPlaylist(playlistUrl, false)}
            disabled={refreshing}
            className={`p-2 rounded-lg border border-gray-800 bg-gray-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh M3U Feed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg border border-gray-800 bg-gray-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95 duration-150"
            title="Playlist Configuration"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowSidebar(prev => !prev)}
            className={`p-2 rounded-lg border transition-all ${showSidebar ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-400' : 'border-gray-800 bg-gray-900 text-slate-400 hover:text-white'}`}
            title="Toggle Right Channel Sidebar"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Single Page structural container */}
      <main className="flex-grow flex flex-col lg:flex-row w-full max-w-[1720px] mx-auto p-3 md:p-6 gap-4 md:gap-6 min-w-0">

        {/* Left Side: Live TV Player & Large Viewport Section */}
        <div className="flex-grow flex flex-col min-w-0 w-full overflow-visible">

          {/* Header info in dev Fallback Mode */}
          {errorString && (
            <div className="mb-4 p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs text-emerald-400 leading-relaxed">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{errorString} Enjoy premium pre-loaded news & entertainment.</span>
              </div>
              <button
                onClick={() => setErrorString(null)}
                className="p-1 hover:bg-emerald-500/10 text-emerald-300 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Core Streaming player viewport */}
          <div className="sticky top-14 z-30 bg-[#070a13] py-2">
            <LivePlayer
              channel={activeChannel}
              onStreamError={handleStreamError}
              onStreamSuccess={handleStreamSuccess}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onPreviousChannel={handlePreviousChannel}
              onNextChannel={handleNextChannel}
            />
          </div>

          {!showSidebar && (
            <>
              {/* Quick interactive recently watched row */}
              <RecentlyWatched
                channels={recentlyWatched}
                onSelectChannel={handleSelectChannel}
                activeChannelId={activeChannel?.id}
                onClearHistory={handleClearHistory}
              />

          {/* Mobile search bar visible on small devices */}
          <div className="relative mt-4 block md:hidden">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search streams or category..."
              className="w-full bg-white/5 border border-white/5 focus:border-cyan-400 placeholder-slate-400 text-slate-200 text-xs px-4 py-2.5 pl-9 rounded-xl focus:outline-none"
            />
          </div>

          {/* Core Categories and Sorting bar */}
          <div className="mt-8 flex flex-col gap-4">

            {/* Swipable Row with common playlist filters */}
            <div className="flex items-center justify-between gap-4 border-b border-gray-800 pb-3">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scrollbar-none py-1 flex-grow">
                <button
                  onClick={() => { setSelectedCategory('All'); setShowFavoritesOnly(false); }}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${!showFavoritesOnly && selectedCategory === 'All'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white'
                    }`}
                >
                  ALL CHANNELS ({channels.length})
                </button>

                <button
                  onClick={() => { setShowFavoritesOnly(true); }}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1 ${showFavoritesOnly
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white'
                    }`}
                >
                  <Heart className="w-2.5 h-2.5 fill-current" />
                  FAVORITES ({favorites.length})
                </button>

                {/* Popular sample M3U playlist general filters */}
                {['News', 'Sports', 'Movies', 'Entertainment', 'Kids', 'Music', 'Science', 'Religious'].map((cat) => {
                  const isAvailable = categories.includes(cat);
                  const isCurActive = selectedCategory === cat && !showFavoritesOnly;

                  return (
                    <button
                      key={cat}
                      disabled={!isAvailable}
                      onClick={() => { setSelectedCategory(cat); setShowFavoritesOnly(false); }}
                      className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${isCurActive
                        ? 'bg-cyan-500 text-black shadow-md'
                        : isAvailable
                          ? 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white'
                          : 'opacity-40 cursor-not-allowed hidden'
                        }`}
                    >
                      {cat}
                    </button>
                  );
                })}

                {/* More Categories trigger dropdown */}
                {categories.length > 8 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowCategoryDropdown(prev => !prev)}
                      className="px-2.5 py-1 rounded text-[9px] font-bold uppercase bg-gray-800/80 text-gray-300 hover:text-white transition-all flex items-center gap-0.5 whitespace-nowrap"
                    >
                      BROWSE GROUPS
                      <ChevronRight className={`w-2.5 h-2.5 transform transition-transform ${showCategoryDropdown ? 'rotate-90' : ''}`} />
                    </button>

                    {showCategoryDropdown && (
                      <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 z-30 max-h-64 overflow-y-auto">
                        {categories.map((c) => (
                          <button
                            key={`drop-${c}`}
                            onClick={() => {
                              setSelectedCategory(c);
                              setShowFavoritesOnly(false);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors truncate ${selectedCategory === c && !showFavoritesOnly
                              ? 'bg-cyan-500/10 text-cyan-400 font-semibold'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sort controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[9px] font-bold uppercase text-gray-500 hidden sm:inline">Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="bg-gray-900 border border-gray-800 text-cyan-400 text-[10px] font-bold px-2.5 py-1 rounded-md focus:outline-none cursor-pointer uppercase"
                >
                  <option value="Most Popular">Popularity</option>
                  <option value="A-Z">A-Z Name</option>
                  <option value="Z-A">Z-A Name</option>
                  <option value="Recent">Recently Watched</option>
                </select>
              </div>
            </div>

            {/* Total Results line */}
            <div className="flex items-center justify-between px-1 text-xs text-slate-400">
              <span className="font-medium">
                Channels Found: <strong className="text-cyan-400">{filteredAndSortedChannels.length}</strong>
              </span>
              {selectedCategory !== 'All' && (
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="text-cyan-400 hover:underline hover:text-cyan-300"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Skeleton Loaders logic whilst retrieving feed */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="glass-panel animate-pulse rounded-2xl overflow-hidden flex flex-col h-[220px]">
                  <div className="aspect-video bg-slate-900/80 flex items-center justify-center">
                    <Tv className="w-8 h-8 text-slate-800" />
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-grow justify-center bg-slate-900/30">
                    <div className="h-3 bg-slate-800 rounded-md w-3/4" />
                    <div className="h-2 bg-slate-800 rounded-md w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedChannels.length === 0 ? (
            // No results placeholder
            <div className="glass-panel rounded-2xl flex flex-col items-center justify-center p-12 text-center mt-6">
              <FileWarning className="w-12 h-12 text-rose-400/80 mb-3" />
              <h3 className="text-base font-bold text-white">No streams match your filter criteria</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm">
                Try amending your search term, toggling off the favorites filter, or browse different news & sports groups.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setShowFavoritesOnly(false); }}
                className="mt-4 text-xs font-semibold bg-white/5 border border-white/5 hover:bg-white/10 text-cyan-400 px-4 py-2 rounded-xl transition-all"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            // 4. Grid Channel Listing View
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
              {filteredAndSortedChannels.slice(0, visibleCount).map((ch) => (
                <ChannelCard
                  key={ch.id}
                  channel={ch}
                  isActive={activeChannel?.id === ch.id}
                  isFavorite={favorites.includes(ch.id)}
                  onSelect={handleSelectChannel}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}

          {/* Interactive Scroll End observer mark */}
          {visibleCount < filteredAndSortedChannels.length && (
            <div
              ref={loadMoreRef}
              className="py-12 flex items-center justify-center"
            >
              <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          )}
            </>
          )}

        </div>

        {/* Right Side / Sidebar Panel layout - desktop inline, mobile overlay */}
        {showSidebar && (
          <>
            {/* Mobile overlay backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
             <aside className="
               fixed right-0 top-0 h-full z-50 w-[280px] max-w-[85vw]
               lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:z-auto lg:w-80 lg:max-w-none
               flex-shrink-0 bg-[#0d1425] border-l border-gray-800
               flex flex-col overflow-hidden
               transition-all duration-300 ease-in-out
             ">
               {/* Sidebar title */}
               <div className="p-4 flex items-center justify-between border-b border-gray-800 bg-[#0a0f1d] flex-shrink-0">
                 <div className="flex items-center gap-1.5 text-cyan-400">
                   <Sliders className="w-3.5 h-3.5" />
                   <h2 className="font-bold text-[10px] uppercase tracking-widest text-[#FFFFFF]">Dashboard Hub</h2>
                 </div>
                 <button
                   onClick={() => setShowSidebar(false)}
                   className="p-1 rounded-full hover:bg-gray-800/60 text-gray-400 hover:text-white"
                   title="Hide Sidebar"
                 >
                   <X className="w-3.5 h-3.5" />
                 </button>
               </div>

               {/* Playlist Source Pill badge */}
               <div className="p-4 border-b border-gray-800 flex flex-col gap-1.5 flex-shrink-0 bg-[#0b1120]/40">
                 <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Playlist Info</h3>
                 <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5">
                   <p className="text-[9px] text-[#06B6D4] font-mono truncate w-40" title={playlistUrl}>
                     {playlistUrl}
                   </p>
                   <button
                     onClick={() => setShowSettings(true)}
                     className="text-[9px] text-white hover:text-cyan-400 font-bold uppercase transition"
                   >
                     EDIT
                   </button>
                 </div>
               </div>

               {/* Channel Search & Navigation list */}
               <div className="flex-1 overflow-hidden flex flex-col">
                 <div className="p-4 pb-2 flex-shrink-0 flex flex-col gap-2 bg-[#0b1120]/20">
                   <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Channel Navigation</h3>
                   <div className="relative flex items-center bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800 focus-within:border-cyan-500/50 transition-colors">
                     <Search className="w-3.5 h-3.5 text-gray-500 mr-2 flex-shrink-0" />
                     <input
                       type="text"
                       value={sidebarSearchQuery}
                       onChange={(e) => setSidebarSearchQuery(e.target.value)}
                       placeholder="Search channels..."
                       className="bg-transparent text-[11px] w-full focus:outline-none text-white placeholder-gray-500 font-bold"
                     />
                     {sidebarSearchQuery && (
                       <button
                         onClick={() => setSidebarSearchQuery('')}
                         className="p-0.5 rounded-full text-slate-400 hover:text-white"
                       >
                         <X className="w-3.5 h-3.5" />
                       </button>
                     )}
                   </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar">
                   {sidebarFilteredChannels.map((ch) => {
                     const isActive = activeChannel?.id === ch.id;
                     return (
                       <button
                         key={`side-${ch.id}`}
                         onClick={() => handleSelectChannel(ch)}
                         className={`w-full p-3 border-b border-white/5 flex items-center gap-3 transition-all text-left outline-none relative group ${
                           isActive ? 'active-channel bg-cyan-500/5' : 'bg-transparent hover:bg-white/5'
                         }`}
                       >
                         {ch.logo ? (
                           <img
                             src={ch.logo}
                             alt=""
                             className="w-10 h-10 object-contain rounded bg-white p-1 flex-shrink-0 shadow-sm border border-gray-800"
                             onError={(e) => {
                               (e.target as HTMLElement).style.display = 'none';
                             }}
                           />
                         ) : (
                           <div className="w-10 h-10 bg-slate-800/50 rounded flex items-center justify-center flex-shrink-0 border border-white/5">
                             <span className="text-[10px] text-cyan-400 font-bold font-mono">
                               {ch.name.slice(0, 3).toUpperCase()}
                             </span>
                           </div>
                         )}

                         <div className="min-w-0 flex-grow">
                           <h4 className={`text-xs font-bold truncate group-hover:text-white ${isActive ? 'text-cyan-400' : 'text-gray-300'}`}>
                             {ch.name}
                           </h4>
                           <p className="text-[9px] text-gray-500 truncate uppercase mt-0.5 tracking-tighter">
                             {ch.category || 'LIVE'} • {ch.country || 'HD'}
                           </p>
                         </div>

                         {isActive ? (
                           <svg className="w-4 h-4 text-cyan-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 000-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                           </svg>
                         ) : (
                           <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                         )}
                       </button>
                     );
                   })}
                 </div>
               </div>

              {/* Live TV FAQ Tip Box */}
              <div className="p-4 border-t border-gray-800 bg-[#0a0f1d] flex flex-col gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                  <Info className="w-3.5 h-3.5" />
                  <span>Streaming Tip</span>
                </div>
                <p className="text-[10px] leading-relaxed text-gray-500 font-medium">
                  Ensure remote streams have CORS access configured on remote host for HLS.js streaming.
                </p>
              </div>
            </aside>
          </>
        )}

      </main>

      {/* Playlist configuration modal */}
      {showSettings && (
        <SettingsModal
          currentUrl={playlistUrl}
          onSave={(url) => {
            setPlaylistUrl(url);
            localStorage.setItem('lumina-playlist-url', url);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Disclaimer Modal */}
      <DisclaimerModal
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
      />

      {/* Persistent floating launcher for right channels drawer */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-cyan-500 to-purple-600 hover:brightness-110 text-slate-950 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all outline-none"
          title="Open Channels drawer"
        >
          <Menu className="w-5 h-5 text-slate-950" />
        </button>
      )}

      {/* Simple footer metadata bar */}
      <footer className="py-6 text-center text-[10px] text-slate-500 border-t border-white/5 mt-auto bg-[#070a13] flex flex-col items-center gap-2">
        <p>© 2026 BD-TV Experience. Developed by{' '}
          <a
            href="https://saumik.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
          >
            Saumik
          </a></p>
        <button
          onClick={() => setShowDisclaimer(true)}
          className="text-slate-450 hover:text-cyan-455 font-semibold transition-all duration-150 active:scale-95 text-[11px] hover:underline focus:outline-none"
        >
          Disclaimer
        </button>
      </footer>
    </div>
  );
}
