import { Channel } from '../types';

/**
 * Parses an M3U playlist content into an array of Channel objects.
 */
export function parseM3U(content: string): Channel[] {
  const channels: Channel[] = [];
  const lines = content.split(/\r?\n/);
  
  let currentExtInf: {
    name: string;
    logo: string;
    category: string;
    country?: string;
  } | null = null;

  // Helping matching regex
  const logoRegex = /tvg-logo="([^"]*)"/i;
  const nameRegex = /tvg-name="([^"]*)"/i;
  const groupRegex = /group-title="([^"]*)"/i;
  const countryRegex = /tvg-country="([^"]*)"/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // Parse tvg attributes
      const logoMatch = line.match(logoRegex);
      const nameAttrMatch = line.match(nameRegex);
      const groupMatch = line.match(groupRegex);
      const countryMatch = line.match(countryRegex);

      // Extract display name (after the last comma)
      const commaIndex = line.lastIndexOf(',');
      let displayName = '';
      if (commaIndex !== -1) {
        displayName = line.substring(commaIndex + 1).trim();
      }
      
      // Fallback name prioritizing displayName, then tvg-name attribute
      const name = displayName || (nameAttrMatch ? nameAttrMatch[1] : `Channel ${channels.length + 1}`);
      const logo = logoMatch ? logoMatch[1] : '';
      const category = groupMatch ? groupMatch[1] : 'Uncategorized';
      const country = countryMatch ? countryMatch[1] : undefined;

      currentExtInf = {
        name,
        logo,
        category,
        country
      };
    } else if (line && !line.startsWith('#') && currentExtInf) {
      // This is the stream URL
      const streamUrl = line;
      
      // Clean up categories
      let category = currentExtInf.category.trim();
      if (!category) {
        category = 'Uncategorized';
      }

      // Generate a nice random simulated viewer count between 5k and 250k for popular ones
      const rawViews = Math.floor(Math.random() * 45) + 1;
      const viewsCount = rawViews > 35 ? `${(rawViews / 10).toFixed(1)}M` : `${rawViews}K`;

      channels.push({
        id: `channel-${channels.length + 1}-${encodeURIComponent(currentExtInf.name.slice(0, 15))}`,
        name: currentExtInf.name,
        logo: currentExtInf.logo,
        category,
        streamUrl,
        country: currentExtInf.country,
        status: 'online', // default status
        viewsCount: `${viewsCount} Viewers`
      });

      currentExtInf = null; // reset for next entry
    }
  }

  return channels;
}
