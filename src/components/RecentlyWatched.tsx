import React from 'react';
import { Radio, RotateCcw, Play } from 'lucide-react';
import { Channel } from '../types';

interface RecentlyWatchedProps {
  channels: Channel[];
  onSelectChannel: (channel: Channel) => void;
  activeChannelId?: string;
  onClearHistory: () => void;
}

export default function RecentlyWatched({
  channels,
  onSelectChannel,
  activeChannelId,
  onClearHistory
}: RecentlyWatchedProps) {
  if (channels.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-6 h-28 border-t border-gray-800 flex flex-col glass overflow-hidden rounded-2xl">
      {/* Title Header */}
      <div className="px-4 pt-3 pb-1 flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-gray-500">
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Recently Watched</span>
          <span className="text-[9px] bg-gray-900 border border-gray-800 text-cyan-400 px-1.5 py-0.2 rounded font-bold">
            {channels.length}
          </span>
        </div>
        <button
          onClick={onClearHistory}
          className="text-[10px] text-gray-500 hover:text-rose-400 transition-colors uppercase tracking-wider font-semibold"
        >
          Clear History
        </button>
      </div>

      {/* Horizontal Cards Scroller */}
      <div className="flex gap-3 px-4 py-2 overflow-x-auto custom-scrollbar flex-1 items-center">
        {channels.map((ch) => {
          const isActive = ch.id === activeChannelId;
          return (
            <button
              key={`recent-${ch.id}`}
              onClick={() => onSelectChannel(ch)}
              className={`flex-shrink-0 w-36 h-[56px] rounded-lg border flex items-center justify-center relative overflow-hidden transition-all text-left px-3 group ${
                isActive
                  ? 'border-cyan-500/50 bg-cyan-950/20 shadow-md shadow-cyan-500/5'
                  : 'bg-gray-900 border-gray-800 hover:bg-gray-800/60 hover:border-gray-700'
              }`}
            >
              {/* Glow accent */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-400" />
              )}

              <div className="flex items-center gap-2.5 w-full min-w-0">
                {ch.logo ? (
                  <img
                    src={ch.logo}
                    alt=""
                    className="w-7 h-7 object-contain rounded bg-slate-950 p-0.5 border border-white/5 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-7 h-7 rounded bg-slate-950 flex items-center justify-center flex-shrink-0 border border-white/5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className={`text-[10px] font-extrabold truncate ${
                    isActive ? 'text-cyan-400' : 'text-gray-200 group-hover:text-white'
                  }`}>
                    {ch.name}
                  </span>
                  <span className="text-[8px] text-gray-500 uppercase tracking-tighter truncate mt-0.5">
                    {ch.category || 'Uncategorized'}
                  </span>
                </div>

                <Play className={`w-3 h-3 text-cyan-400 fill-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${isActive ? 'opacity-100' : ''}`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
