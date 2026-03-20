import axios from 'axios';
import { CONFIG } from '../constants/config';

export interface MovieRecommendation {
  title: string;
  reason: string;
}

const SYSTEM_PROMPT = `Bạn là VIBE AI - trợ lý giải trí thông minh. Bạn chuyên về:
- Gợi ý phim/series phù hợp sở thích người dùng
- Tóm tắt nội dung phim bằng tiếng Việt, súc tích, không spoiler
- Trả lời câu hỏi về phim, diễn viên, đạo diễn
Luôn trả lời bằng tiếng Việt, thân thiện và ngắn gọn.`;

function getAuthHeader() {
  return {
    'x-api-key': CONFIG.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true', // Needed for direct fetch
  };
}

async function claudeFetch(messages: any[], system: string = SYSTEM_PROMPT) {
  if (!CONFIG.ANTHROPIC_API_KEY || CONFIG.ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_KEY_HERE') {
    // Return mock response for dev without API Key
    return new Promise<string>((resolve) => setTimeout(() => resolve("Đây là tin nhắn giả lập từ VIBE AI (Bạn chưa cấu hình ANTHROPIC_API_KEY trong máy!)."), 1500));
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: system,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn("Claude API Error:", errorText);
    throw new Error('Claude API error');
  }

  const data = await response.json();
  return data.content[0].text as string;
}

export const claudeApi = {
  // 1. Chat tổng quát
  async chat(messages: { role: string, content: string }[]): Promise<string> {
    return claudeFetch(messages);
  },

  // 2. Gợi ý phim
  async recommendMovies(preferences: string): Promise<MovieRecommendation[]> {
    const prompt = `Gợi ý 3 bộ phim cho sở thích sau: ${preferences}. Trả về ĐÚNG chuẩn mảng JSON [{"title": "tên phim tiếng anh", "reason": "lý do vì sao hay"}], tuyệt đối không có text thừa.`;
    
    if (!CONFIG.ANTHROPIC_API_KEY || CONFIG.ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_KEY_HERE') {
      return new Promise<MovieRecommendation[]>((res) => setTimeout(() => res([
        { title: "Inception", reason: "Vì đây là phim kinh điển nhất về giấc mơ hacker hack não" },
        { title: "Zootopia", reason: "Vì bộ phim hoạt hình này cực kỳ vui nhộn và phù hợp giải trí" }
      ]), 1000));
    }

    try {
      const responseText = await claudeFetch([{ role: 'user', content: prompt }]);
      // extract json from text if claude wrapped it
      const match = responseText.match(/\[.*\]/s);
      const jsonStr = match ? match[0] : responseText;
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  },

  // 3. Tóm tắt cốt truyện không spoiler
  async summarizeMovie(title: string, overview: string, year: number): Promise<string> {
    const prompt = `Hãy đóng vai VIBE AI, tóm tắt cực kỳ hấp dẫn kịch bản của phim "${title}" (${year}) trong vỏn vẹn 3-4 câu. Dưới đây là nội dung gốc (có thể bằng tiếng anh): "${overview}". KHÔNG SPOILER ĐOẠN KẾT, CHỈ TÓM TẮT DẠNG GIỚI THIỆU LÔI CUỐN!`;
    return claudeFetch([{ role: 'user', content: prompt }]);
  }
};
