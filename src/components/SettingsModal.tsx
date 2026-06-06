import React, { useState } from 'react';
import { X, Globe, RotateCcw, Save, Plus, Trash2, Check, List } from 'lucide-react';
import { DEFAULT_M3U_URL } from '../data/defaultM3U';

interface SettingsModalProps {
  currentUrl: string;
  onSave: (url: string) => void;
  onClose: () => void;
}

interface SavedPlaylist {
  name: string;
  url: string;
}

export default function SettingsModal({
  currentUrl,
  onSave,
  onClose
}: SettingsModalProps) {
  const [playlistUrl, setPlaylistUrl] = useState(currentUrl);
  const [playlistName, setPlaylistName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem('lumina-saved-playlists');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved playlists', e);
    }
    return [
      { name: 'Default BD-TV', url: DEFAULT_M3U_URL }
    ];
  });

  const saveToLocalStorage = (list: SavedPlaylist[]) => {
    localStorage.setItem('lumina-saved-playlists', JSON.stringify(list));
  };

  const handleAddPlaylist = () => {
    const trimmedUrl = playlistUrl.trim();
    if (!trimmedUrl) {
      setErrorMsg('Please enter a valid URL first.');
      return;
    }
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setErrorMsg('Playlist must start with http:// or https://');
      return;
    }

    // Check if already exists
    if (savedPlaylists.some(p => p.url === trimmedUrl)) {
      setErrorMsg('This URL is already in your saved list.');
      return;
    }

    let displayName = playlistName.trim();
    if (!displayName) {
      try {
        const host = new URL(trimmedUrl).hostname;
        displayName = host.replace('www.', '');
      } catch (e) {
        displayName = 'Custom Playlist';
      }
    }

    const updated = [...savedPlaylists, { name: displayName, url: trimmedUrl }];
    setSavedPlaylists(updated);
    saveToLocalStorage(updated);
    setPlaylistName('');
    setErrorMsg('');
  };

  const handleDeletePlaylist = (urlToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the URL when clicking delete
    const updated = savedPlaylists.filter(p => p.url !== urlToDelete);
    setSavedPlaylists(updated);
    saveToLocalStorage(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl.trim()) {
      setErrorMsg('Please enter a valid URL.');
      return;
    }
    
    // Check if valid URL format
    if (!playlistUrl.trim().startsWith('http://') && !playlistUrl.trim().startsWith('https://')) {
      setErrorMsg('Playlist must start with http:// or https://');
      return;
    }

    setErrorMsg('');
    onSave(playlistUrl.trim());
    onClose();
  };

  const handleReset = () => {
    setPlaylistUrl(DEFAULT_M3U_URL);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        className="glass-panel relative w-full max-w-lg rounded-2xl bg-slate-900 shadow-2xl border border-white/10 p-6 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Glow backdrop decorator */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Playlist source
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Paste any public M3U / M3U8 playlist URL. Your choice is saved in this browser for future streaming sessions.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Playlist Name (Optional)
              </label>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="My Custom Playlist"
                className="w-full bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none px-4 py-3 text-sm transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                M3U URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="https://example.com/playlist.m3u"
                  className="flex-grow bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none px-4 py-3 text-sm transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddPlaylist}
                  className="px-4 bg-slate-850 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 rounded-xl border border-slate-800 flex items-center justify-center transition-all active:scale-95 duration-100"
                  title="Add to saved list"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {errorMsg && (
                <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
                  <span>⚠️ {errorMsg}</span>
                </p>
              )}
            </div>
          </div>

          {/* Saved Playlists list */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <List className="w-3.5 h-3.5 text-cyan-400" />
              Saved Playlists
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {savedPlaylists.map((playlist, idx) => {
                const isActive = playlistUrl.trim() === playlist.url.trim();
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setPlaylistUrl(playlist.url);
                      setErrorMsg('');
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-800/40 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 flex-grow pr-3">
                      <div className="flex items-center gap-2">
                        {isActive && <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                        <span className="text-xs font-bold truncate text-slate-200">{playlist.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 truncate block mt-0.5">{playlist.url}</span>
                    </div>
                    
                    {playlist.url !== DEFAULT_M3U_URL && (
                      <button
                        type="button"
                        onClick={(e) => handleDeletePlaylist(playlist.url, e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all flex-shrink-0"
                        title="Delete saved playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-6">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to default
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-cyan-400/20 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Save Source
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


