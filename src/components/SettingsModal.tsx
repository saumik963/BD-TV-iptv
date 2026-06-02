import React, { useState } from 'react';
import { X, Globe, RotateCcw, Save } from 'lucide-react';
import { DEFAULT_M3U_URL } from '../data/defaultM3U';

interface SettingsModalProps {
  currentUrl: string;
  onSave: (url: string) => void;
  onClose: () => void;
}

export default function SettingsModal({
  currentUrl,
  onSave,
  onClose
}: SettingsModalProps) {
  const [playlistUrl, setPlaylistUrl] = useState(currentUrl);
  const [errorMsg, setErrorMsg] = useState('');

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
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              M3U URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="https://example.com/playlist.m3u"
                className="w-full bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none px-4 py-3 text-sm transition-all"
                autoFocus
              />
            </div>
            {errorMsg && (
              <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
                <span>⚠️ {errorMsg}</span>
              </p>
            )}
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
