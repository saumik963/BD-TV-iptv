export interface Channel {
  id: string;
  name: string;
  logo: string;
  category: string;
  streamUrl: string;
  country?: string;
  status?: 'online' | 'offline' | 'checking';
  viewsCount?: string;
}

export interface PlaylistSource {
  name: string;
  url: string;
}

export type SortOption = 'A-Z' | 'Z-A' | 'Most Popular' | 'Recent';
