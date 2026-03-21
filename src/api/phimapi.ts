import axios from 'axios';
import { CONFIG } from '../constants/config';
import { useTranslation } from 'react-i18next';

const apiClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api/server1`,
  timeout: 15000,
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
  async getStreamingLink(tmdbId: string, title: string, year: number): Promise<{ id: string, name: string, url: string }[] | null> {
    try {
      let slug = null;

      // 1. Direct fetch using TMDB API Lookup endpoint
      try {
        const tmdbDirectData: any = await apiClient.get(`/tmdb/movie/${tmdbId}`);
        if (tmdbDirectData?.status === true && tmdbDirectData?.movie) {
          const apiSlug = tmdbDirectData.movie.slug;
          
          if (apiSlug) {
             slug = apiSlug;
          }
        }
      } catch(e) {}

      // 2. Search fallback
      if (!slug) {
        const searchData: any = await apiClient.get('/search', { params: { keyword: title } });
        if (searchData?.status === 'success' && searchData.data?.items) {
           const match = findBestMatch(searchData.data.items, title, year, tmdbId);
           if (match) {
             slug = match.slug;
           }
        }
      }

      if (!slug) return null;

      // 3. Get Details to extract the valid M3U8 link
      const detailData: any = await apiClient.get(`/detail/${slug}`);
      
      let results: { id: string, name: string, url: string }[] = [];

      if (detailData.episodes && detailData.episodes.length > 0) {
        detailData.episodes.forEach((ep: any, index: number) => {
          if (ep.server_data && ep.server_data.length > 0) {
            let m3u8Link = ep.server_data[0].link_m3u8;
            if (m3u8Link && m3u8Link.includes('?url=')) {
              m3u8Link = m3u8Link.split('?url=')[1];
            }
            if (m3u8Link) {
              results.push({
                id: `phimapi_${index}`,
                name: ep.server_name || `Server 1 - ${index + 1}`,
                url: m3u8Link
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
