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
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ActivitySummary {
  timeDistribution: { hour: number; count: number }[];
  weeklyDistribution: { day: string; count: number }[];
  dailyFrequency: { date: string; count: number }[];
  topDomains: { domain: string; count: number }[];
  aiSummary: string;
}
