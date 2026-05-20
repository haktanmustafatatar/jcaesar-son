"use client";

import { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpRight, 
  MoreVertical,
  Calendar,
  User as UserIcon,
  Shield,
  Activity,
  FileText,
  Trash2,
  Edit3,
  PlusCircle,
  RefreshCw,
  Clock
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

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/audit");
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (error) {
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.entityType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionIcon = (action: string) => {
    if (action.includes("CREATE")) return <PlusCircle className="w-4 h-4 text-emerald-500" />;
    if (action.includes("UPDATE")) return <Edit3 className="w-4 h-4 text-blue-500" />;
    if (action.includes("DELETE")) return <Trash2 className="w-4 h-4 text-rose-500" />;
    return <Activity className="w-4 h-4 text-zinc-400" />;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Loading Audit History...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-zinc-950 text-white rounded-lg px-3 py-1 font-black text-[10px] uppercase tracking-widest">Transparency Layer</Badge>
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
               <Shield className="w-3 h-3 text-emerald-500" />
               <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Immutable Logs</span>
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">System Audit</h1>
          <p className="text-zinc-500 font-medium mt-1">Full traceability for every administrative and user action</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-2xl h-14 px-6 font-bold bg-white border-zinc-200">
              <Calendar className="w-4 h-4 mr-2" />
              Download CSV
           </Button>
           <Button onClick={fetchLogs} className="rounded-2xl h-14 w-14 p-0 bg-zinc-950 hover:bg-zinc-900 text-white shadow-xl shadow-black/10">
              <RefreshCw className="w-5 h-5" />
           </Button>
        </div>
      </div>

      <Card className="rounded-[40px] border-none shadow-2xl shadow-zinc-200/50 overflow-hidden bg-white">
        <CardHeader className="p-8 border-b border-zinc-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black">Audit Stream</CardTitle>
              <CardDescription className="font-medium">Tracking last 100 system events</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input 
                placeholder="Search action, email or entity..." 
                className="h-12 w-full md:w-[350px] rounded-2xl bg-zinc-50 border-none pl-12 focus:bg-white transition-all shadow-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1000px] lg:min-w-full">
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">Action</TableHead>
                <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Entity</TableHead>
                <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Identity</TableHead>
                <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Timestamp</TableHead>
                <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right pr-8">Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-b border-zinc-50 hover:bg-zinc-50/30 transition-colors">
                  <TableCell className="py-6 px-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                        {getActionIcon(log.action)}
                      </div>
                      <span className="font-black text-zinc-900 text-sm">{log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <Badge variant="outline" className="rounded-lg px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider bg-zinc-50 text-zinc-500 border-zinc-200">
                      {log.entityType}
                    </Badge>
                    <p className="text-[10px] font-medium text-zinc-400 mt-1">ID: {log.entityId?.substring(0, 12)}...</p>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-2">
                       <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                       <span className="text-sm font-bold text-zinc-600">{log.userEmail || "System Agent"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 text-right pr-8">
                    <Button variant="ghost" size="sm" className="rounded-lg font-bold text-[10px] uppercase text-zinc-400 hover:text-zinc-950">
                      View JSON
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
