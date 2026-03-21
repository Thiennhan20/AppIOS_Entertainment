import axios from 'axios';
import { CONFIG } from '../constants/config';

export interface MovieRecommendation {
  title: string;
  reason: string;
}

const SYSTEM_PROMPT = `You are AI Hub - a smart entertainment assistant. You specialize in:
- Suggesting movies/series based on user preferences
- Summarizing movie overviews in English, concise, no spoilers
- Answering questions about movies, actors, directors
Always reply in English, be friendly and concise.`;

async function chatAIFetch(messages: any[], system: string = SYSTEM_PROMPT) {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/chatai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: system,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("ChatAI API Error:", errorText);
      throw new Error('ChatAI API error');
    }

    const data = await response.json();
    return data.reply as string; // Match what node server returns
  } catch (error) {
    return "AI system is under maintenance. Please try again later.";
  }
}

export const chatAIApi = {
  // 1. Chat tổng quát
  async chat(messages: { role: string, content: string }[]): Promise<string> {
    return chatAIFetch(messages);
  },

  // 2. Gợi ý phim
  async recommendMovies(preferences: string): Promise<MovieRecommendation[]> {
    const prompt = `Suggest 3 movies for the following preferences: ${preferences}. Return EXACTLY a valid JSON array [{"title": "english movie title", "reason": "reason why it's good"}], absolutely no extra text.`;
    
    try {
      const responseText = await chatAIFetch([{ role: 'user', content: prompt }]);
      // extract json from text if AI wrapped it
      const match = responseText.match(/\[.*\]/s);
      const jsonStr = match ? match[0] : responseText;
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  },

  // 3. Tóm tắt cốt truyện không spoiler
  async summarizeMovie(title: string, overview: string, year: number): Promise<string> {
    const prompt = `Act as AI Hub, summarize the incredibly engaging plot of the movie "${title}" (${year}) in exactly 3-4 sentences. Here is the original synopsis: "${overview}". DO NOT SPOIL THE ENDING, ONLY SUMMARIZE AS A COMPELLING INTRODUCTION!`;
    return chatAIFetch([{ role: 'user', content: prompt }]);
  }
};
