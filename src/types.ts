export interface AIConfig {
  provider: 'gemini' | 'openai';
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

export interface ActivityItem {
  title: string;
  url?: string;
  time: string;
  header?: string;
  description?: string;
  pageTransition?: string;
  clientName?: string;
  duration?: number; // in seconds
  startTime?: number; // timestamp in ms
  endTime?: number; // timestamp in ms
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ActivitySummary {
  timeDistribution: { hour: number; count: number; duration: number }[];
  weeklyDistribution: { day: string; count: number; duration: number }[];
  dailyFrequency: { date: string; count: number; duration: number }[];
  topDomains: { domain: string; count: number; duration: number }[];
  totalDuration: number;
  aiSummary: string;
}
