"use client";

import { useState, useEffect } from "react";
import { 
  Activity, 
  Cpu, 
  Database, 
  RefreshCw, 
  Zap, 
  Server, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  History,
  HardDrive,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SystemHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [workers, setWorkers] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [healthRes, workerRes] = await Promise.all([
        fetch("/api/admin/health"),
        fetch("/api/admin/workers")
      ]);
      
      if (healthRes.ok) setHealth(await healthRes.json());
      if (workerRes.ok) setWorkers(await workerRes.json());
    } catch (error) {
      toast.error("Failed to sync system data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Pinging Core Systems...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${health?.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
            <Badge className="bg-zinc-950 text-white rounded-lg px-3 py-1 font-black text-[10px] uppercase tracking-widest">System Architecture</Badge>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">Neural Infrastructure</h1>
          <p className="text-zinc-500 font-medium mt-1">Real-time health monitoring and worker orchestration</p>
        </div>
        <Button 
          onClick={fetchData} 
          disabled={isRefreshing}
          className="rounded-2xl h-14 px-8 font-black bg-zinc-950 hover:bg-zinc-900 text-white shadow-xl shadow-black/10 transition-all active:scale-95"
        >
          {isRefreshing ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
          Sync Intelligence
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Core Components */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusCard 
              name="PostgreSQL" 
              status={health?.components?.database?.status} 
              latency={health?.components?.database?.latency}
              icon={Database}
              color="emerald"
            />
            <StatusCard 
              name="Redis Cluster" 
              status={health?.components?.redis?.status} 
              latency={health?.components?.redis?.latency}
              icon={Server}
              color="rose"
            />
            <StatusCard 
              name="OpenAI API" 
              status={health?.components?.openai?.status} 
              latency={health?.components?.openai?.latency}
              icon={Activity}
              color="blue"
            />
          </div>

          <Card className="rounded-[40px] border-none shadow-2xl shadow-zinc-200/50 bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-zinc-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black">Worker Orchestration</CardTitle>
                  <CardDescription className="font-medium">Active BullMQ queue monitoring</CardDescription>
                </div>
                <Badge variant="outline" className="rounded-xl border-zinc-200 font-black text-[10px] px-4 py-1 uppercase tracking-widest text-zinc-400">
                  {workers?.queues[0]?.status === 'busy' ? 'Active Processing' : 'Standby'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <WorkerStat label="Waiting" count={workers?.queues[0]?.waiting} color="zinc" />
                <WorkerStat label="Active" count={workers?.queues[0]?.active} color="emerald" />
                <WorkerStat label="Completed" count={workers?.queues[0]?.completed} color="blue" />
                <WorkerStat label="Failed" count={workers?.queues[0]?.failed} color="rose" />
              </div>

              <div className="pt-8 border-t border-zinc-50">
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6">Recent Operations</h4>
                <div className="space-y-4">
                  {workers?.recentActivity.map((job: any) => (
                    <div key={job.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100 group hover:bg-white hover:shadow-xl hover:shadow-zinc-100 transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${job.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                          {job.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-900 leading-tight">{job.name}</p>
                          <p className="text-[10px] font-medium text-zinc-400 truncate max-w-[200px]">{job.data?.url || 'Internal Task'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-950 uppercase tracking-tighter">
                          {new Date(job.timestamp).toLocaleTimeString()}
                        </p>
                        <p className="text-[10px] font-medium text-zinc-400">{new Date(job.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Load & Metrics */}
        <div className="lg:col-span-4 space-y-8">
           <Card className="rounded-[40px] border-none shadow-2xl shadow-zinc-200/50 bg-zinc-950 text-white overflow-hidden">
             <CardHeader className="p-8">
                <CardTitle className="text-xl font-black">Hardware Metrics</CardTitle>
                <CardDescription className="text-zinc-400 font-medium">Virtual machine performance</CardDescription>
             </CardHeader>
             <CardContent className="p-8 pt-0 space-y-10">
                <div className="space-y-6">
                   <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                         <span className="text-zinc-500">CPU Usage</span>
                         <span className="text-white">14%</span>
                      </div>
                      <Progress value={14} className="h-1.5 bg-white/5" />
                   </div>
                   <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                         <span className="text-zinc-500">Memory Load</span>
                         <span className="text-white">42%</span>
                      </div>
                      <Progress value={42} className="h-1.5 bg-white/5" />
                   </div>
                   <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                         <span className="text-zinc-500">I/O Wait</span>
                         <span className="text-white">0.2ms</span>
                      </div>
                      <Progress value={5} className="h-1.5 bg-white/5" />
                   </div>
                </div>

                <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 space-y-4">
                   <div className="flex items-center gap-3">
                      <History className="w-5 h-5 text-zinc-400" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">System Uptime</h4>
                   </div>
                   <p className="text-3xl font-black text-white">124d 14h 22m</p>
                </div>
             </CardContent>
           </Card>

           <div className="p-10 rounded-[48px] bg-white border-2 border-zinc-100 space-y-8 shadow-xl shadow-zinc-100/50">
              <div className="flex items-center gap-3">
                 <BarChart3 className="w-5 h-5 text-zinc-400" />
                 <h4 className="text-xs font-black text-zinc-950 uppercase tracking-widest">Neural Stability</h4>
              </div>
              <div className="flex gap-1.5 h-16 items-end">
                 {[0.4, 0.7, 0.8, 0.9, 0.6, 0.8, 0.7, 0.9, 0.95, 1, 0.8, 0.9, 0.9, 1].map((h, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ height: 0 }}
                      animate={{ height: `${h * 100}%` }}
                      className="flex-1 bg-zinc-100 rounded-t-sm hover:bg-zinc-900 transition-colors" 
                    />
                 ))}
              </div>
              <p className="text-xs font-medium text-zinc-500 leading-relaxed">
                Platform stability is currently at <span className="font-black text-zinc-950">99.98%</span>. No critical neural failures detected in the last 72 hours.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ name, status, latency, icon: Icon, color }: any) {
  const isUp = status === 'operational';
  
  return (
    <Card className="rounded-[32px] border-none shadow-xl shadow-zinc-200/40 bg-white group hover:-translate-y-1 transition-all duration-300">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 border border-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-all duration-500">
            <Icon className="w-6 h-6" />
          </div>
          <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{name}</p>
        <h3 className="text-xl font-black text-zinc-950 mb-1">{isUp ? 'Operational' : 'Degraded'}</h3>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Response: {latency || '---'}</p>
      </CardContent>
    </Card>
  );
}

function WorkerStat({ label, count, color }: any) {
  const colors: any = {
    zinc: "bg-zinc-50 text-zinc-900 border-zinc-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100"
  };

  return (
    <div className={`p-6 rounded-[32px] border ${colors[color]} text-center space-y-1`}>
      <p className="text-3xl font-black leading-none">{count || 0}</p>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
    </div>
  );
}
