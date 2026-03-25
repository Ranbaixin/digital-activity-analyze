import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, 
  BarChart3, 
  History, 
  BrainCircuit, 
  FileJson, 
  FileSpreadsheet,
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  Globe,
  Search,
  Layout,
  Settings,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import Papa from 'papaparse';
import { cn } from './lib/utils';
import { ActivityItem, ActivitySummary, AIConfig } from './types';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function App() {
  const [data, setData] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load AI configuration from public/ai-config.json
  useEffect(() => {
    fetch('/ai-config.json')
      .then(res => res.json())
      .then(config => setAiConfig(config))
      .catch(err => {
        console.error("Failed to load AI config:", err);
        setAiConfig({ provider: 'gemini', apiKey: '', model: '', enabled: false });
      });
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setLoading(true);
    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        let items: any[] = [];
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            items = parsed;
          } else if (parsed.items && Array.isArray(parsed.items)) {
            items = parsed.items;
          } else if (parsed['Browser History'] && Array.isArray(parsed['Browser History'])) {
            items = parsed['Browser History'];
          } else {
            const possibleArray = Object.values(parsed).find(val => Array.isArray(val));
            if (possibleArray) items = possibleArray as any[];
          }
        } else if (file.name.endsWith('.csv')) {
          const results = Papa.parse(content, { header: false, skipEmptyLines: true });
          const rawData = results.data as string[][];
          
          if (rawData.length > 0) {
            const firstRow = rawData[0];
            const isHeader = firstRow.some(cell => 
              typeof cell === 'string' && (
                cell.toLowerCase().includes('title') || 
                cell.toLowerCase().includes('url') || 
                cell.toLowerCase().includes('time') ||
                cell.toLowerCase().includes('date')
              )
            );
            
            if (isHeader) {
              const headers = firstRow.map(h => h.trim().toLowerCase());
              items = rawData.slice(1).map(row => {
                const obj: any = {};
                headers.forEach((h, i) => {
                  // Map common header names to standard keys
                  let key = h;
                  if (h.includes('time') || h.includes('date')) key = 'time';
                  if (h.includes('url') || h.includes('link')) key = 'url';
                  if (h.includes('title') || h.includes('name')) key = 'title';
                  obj[key] = row[i];
                });
                return obj;
              });
            } else {
              // No header, assume [Time, URL, Title] based on Edge example
              items = rawData;
            }
          }
        }

        if (items.length === 0) {
          setError("未能从文件中提取到有效数据。");
          setLoading(false);
          return;
        }

        // Normalize data
        const normalizedItems: ActivityItem[] = items.map(item => {
          if (Array.isArray(item)) {
            // Handle [Time, URL, Title] pattern
            let timeVal = item[0];
            let url = item[1];
            let title = item[2] || url || "无标题";

            // Heuristic to check if columns are swapped (e.g. [URL, Title, Time])
            const isDate = (s: any) => typeof s === 'string' && !isNaN(Date.parse(s)) && (s.includes('T') || s.includes('-') || s.includes('/'));
            
            if (!isDate(timeVal)) {
              const dateIdx = item.findIndex(cell => isDate(cell));
              if (dateIdx !== -1) {
                timeVal = item[dateIdx];
                // Try to guess URL and Title from remaining
                const remaining = item.filter((_, i) => i !== dateIdx);
                url = remaining.find(s => typeof s === 'string' && s.startsWith('http')) || remaining[0];
                title = remaining.find(s => typeof s === 'string' && !s.startsWith('http')) || url || "无标题";
              }
            }

            return {
              title: String(title),
              url: String(url),
              time: timeVal ? new Date(timeVal).toISOString() : ""
            };
          }

          const title = item.title || item.text || item.header || item.url || "无标题";
          let time = item.time || item.visitTime || item.lastVisitTime || item.timestamp || item.date || item.last_visit_time;
          
          if (item.time_usec) {
            time = new Date(item.time_usec / 1000).toISOString();
          } else if (typeof time === 'number') {
            time = new Date(time > 1e12 ? time : time * 1000).toISOString();
          }

          const url = item.url || item.titleUrl || item.link;

          return {
            ...item,
            title: String(title),
            time: time ? new Date(time).toISOString() : "",
            url: String(url || "")
          };
        }).filter(item => item.time !== "" && !isNaN(new Date(item.time).getTime()));

        if (normalizedItems.length === 0) {
          setError("文件中没有包含有效的时间戳信息，无法进行时间维度分析。");
          setLoading(false);
          return;
        }

        setData(normalizedItems);
        analyzeActivity(normalizedItems);
      } catch (err) {
        console.error(err);
        setError("文件解析失败。请确保文件格式正确（JSON 或 CSV）。");
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const analyzeActivity = async (items: ActivityItem[]) => {
    setAnalyzing(true);
    try {
      const timeDist = new Array(24).fill(0);
      const dailyFreq: Record<string, number> = {};
      const domains: Record<string, number> = {};
      const titles: string[] = [];

      items.forEach(item => {
        const timeVal = item.time;
        if (!timeVal) return;
        
        const date = new Date(timeVal);
        if (isNaN(date.getTime())) return;

        timeDist[date.getHours()]++;
        const dateStr = date.toISOString().split('T')[0];
        dailyFreq[dateStr] = (dailyFreq[dateStr] || 0) + 1;

        if (item.title) titles.push(item.title);
        
        if (item.url) {
          try {
            const domain = new URL(item.url).hostname.replace('www.', '');
            domains[domain] = (domains[domain] || 0) + 1;
          } catch (e) {
            // Invalid URL
          }
        }
      });

      const timeDistribution = timeDist.map((count, hour) => ({ hour, count }));
      const dailyFrequency = Object.entries(dailyFreq)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

      const topDomains = Object.entries(domains)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // AI Analysis
      let aiSummaryText = "AI 分析未启用或未正确配置。";

      if (aiConfig?.enabled) {
        const sampleData = titles.slice(0, 150).join('\n');
        const domainList = topDomains.map(d => `${d.domain} (${d.count}次)`).join(', ');
        const prompt = `以下是用户的数字浏览/活动记录：\n主要访问域名：${domainList}\n部分页面标题：\n${sampleData}\n\n请根据这些数据分析用户的数字生活习惯、兴趣领域、工作/娱乐倾向，并给出一个深度总结。请用中文回答。`;

        try {
          if (aiConfig.provider === 'gemini') {
            const apiKey = aiConfig.apiKey || process.env.GEMINI_API_KEY!;
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
              model: aiConfig.model || "gemini-3.1-flash-lite-preview",
              contents: prompt,
            });
            aiSummaryText = response.text || "无法生成 AI 总结。";
          } else if (aiConfig.provider === 'openai') {
            const response = await fetch(`${aiConfig.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiConfig.apiKey}`
              },
              body: JSON.stringify({
                model: aiConfig.model,
                messages: [{ role: 'user', content: prompt }]
              })
            });
            const result = await response.json();
            aiSummaryText = result.choices?.[0]?.message?.content || "AI 接口调用失败，请检查配置。";
          }
        } catch (e) {
          console.error("AI Analysis failed:", e);
          aiSummaryText = "AI 分析调用失败，请检查网络或配置。";
        }
      }

      setSummary({
        timeDistribution,
        dailyFrequency,
        topDomains,
        aiSummary: aiSummaryText
      });
    } catch (err) {
      console.error(err);
      setError("AI 分析过程中出现错误。");
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const stats = useMemo(() => {
    if (!data.length) return null;
    const validTimes = data.map(d => new Date(d.time).getTime()).filter(t => !isNaN(t));
    if (!validTimes.length) return { total: data.length, firstDate: '未知', lastDate: '未知' };
    
    return {
      total: data.length,
      firstDate: new Date(Math.min(...validTimes)).toLocaleDateString(),
      lastDate: new Date(Math.max(...validTimes)).toLocaleDateString(),
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans selection:bg-violet-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">数字足迹分析器</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border",
              aiConfig?.enabled ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-500 border-gray-100"
            )}>
              {aiConfig?.enabled ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
              AI {aiConfig?.enabled ? "已启用" : "未启用"}
            </div>
            {data.length > 0 && (
              <button 
                onClick={() => { setData([]); setSummary(null); }}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                重新开始
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!data.length ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-extrabold mb-4 tracking-tight">洞察你的数字人生</h2>
                <p className="text-gray-500 text-lg">上传你的浏览器历史记录或 Google 活动记录，我们将为你揭示你的数字生活全貌。</p>
                {!aiConfig?.enabled && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-sm flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>提示：AI 分析未启用。您可以在根目录的 <b>ai-config.json</b> 中配置 API 以获得深度洞察。</span>
                  </div>
                )}
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "group relative border-2 border-dashed border-gray-200 rounded-3xl p-12 transition-all cursor-pointer",
                  "hover:border-violet-400 hover:bg-violet-50/30",
                  loading && "pointer-events-none opacity-50"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,.csv"
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-violet-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">点击或拖拽文件到这里</p>
                    <p className="text-sm text-gray-400 mt-1">支持 Chrome 历史记录插件导出或 Google Takeout 数据</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <Globe className="w-6 h-6 text-blue-500 mb-3" />
                  <h3 className="font-bold mb-1">浏览记录</h3>
                  <p className="text-sm text-gray-500">分析你访问的网站和频率。</p>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <Search className="w-6 h-6 text-green-500 mb-3" />
                  <h3 className="font-bold mb-1">搜索习惯</h3>
                  <p className="text-sm text-gray-500">揭示你最关心的知识领域。</p>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <Layout className="w-6 h-6 text-purple-500 mb-3" />
                  <h3 className="font-bold mb-1">全平台覆盖</h3>
                  <p className="text-sm text-gray-500">从视频到网页，一站式分析。</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 text-gray-400 mb-4">
                    <History className="w-5 h-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">总活动次数</span>
                  </div>
                  <div className="text-4xl font-black text-violet-600">{stats?.total.toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 text-gray-400 mb-4">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">时间跨度</span>
                  </div>
                  <div className="text-xl font-bold">{stats?.firstDate} — {stats?.lastDate}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 text-gray-400 mb-4">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">分析状态</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", analyzing ? "bg-amber-400 animate-pulse" : "bg-green-400")} />
                    <span className="font-bold">{analyzing ? "分析中..." : "分析完成"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Time Distribution */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-violet-600" />
                      <h3 className="text-xl font-bold">活跃时间段</h3>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary?.timeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="hour" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#999' }}
                          tickFormatter={(h) => `${h}:00`}
                        />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: '#f5f3ff' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          labelFormatter={(h) => `${h}:00`}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {summary?.timeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#8b5cf6' : '#e5e7eb'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Domains */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <Globe className="w-6 h-6 text-blue-600" />
                      <h3 className="text-xl font-bold">最常访问域名</h3>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary?.topDomains}
                          dataKey="count"
                          nameKey="domain"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ domain }) => domain}
                        >
                          {summary?.topDomains.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* AI Summary Section */}
              <div className={cn(
                "p-1 rounded-3xl shadow-xl transition-all",
                aiConfig?.enabled ? "bg-violet-600 shadow-violet-200" : "bg-gray-200 shadow-gray-100"
              )}>
                <div className="bg-white p-8 rounded-[22px]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <BrainCircuit className={cn("w-8 h-8", aiConfig?.enabled ? "text-violet-600" : "text-gray-400")} />
                      <h3 className="text-2xl font-black tracking-tight">AI 深度洞察</h3>
                    </div>
                    {!aiConfig?.enabled && (
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                        <Settings className="w-3 h-3" />
                        配置 ai-config.json 以启用
                      </div>
                    )}
                  </div>
                  <div className="prose prose-violet max-w-none">
                    {analyzing ? (
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-100 rounded-full w-3/4 animate-pulse" />
                        <div className="h-4 bg-gray-100 rounded-full w-full animate-pulse" />
                        <div className="h-4 bg-gray-100 rounded-full w-5/6 animate-pulse" />
                      </div>
                    ) : (
                      <p className={cn(
                        "text-lg leading-relaxed whitespace-pre-wrap",
                        aiConfig?.enabled ? "text-gray-700" : "text-gray-400 italic"
                      )}>
                        {summary?.aiSummary}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Trend */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <BarChart3 className="w-6 h-6 text-pink-600" />
                  <h3 className="text-xl font-bold">活跃度趋势</h3>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary?.dailyFrequency}>
                      <defs>
                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#999' }}
                        tickFormatter={(d) => d.split('-').slice(1).join('/')}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400">
          数据仅在本地处理。AI 分析由用户配置的接口提供。
        </p>
      </footer>
    </div>
  );
}
