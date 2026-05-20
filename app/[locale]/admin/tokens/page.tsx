"use client";

import { useState, useEffect } from "react";
import { 
  Cpu, 
  Search, 
  Clock, 
  ArrowLeft, 
  Download,
  Filter,
  Bot,
  MessageSquare,
  ChevronRight,
  Globe,
  Database
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import Link from "next/link";
import { format } from "date-fns";

export default function TokenLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [crawlLogs, setCrawlLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/tokens");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.tokenLogs || []);
        setCrawlLogs(data.firecrawlLogs || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">Token Activity Logs</h1>
            <p className="text-zinc-500 font-medium">Real-time breakdown of LLM consumption and costs</p>
          </div>
        </div>

        <Tabs defaultValue="tokens" className="space-y-4">
          <TabsList className="bg-white border shadow-sm rounded-xl h-14 px-2 gap-2">
            <TabsTrigger value="tokens" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Cpu className="w-4 h-4 mr-2" />
              LLM Tokens
            </TabsTrigger>
            <TabsTrigger value="firecrawl" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Globe className="w-4 h-4 mr-2" />
              Firecrawl Usage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tokens" className="m-0">
            <Card className="rounded-[40px] border-none shadow-2xl shadow-zinc-200/50 overflow-hidden bg-white">
              <CardHeader className="p-8 border-b border-zinc-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge className="rounded-lg bg-zinc-100 text-zinc-600 border-none font-bold">Live Stream</Badge>
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                      <Clock className="w-3 h-3" />
                      Last updated: Just now
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="rounded-xl font-bold h-10 px-4">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" className="rounded-xl font-bold h-10 px-4">
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">Timestamp</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Agent</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Model</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Context</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Prompt</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Comp.</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Total</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right pr-8">Est. Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-40 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                          No logs available yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id} className="border-b border-zinc-50 hover:bg-zinc-50/30 transition-colors">
                          <TableCell className="py-5 px-8">
                            <p className="text-[11px] font-black text-zinc-900">{format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}</p>
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge variant="outline" className="rounded-lg font-bold text-[10px] bg-blue-50 text-blue-600 border-blue-100">
                              {log.chatbot?.name || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge variant="outline" className="rounded-lg font-bold text-[10px] bg-zinc-50 border-zinc-100 uppercase tracking-tighter">
                              {log.model}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5">
                            <div className="flex items-center gap-2">
                               <MessageSquare className="w-3 h-3 text-zinc-300" />
                               <span className="text-xs font-medium text-zinc-500 truncate max-w-[150px]">Conv: {log.conversationId?.substring(0, 8) || "System"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-5 text-right font-medium text-xs text-zinc-500">{log.promptTokens.toLocaleString()}</TableCell>
                          <TableCell className="py-5 text-right font-medium text-xs text-zinc-500">{log.completionTokens.toLocaleString()}</TableCell>
                          <TableCell className="py-5 text-right font-black text-xs text-zinc-900">{log.tokensUsed.toLocaleString()}</TableCell>
                          <TableCell className="py-5 text-right pr-8">
                            <span className="text-xs font-black text-emerald-600">${log.cost.toFixed(4)}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="firecrawl" className="m-0">
            <Card className="rounded-[40px] border-none shadow-2xl shadow-zinc-200/50 overflow-hidden bg-white">
              <CardHeader className="p-8 border-b border-zinc-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge className="rounded-lg bg-orange-100 text-orange-600 border-none font-bold">Firecrawl Engine</Badge>
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                      <Database className="w-3 h-3" />
                      Tracking scraped pages and character limits
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">Timestamp</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Agent</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Crawled URL</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</TableHead>
                      <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right pr-8">Characters Scraped</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crawlLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                          No crawl logs available yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      crawlLogs.map((log) => (
                        <TableRow key={log.id} className="border-b border-zinc-50 hover:bg-zinc-50/30 transition-colors">
                          <TableCell className="py-5 px-8">
                            <p className="text-[11px] font-black text-zinc-900">{log.lastCrawledAt ? format(new Date(log.lastCrawledAt), 'MMM dd, HH:mm:ss') : "N/A"}</p>
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge variant="outline" className="rounded-lg font-bold text-[10px] bg-blue-50 text-blue-600 border-blue-100">
                              {log.dataSource?.chatbot?.name || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5">
                            <a href={log.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-500 hover:underline max-w-[300px] truncate block">
                              {log.url}
                            </a>
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none rounded-lg text-[10px]">
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-xs text-zinc-900 pr-8">
                            {log.charCount?.toLocaleString() || 0} chars
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
