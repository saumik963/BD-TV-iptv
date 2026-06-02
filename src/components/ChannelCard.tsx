import { useMemo } from 'react';
import { Heart, Play, Radio, MapPin } from 'lucide-react';
import { Channel } from '../types';

interface ChannelCardProps {
  key?: string | number;
  channel: Channel;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (id: string) => void;
}

export default function ChannelCard({
  channel,
  isActive,
  isFavorite,
  onSelect,
  onToggleFavorite
}: ChannelCardProps) {

  const countryName = useMemo(() => {
    if (!channel.country) return '';
    try {
      // Return beautiful country flag or initials
      const codePoints = channel.country
        .toUpperCase()
        .split('')
        .map(char =>  127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return channel.country;
    }
  }, [channel.country]);

  const handleCardClick = () => {
    onSelect(channel);
    
    // Smooth scroll to video player on selection (excellent UX)
    const playerEl = document.getElementById('lumina-main-player');
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`glass group relative flex flex-col rounded-xl cursor-pointer overflow-hidden transition-all duration-300 transform select-none ${
        isActive 
          ? 'active-channel border-t border-r border-b border-cyan-500/20 scale-[1.01] shadow-lg shadow-cyan-400/5' 
          : 'hover:border-white/10 hover:bg-gray-800/20 hover:scale-[1.01]'
      }`}
    >
      {/* Thumbnail Aspect area */}
      <div className="relative aspect-video bg-slate-950/90 overflow-hidden flex items-center justify-center p-3 border-b border-white/5">
        
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-radial-at-c from-cyan-500/0 group-hover:from-cyan-500/5 transition-colors duration-500 pointer-events-none" />

        {channel.logo ? (
          <img
            src={channel.logo}
            alt={`${channel.name} logo`}
            loading="lazy"
            className="h-12 w-auto object-contain transition-transform duration-500 group-hover:scale-110 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
            onError={(e) => {
              // Hide image and show fallback icon
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : null}

        {/* Fallback avatar if no image or fails */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-only:hidden">
          {!channel.logo && (
            <div className="w-10 h-10 rounded-lg bg-gray-900 border border-white/5 flex items-center justify-center">
              <Radio className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'} transition-colors`} />
            </div>
          )}
        </div>

        {/* Live indicator tag */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-slate-950/90 border border-white/5 backdrop-blur-md rounded-md text-[9px] font-bold text-white uppercase tracking-wider shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 live-pulse" />
          Live
        </div>

        {/* Flag decorator if present */}
        {channel.country && (
          <div className="absolute top-2 right-2 flex items-center justify-center w-5.5 h-5.5 bg-slate-950/90 rounded-md text-[10px] font-semibold shadow-md border border-white/5 backdrop-blur-sm" title={`Country: ${channel.country}`}>
            <span>{countryName}</span>
          </div>
        )}

        {/* Play Icon Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950 transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg shadow-cyan-400/20">
            <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info details under thumbnail */}
      <div className="p-3.5 flex gap-2.5 items-start flex-grow">
        <div className="flex-grow min-w-0">
          <h3 className={`font-bold text-xs truncate leading-snug tracking-tight transition-colors ${
            isActive ? 'text-cyan-400' : 'text-slate-200 group-hover:text-cyan-300'
          }`}>
            {channel.name}
          </h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter truncate mt-0.5">{channel.category}</p>
        </div>

        {/* Touch friendly favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(channel.id);
          }}
          className={`p-1.5 rounded-lg border transition-all active:scale-90 ${
            isFavorite 
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
              : 'bg-white/5 border-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 hover:border-rose-500/10'
          }`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
      </div>
    </div>
  );
}
