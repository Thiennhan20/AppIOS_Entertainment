import axios from 'axios';
import { CONFIG } from '../constants/config';

const apiClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api/server3`,
  timeout: 20000,
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

export const nguoncApi = {
  async getStreamingLink(isTV: boolean, title: string, year: number, director: string = ''): Promise<{ vietsub: string, dubbed: string, m3u8: string } | null> {
    try {
      const endpoint = isTV ? '/search-tv' : '/search-movie';
      
      const searchData: any = await apiClient.get(endpoint, {
        params: {
          keyword: title,
          name: title,
          year: year,
          director: director
        }
      });

      if (searchData?.status === 'success' && searchData?.data?.links) {
        return searchData.data.links;
      }
      
      return null;
    } catch (e) {
      console.warn("Failed fetching from NguonC API", e);
      return null;
    }
  }
};
