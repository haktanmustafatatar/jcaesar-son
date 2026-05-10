"use client";

import { motion } from "framer-motion";
import {
  Bot,
  MessageSquare,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const t = useTranslations("Dashboard.overview");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    {
      title: t("stats.totalChatbots"),
      value: data?.overview?.totalChatbots ?? "0",
      change: "+0",
      trend: "up",
      icon: Bot,
    },
    {
      title: t("stats.conversations"),
      value: data?.overview?.totalConversations?.toLocaleString() ?? "0",
      change: "+0%",
      trend: "up",
      icon: MessageSquare,
    },
    {
      title: t("stats.messages"),
      value: data?.overview?.totalMessages?.toLocaleString() ?? "0",
      change: "+0%",
      trend: "up",
      icon: TrendingUp,
    },
    {
      title: t("stats.activeUsers"),
      value: data?.overview?.activeUsers?.toLocaleString() ?? "0",
      change: "+0%",
      trend: "up",
      icon: Users,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Syncing Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-950">{t("title")}</h1>
          <p className="text-zinc-500 font-medium">
            {t("welcome")}
          </p>
        </div>
        <Link href="/dashboard/chatbots/new">
          <Button className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-2xl h-12 px-8 font-black shadow-xl shadow-black/10 transition-all active:scale-95">
            {t("createChatbot")}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-none shadow-xl shadow-zinc-200/50 rounded-[32px] overflow-hidden hover:shadow-2xl transition-all duration-500 group">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 border-b border-zinc-100/50">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {stat.title}
                </CardTitle>
                <stat.icon className="w-4 h-4 text-zinc-300 group-hover:text-zinc-950 transition-colors" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-4xl font-black text-zinc-950 tracking-tighter">{stat.value}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className={cn(
                    "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
                    stat.trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    ) : (
                      <ArrowDownRight className="w-2.5 h-2.5" />
                    )}
                    <span>{stat.change}</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{t("stats.fromLastMonth")}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Chatbots */}
        <Card className="border-none shadow-2xl shadow-zinc-200/50 rounded-[40px] overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-50 py-8 px-10">
            <div>
              <CardTitle className="text-xl font-black text-zinc-950">{t("recentChatbots.title")}</CardTitle>
              <p className="text-xs font-medium text-zinc-400 mt-1">Status of your neural agents</p>
            </div>
            <Link href="/dashboard/chatbots">
              <Button variant="ghost" size="sm" className="text-zinc-500 font-bold hover:text-zinc-950 hover:bg-zinc-50 rounded-xl px-4">
                {t("recentChatbots.viewAll")}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-10 pt-6">
            <div className="space-y-4">
              {(data?.recentChatbots || []).map((chatbot: any) => (
                <div
                  key={chatbot.name}
                  className="flex items-center justify-between p-5 rounded-[24px] bg-zinc-50/50 border border-zinc-100/50 hover:border-zinc-200 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                       <Bot className="w-6 h-6 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-black text-zinc-950 text-sm">{chatbot.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            chatbot.status === "ACTIVE"
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                              : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                          }`}
                        />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          {chatbot.status === "ACTIVE" ? t("recentChatbots.status.active") : t("recentChatbots.status.draft")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-zinc-950 tracking-tighter">
                      {chatbot.conversations.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      {t("recentChatbots.conversationsLabel")}
                    </p>
                  </div>
                </div>
              ))}
              {(!data?.recentChatbots || data.recentChatbots.length === 0) && (
                <div className="py-12 text-center">
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No active agents found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="border-none shadow-2xl shadow-zinc-200/50 rounded-[40px] overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-50 py-8 px-10">
            <div>
              <CardTitle className="text-xl font-black text-zinc-950">{t("recentConversations.title")}</CardTitle>
              <p className="text-xs font-medium text-zinc-400 mt-1">Latest user interactions</p>
            </div>
            <Link href="/dashboard/conversations">
              <Button variant="ghost" size="sm" className="text-zinc-500 font-bold hover:text-zinc-950 hover:bg-zinc-50 rounded-xl px-4">
                {t("recentConversations.viewAll")}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-10 pt-6">
            <div className="space-y-4">
              {(data?.recentConversations || []).map((conv: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-5 p-5 rounded-[24px] bg-zinc-50/50 border border-zinc-100/50 hover:border-zinc-200 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center flex-shrink-0 text-white font-black shadow-lg shadow-black/10">
                    {conv.user[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-950 truncate">{conv.user}</p>
                    <p className="text-sm text-zinc-500 font-medium truncate mt-0.5">
                      {conv.message}
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex-shrink-0 pt-1">
                    {new Date(conv.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {(!data?.recentConversations || data.recentConversations.length === 0) && (
                <div className="py-12 text-center">
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No recent conversations</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
