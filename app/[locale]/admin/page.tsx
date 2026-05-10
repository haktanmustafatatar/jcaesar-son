"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Bot, 
  Cpu, 
  TrendingUp, 
  DollarSign, 
  Search, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Activity,
  Calendar,
  Loader2,
  ShieldCheck,
  User as UserIcon,
  CreditCard
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        setStats(await res.json());
      } else {
        toast.error("Failed to load admin stats");
      }
    } catch (error) {
      toast.error("An error occurred while fetching stats");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-zinc-200 border-t-zinc-950 animate-spin" />
          <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-zinc-950" />
        </div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Authenticating Admin Session...</p>
      </div>
    );
  }

  const filteredUsers = (stats?.topUsers || []).filter((u: any) => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 p-6 lg:p-10">
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="rounded-full bg-zinc-950 text-white border-none px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
                System Administrator
              </Badge>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900">Platform Control</h1>
            <p className="text-zinc-500 font-medium mt-1">Global usage monitoring and user management</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold bg-white border-zinc-200 hover:bg-zinc-50 flex-1 md:flex-none">
               <Calendar className="w-4 h-4 mr-2" />
               Last 30 Days
             </Button>
             <Button className="rounded-2xl h-12 px-8 font-black bg-zinc-950 hover:bg-zinc-900 text-white shadow-xl shadow-black/10 flex-1 md:flex-none">
               Generate Report
             </Button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Users" 
            value={stats?.overview.totalUsers} 
            subValue="+12% from last month" 
            icon={Users} 
            trend="up"
          />
          <StatCard 
            title="Active Chatbots" 
            value={stats?.overview.totalChatbots} 
            subValue="Across all organizations" 
            icon={Bot} 
          />
          <StatCard 
            title="Token Consumption" 
            value={(stats?.overview.totalTokens / 1000).toFixed(1) + "k"} 
            subValue="Global usage volume" 
            icon={Cpu} 
            trend="up"
          />
          <StatCard 
            title="Est. Revenue" 
            value={"$" + stats?.overview.totalRevenue.toFixed(2)} 
            subValue="Total value generated" 
            icon={DollarSign} 
            trend="up"
          />
        </div>

        {/* Content Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Management */}
          <Card className="lg:col-span-2 rounded-[40px] border-none shadow-2xl shadow-zinc-200/50 overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-zinc-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-black">User Intelligence</CardTitle>
                  <CardDescription className="font-medium">Managing {stats?.overview.totalUsers} active platform users</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input 
                    placeholder="Search by name or email..." 
                    className="h-12 w-full md:w-[300px] rounded-2xl bg-zinc-50 border-none pl-12 focus:bg-white transition-all shadow-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[800px] lg:min-w-full">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">User</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Bots</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Tokens Used</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id} className="border-b border-zinc-50 hover:bg-zinc-50/30 transition-colors">
                      <TableCell className="py-6 px-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-black text-zinc-400 text-sm">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-zinc-900 text-sm leading-tight">{user.name}</p>
                            <p className="text-[11px] font-medium text-zinc-400">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <Badge variant="outline" className={`rounded-full px-3 py-0.5 font-bold text-[10px] uppercase tracking-wider ${
                          user.role === 'ADMIN' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6 text-right font-bold text-sm">{user.botCount}</TableCell>
                      <TableCell className="py-6 text-right">
                        <p className="font-black text-zinc-900 text-sm">{user.totalTokens.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Est. Cost: ${user.totalCost.toFixed(2)}</p>
                      </TableCell>
                      <TableCell className="py-6 text-right pr-8">
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-zinc-100">
                          <MoreVertical className="w-4 h-4 text-zinc-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Activity Sidebar */}
          <div className="space-y-8">
            <Card className="rounded-[40px] border-none shadow-2xl shadow-zinc-200/50 bg-white">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black">System Health</CardTitle>
                <CardDescription className="font-medium">Real-time platform status</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="space-y-4">
                  <HealthItem label="API Gateway" status="operational" />
                  <HealthItem label="Chat Engines" status="operational" />
                  <HealthItem label="Crawler Workers" status="operational" />
                  <HealthItem label="Vector Database" status="operational" />
                </div>
                <div className="pt-6 border-t border-zinc-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Server Load</p>
                    <p className="text-[11px] font-bold text-zinc-900">24%</p>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full w-[24%] bg-zinc-950 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[40px] border-none shadow-2xl shadow-zinc-200/50 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white">
              <CardContent className="p-10 space-y-6">
                <div className="w-14 h-14 rounded-3xl bg-white/10 flex items-center justify-center">
                  <CreditCard className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">Plan Management</h3>
                  <p className="text-zinc-400 font-medium text-sm mt-2 leading-relaxed">
                    Update subscription tiers, manage Stripe products, and control feature gates globally.
                  </p>
                </div>
                <Button className="w-full h-14 rounded-2xl bg-white text-zinc-950 font-black hover:bg-zinc-100 transition-all shadow-xl shadow-black/20">
                  Manage Plans
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, icon: Icon, trend }: any) {
  return (
    <Card className="rounded-[32px] border-none shadow-xl shadow-zinc-200/40 bg-white overflow-hidden group">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 border border-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-all duration-500">
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 font-bold text-[11px] uppercase tracking-tighter ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              8.4%
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-1">{title}</p>
          <h2 className="text-3xl font-black text-zinc-950">{value}</h2>
          <p className="text-[11px] font-medium text-zinc-400 mt-1">{subValue}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthItem({ label, status }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
      <div className="flex items-center gap-3">
        <Activity className="w-4 h-4 text-zinc-400" />
        <span className="text-xs font-bold text-zinc-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{status}</span>
      </div>
    </div>
  );
}
