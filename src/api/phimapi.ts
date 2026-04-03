import axios from 'axios';
import { CONFIG } from '../constants/config';

const apiClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api/server1`,
  timeout: 60000,
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

// Helper function to normalize title for comparison
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
    .trim();
}

// Helper function to calculate Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// Helper function to calculate string similarity
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function findBestMatch(items: any[], targetTitle: string, targetYear: number, tmdbId: string): any | null {
  if (!items || items.length === 0) return null;

  // Priority 1: Exact TMDB ID match
  const tmdbMatch = items.find(item =>
    item.tmdb && item.tmdb.id && item.tmdb.id.toString() === tmdbId.toString()
  );
  if (tmdbMatch) return tmdbMatch;

  // Priority 2: Exact title and year match
  const exactMatch = items.find(item => {
    const titleMatch = normalizeTitle(item.name || item.title || '') === normalizeTitle(targetTitle);
    const yearMatch = item.year && parseInt(String(item.year)) === targetYear;
    return titleMatch && yearMatch;
  });
  if (exactMatch) return exactMatch;

  // Priority 3: Origin name match (similar to slug matching)
  const originNameMatch = items.find(item => {
    if (!item.origin_name) return false;
    const originNameNormalized = normalizeTitle(item.origin_name);
    const targetNormalized = normalizeTitle(targetTitle);
    const similarity = calculateSimilarity(originNameNormalized, targetNormalized);
    const yearDiff = Math.abs(parseInt(String(item.year || '0')) - targetYear);
    return similarity > 0.7 && yearDiff <= 2;
  });
  if (originNameMatch) return originNameMatch;

  // Priority 4: Title match with year tolerance
  const titleMatchWithYearTolerance = items.find(item => {
    const titleMatch = normalizeTitle(item.name || item.title || '') === normalizeTitle(targetTitle);
    const yearDiff = Math.abs(parseInt(String(item.year || '0')) - targetYear);
    return titleMatch && yearDiff <= 1;
  });
  if (titleMatchWithYearTolerance) return titleMatchWithYearTolerance;

  // Priority 5: Fuzzy title match
  const fuzzyMatch = items.find(item => {
    const itemTitle = normalizeTitle(item.name || item.title || '');
    const targetNormalized = normalizeTitle(targetTitle);
    const similarity = calculateSimilarity(itemTitle, targetNormalized);
    const yearDiff = Math.abs(parseInt(String(item.year || '0')) - targetYear);
    return similarity > 0.8 && yearDiff <= 2;
  });

  return fuzzyMatch || null;
}

export const phimApi = {
  async getStreamingLink(tmdbId: string, title: string, year: number, selectedEpisode: number = 1, isTV: boolean = false, selectedSeason: number = 1): Promise<{ id: string, name: string, url: string }[] | null> {
    try {
      let slug = null;
      let finalDetailData: any = null;

      const titleForSearch = normalizeTitle(title);
      const originNameWithSeason = `${title} (Season ${selectedSeason})`;

      const checkEpisodeExists = (episodes: any[]) => {
        if (!episodes || episodes.length === 0) return false;
        return episodes.some((group: any) => {
          if (!group.server_data) return false;
          return group.server_data.some((ep: any) => 
            ep.name === selectedEpisode.toString() || 
            ep.name?.toLowerCase() === `tập ${selectedEpisode}` || 
            ep.name?.toLowerCase() === `tập 0${selectedEpisode}` ||
            ep.slug === `tap-${selectedEpisode}` ||
            ep.slug === `${selectedEpisode}` ||
            ep.slug === 'full' ||
            ep.name?.toLowerCase() === 'full'
          );
        });
      };

      const searchAndGetDetail = async (keyword: string) => {
        try {
          const searchData: any = await apiClient.get('/search', { params: { keyword } });
          if (searchData?.status === 'success' && searchData.data?.items) {
             for (const item of searchData.data.items) {
               try {
                 const detailData: any = await apiClient.get(`/detail/${item.slug}`);
                 if (checkEpisodeExists(detailData.episodes)) {
                    return { slug: item.slug, detailData };
                 }
               } catch (e) {}
             }
             
             // Fallback: if it's a movie and we didn't match episode, just return the first item's details that HAS episodes
             if (!isTV && searchData.data.items.length > 0) {
               const fallbackItem = searchData.data.items[0];
               const fbData: any = await apiClient.get(`/detail/${fallbackItem.slug}`);
               if (fbData.episodes?.length > 0) {
                 return { slug: fallbackItem.slug, detailData: fbData };
               }
             }
          }
        } catch (e) {}
        return null;
      };

      // 1. Try tmdb directly
      try {
        const tmdbEndpoint = isTV ? `/tmdb/tv/${tmdbId}` : `/tmdb/movie/${tmdbId}`;
        const tmdbDirectData: any = await apiClient.get(tmdbEndpoint);
        if (tmdbDirectData?.status === true && tmdbDirectData?.movie) {
           let isValidSeason = true;
           const apiSlug = tmdbDirectData.movie.slug;
           
           if (isTV) {
             const apiName = tmdbDirectData.movie.name || '';
             const apiOriginName = tmdbDirectData.movie.origin_name || '';
             
             const extractSeason = (text: string): number | null => {
               const patterns = [
                   /ph[aầ]n[-\s]*(\d+)/i,
                   /season[-\s]*(\d+)/i,
                   /m[uù]a[-\s]*(\d+)/i,
                   /part[-\s]*(\d+)/i,
                   /\bs(\d{1,2})\b/i,
               ];
               for (const p of patterns) {
                   const m = text.match(p);
                   if (m) return parseInt(m[1], 10);
               }
               const trailing = text.match(/-(\d+)$|\s(\d+)$/);
               if (trailing) {
                 const num = parseInt(trailing[1] || trailing[2], 10);
                 if (num < 100) return num;
               }
               return null;
             };
             
             const textToSearch = `${apiName} ${apiOriginName} ${apiSlug}`.toLowerCase();
             const detectedSeason = extractSeason(textToSearch);
             
             if (detectedSeason !== null && detectedSeason !== selectedSeason) {
               isValidSeason = false;
             }
           }

           if (isValidSeason) {
             const detailData: any = await apiClient.get(`/detail/${apiSlug}`);
             if (checkEpisodeExists(detailData.episodes) || !isTV) {
                slug = apiSlug;
                finalDetailData = detailData;
             }
           }
        }
      } catch (e) {}

      // 2. Search fallback with priorities
      if (!slug) {
         if (isTV) {
           const keywords = [
              originNameWithSeason,
              `${titleForSearch} phần ${selectedSeason}`,
              `${titleForSearch} part ${selectedSeason}`,
              `${titleForSearch} season ${selectedSeason}`,
              `${titleForSearch} tập ${selectedEpisode}`,
              title
           ];
           for (const kw of keywords) {
             const res = await searchAndGetDetail(kw);
             if (res) {
                slug = res.slug;
                finalDetailData = res.detailData;
                break;
             }
           }
         } else {
           const res = await searchAndGetDetail(title);
           if (res) {
             slug = res.slug;
             finalDetailData = res.detailData;
           }
         }
      }

      if (!slug || !finalDetailData) return null;

      let results: { id: string, name: string, url: string }[] = [];

      if (finalDetailData.episodes && finalDetailData.episodes.length > 0) {
        finalDetailData.episodes.forEach((serverGroup: any, index: number) => {
          if (serverGroup.server_data && serverGroup.server_data.length > 0) {
            
            let episodeData = serverGroup.server_data.find((ep: any) => {
               const nameMatches = ep.name === selectedEpisode.toString() || ep.name?.toLowerCase() === `tập ${selectedEpisode}` || ep.name?.toLowerCase() === `tập 0${selectedEpisode}` || ep.name?.toLowerCase() === 'full';
               const slugMatches = ep.slug === `tap-${selectedEpisode}` || ep.slug === `${selectedEpisode}` || ep.slug === 'full';
               return nameMatches || slugMatches;
            });

            if (!episodeData) {
               episodeData = serverGroup.server_data[selectedEpisode - 1];
            }
            if (!episodeData) {
               episodeData = serverGroup.server_data[0];
            }

            let streamUrl = episodeData?.link_embed || episodeData?.link_m3u8;
            if (streamUrl && streamUrl.includes('?url=')) {
              streamUrl = streamUrl.split('?url=')[1];
            }
            if (streamUrl) {
              results.push({
                id: `server1_${index}`,
                name: serverGroup.server_name || `Track ${index + 1}`,
                url: streamUrl
              });
            }
          }
        });
      }

      return results.length > 0 ? results : null;
    } catch (e) {
      console.warn("Failed fetching from PhimAPI", e);
      return null;
    }
  }
};
