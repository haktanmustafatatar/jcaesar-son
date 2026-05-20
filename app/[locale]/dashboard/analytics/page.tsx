"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  Zap,
  Target,
  Clock,
  ChevronRight,
  MoreVertical,
  Filter,
  Share2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const satisfactionScore = useMemo(() => {
    const sentimentData = data?.sentimentData;
    if (!sentimentData || sentimentData.length === 0) return 0;
    const positive = sentimentData.find((s: any) => s.name === 'POSITIVE')?.value || 0;
    const total = sentimentData.reduce((acc: number, curr: any) => acc + curr.value, 0);
    return total > 0 ? Math.round((positive / total) * 100) : 0;
  }, [data]);

  if (!data && isLoading) {
    return <div className="flex items-center justify-center h-[60vh] font-bold text-muted-foreground animate-pulse">Intelligence is loading...</div>;
  }

  const { totalConversions, resolutionRate, totalCost, sourceData, sentimentData, trendData, botPerformance } = data || {
    totalConversions: 0,
    resolutionRate: 0,
    totalCost: 0,
    sourceData: [],
    sentimentData: [],
    trendData: [],
    botPerformance: []
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-black/5 p-4 rounded-2xl shadow-2xl">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm font-bold text-zinc-800">{entry.name}:</span>
                <span className="text-sm font-black text-primary">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-10">
      {/* Header & Controls */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
         <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Intelligence</h1>
            <p className="text-muted-foreground font-medium">Deep insights into your AI ecosystem and visitor behavior.</p>
         </div>
         
         <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-black/5 shadow-sm">
            <div className="flex gap-1">
              {["24h", "7d", "30d", "90d"].map((p) => (
                <Button 
                  key={p} 
                  variant={period === p ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className={`h-9 px-4 rounded-xl font-bold text-xs transition-all ${period === p ? "shadow-lg shadow-primary/20" : "text-muted-foreground"}`}
                >
                  {p.toUpperCase()}
                </Button>
              ))}
            </div>
            <div className="w-px h-6 bg-muted mx-1" />
            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold text-xs gap-2 border-black/5 hover:bg-white shadow-sm transition-all">
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
         </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Total Conversions", value: totalConversions.toLocaleString(), change: "+12.5%", icon: MessageSquare, color: "text-blue-500", chartColor: "#3b82f6" },
          { title: "Resolution Rate", value: `${resolutionRate}%`, change: "+4.3%", icon: Target, color: "text-emerald-500", chartColor: "#10b981" },
          { title: "Satisfaction Score", value: `${satisfactionScore}/100`, change: "+2.1%", icon: Users, color: "text-pink-500", chartColor: "#ec4899" },
          { title: "AI Savings (USD)", value: `$${(totalConversions * 2.5).toLocaleString()}`, change: "+18%", icon: Zap, color: "text-amber-500", chartColor: "#f59e0b" },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-500 border-black/5 bg-white/60 backdrop-blur-xl rounded-[32px]">
               <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                     <div className={`p-2.5 rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.03] ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                     </div>
                     <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-lg text-[10px] font-bold">
                        <ArrowUpRight className="w-3 h-3 mr-1" /> {stat.change}
                     </Badge>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{stat.title}</p>
                     <h3 className="text-3xl font-black tracking-tighter">{stat.value}</h3>
                  </div>
               </div>
               
               {/* Sparkline */}
               <div className="h-16 w-full -mb-1 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={trendData}>
                        <Area 
                          type="monotone" 
                          dataKey="conversations" 
                          stroke={stat.chartColor} 
                          fill={stat.chartColor} 
                          fillOpacity={0.1} 
                          strokeWidth={2}
                        />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Major Trend Chart */}
        <Card className="lg:col-span-2 bg-white rounded-[40px] border-black/5 overflow-hidden shadow-2xl shadow-black/[0.03]">
          <CardHeader className="p-8 pb-0">
             <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">Conversation Trends</CardTitle>
                  <CardDescription className="text-sm font-medium">Daily message volume across all active agents.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl bg-muted/30"><Filter className="w-4 h-4" /></Button>
             </div>
          </CardHeader>
          <CardContent className="p-8 h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} 
                    dy={15}
                  />
                  <YAxis 
                    hide 
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    name="Volume"
                    type="monotone" 
                    dataKey="conversations" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorConv)" 
                    animationDuration={2000}
                  />
                  <Area 
                    name="Savings"
                    type="monotone" 
                    dataKey="saved" 
                    stroke="#ec4899" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorSaved)" 
                    animationDuration={2500}
                  />
                </AreaChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card className="bg-white rounded-[40px] border-black/5 shadow-2xl shadow-black/[0.03] flex flex-col">
          <CardHeader className="p-8">
             <CardTitle className="text-xl font-black tracking-tight text-center">Traffic Sources</CardTitle>
             <CardDescription className="text-center font-medium">Distribution by platform.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 pt-0">
             <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={8}
                        dataKey="value"
                        animationDuration={1500}
                      >
                        {sourceData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                   </PieChart>
                </ResponsiveContainer>
             </div>
             
             <div className="grid grid-cols-2 gap-4 w-full mt-6">
                {sourceData.map((entry: any) => (
                   <div key={entry.name} className="p-3 rounded-2xl bg-muted/30 flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                         <span className="text-[10px] font-bold text-muted-foreground uppercase">{entry.name}</span>
                      </div>
                      <span className="text-sm font-black">{entry.value}%</span>
                   </div>
                ))}
             </div>
          </CardContent>
        </Card>

        {/* Sentiment Analysis Distribution */}
        <Card className="bg-white rounded-[40px] border-black/5 shadow-2xl shadow-black/[0.03] flex flex-col">
          <CardHeader className="p-8">
             <CardTitle className="text-xl font-black tracking-tight text-center">User Sentiment</CardTitle>
             <CardDescription className="text-center font-medium">Emotional distribution of all dialogues.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 pt-0">
             <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={8}
                        dataKey="value"
                        animationDuration={1500}
                      >
                        {sentimentData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                   </PieChart>
                </ResponsiveContainer>
             </div>
             
             <div className="grid grid-cols-2 gap-4 w-full mt-6">
                {sentimentData.map((entry: any) => (
                   <div key={entry.name} className="p-3 rounded-2xl bg-muted/30 flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                         <span className="text-[10px] font-bold text-muted-foreground uppercase">{entry.name}</span>
                      </div>
                      <span className="text-sm font-black">{entry.value}</span>
                   </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard & Real-time Info */}
      <div className="grid lg:grid-cols-3 gap-8">
         {/* Bot Leaderboard */}
         <Card className="lg:col-span-2 bg-white rounded-[40px] border-black/5 shadow-2xl shadow-black/[0.03]">
            <CardHeader className="p-8">
               <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Agent Leaderboard</CardTitle>
                    <CardDescription className="font-medium">Performance ranking based on AI resolution rates.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="font-bold text-xs text-primary h-8 px-4 rounded-lg bg-primary/5">View All Agents</Button>
               </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-muted">
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agent Name</th>
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Msgs</th>
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Resolution</th>
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/40">
                     {botPerformance.map((bot: any) => (
                       <tr key={bot.id} className="group hover:bg-muted/10 transition-colors">
                          <td className="py-5">
                             <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                   {bot.name.charAt(0)}
                                </div>
                                <span className="font-bold text-sm text-zinc-800">{bot.name}</span>
                             </div>
                          </td>
                          <td className="py-5 text-sm font-medium text-muted-foreground">{bot.msgs.toLocaleString()}</td>
                          <td className="py-5">
                             <div className="flex items-center gap-3">
                                <Progress value={bot.resolution} className="w-24 h-1.5" />
                                <span className="text-xs font-black">{bot.resolution}%</span>
                             </div>
                          </td>
                          <td className="py-5 text-right">
                             {bot.status === "top_perf" && <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-lg text-[10px] font-bold py-1 px-2 uppercase tracking-tighter">Top Performer</Badge>}
                             {bot.status === "stable" && <Badge className="bg-blue-500/10 text-blue-600 border-none rounded-lg text-[10px] font-bold py-1 px-2 uppercase tracking-tighter">Stable</Badge>}
                             {bot.status === "improving" && <Badge className="bg-amber-500/10 text-amber-600 border-none rounded-lg text-[10px] font-bold py-1 px-2 uppercase tracking-tighter">Improving</Badge>}
                             {bot.status === "needs_optim" && <Badge className="bg-rose-500/10 text-rose-600 border-none rounded-lg text-[10px] font-bold py-1 px-2 uppercase tracking-tighter">Needs Optimization</Badge>}
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </CardContent>
         </Card>

         {/* Efficiency / AI Info Card */}
         <div className="space-y-8">
            <Card className="bg-zinc-950 text-white rounded-[40px] border-none shadow-2xl relative overflow-hidden group p-8 flex flex-col justify-between">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-all duration-1000" />
               
               <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center ring-1 ring-white/20">
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                     </div>
                     <div>
                        <h4 className="font-bold text-lg">AI Savings</h4>
                        <p className="text-[11px] text-zinc-400 font-medium">Monthly projections based on resolution.</p>
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-zinc-400">Total Man Hours Saved</span>
                        <span className="text-2xl font-black text-white">428h</span>
                     </div>
                     <Progress value={85} className="h-2 bg-white/10" />
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">85% Optimization Increase</p>
                  </div>
               </div>

               <Button className="w-full bg-white text-zinc-900 hover:bg-zinc-200 rounded-2xl py-6 font-bold text-sm mt-8 relative z-10 transition-all active:scale-95 shadow-xl shadow-white/5">
                  View Efficiency Report
               </Button>
            </Card>

            <Card className="bg-primary rounded-[40px] border-none shadow-2xl p-8 flex flex-col justify-between overflow-hidden relative group">
               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                     <Share2 className="w-8 h-8 text-white opacity-40" />
                     <ArrowUpRight className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white text-2xl font-black tracking-tight leading-tight mb-2">Build Better Agents.</h3>
                  <p className="text-white/70 text-xs font-semibold leading-relaxed">Optimization algorithms suggest updating "Customer Service Bot" documentation for higher accuracy.</p>
               </div>
               <Button variant="ghost" className="w-full bg-black/10 text-white hover:bg-black/20 rounded-2xl py-6 font-bold text-sm mt-8 transition-all active:scale-95">
                  Optimize Now
               </Button>
            </Card>
         </div>
      </div>
    </div>
  );
}
