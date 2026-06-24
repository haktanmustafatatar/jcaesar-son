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
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import { useParams } from "next/navigation";

export default function DashboardPage() {
  const t = useTranslations("Dashboard.overview");
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const isTr = locale === "tr";
  
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

  const totalChatbots = data?.overview?.totalChatbots ?? 0;

  const stats = [
    {
      title: t("stats.totalChatbots"),
      value: totalChatbots,
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
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">{t("loading")}</p>
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

      {totalChatbots === 0 ? (
        /* Premium Onboarding Widget */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 text-white border border-zinc-850 shadow-2xl p-8 md:p-10"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                🚀 {isTr ? "J.Caesar'a Hoş Geldin!" : "Welcome to J.Caesar!"}
              </h2>
              <p className="text-zinc-400 font-medium max-w-xl">
                {isTr 
                  ? "Yapay zeka asistanınızı kurmak ve ilk müşterilerinizle buluşturmak için 3 basit adımı tamamlayın." 
                  : "Complete 3 simple steps to set up your AI assistant and connect with your customers."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-zinc-800/80">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary text-xs font-black">1</span>
                  <h4 className="font-bold text-sm">{isTr ? "Bot Oluştur" : "Create Bot"}</h4>
                </div>
                <p className="text-xs text-zinc-550 leading-relaxed">
                  {isTr ? "Botunuza isim verin, kişiliğini ve çalışma amacını belirleyin." : "Give your bot a name, define its personality and purpose."}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary text-xs font-black">2</span>
                  <h4 className="font-bold text-sm">{isTr ? "Bilgi Ekle" : "Add Knowledge"}</h4>
                </div>
                <p className="text-xs text-zinc-555 leading-relaxed">
                  {isTr ? "Dosya, web sitesi veya soru-cevap ekleyerek botunuzu eğitin." : "Train your bot by uploading files, crawling web URLs, or adding Q&As."}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary text-xs font-black">3</span>
                  <h4 className="font-bold text-sm">{isTr ? "Yayınla" : "Publish"}</h4>
                </div>
                <p className="text-xs text-zinc-556 leading-relaxed">
                  {isTr ? "Widget kodunu sitenize gömün veya sosyal medya kanallarını bağlayın." : "Embed the chat widget code or link social channels to go live."}
                </p>
              </div>
            </div>

            <div className="pt-4 flex">
              <Link href="/dashboard/chatbots/new">
                <Button className="bg-primary hover:bg-primary/95 text-white font-bold h-12 px-8 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-transform">
                  {isTr ? "İlk Botumu Oluştur →" : "Create My First Bot →"}
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
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
                        <ArrowUpRight className="w-2.5 h-2.5" />
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
                  <p className="text-xs font-medium text-zinc-400 mt-1">{t("recentChatbots.subtitle")}</p>
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
                      <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t("recentChatbots.noData")}</p>
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
                  <p className="text-xs font-medium text-zinc-400 mt-1">{t("recentConversations.subtitle")}</p>
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
                      <Avatar className="w-12 h-12 rounded-2xl border border-zinc-100 flex-shrink-0">
                        <AvatarImage src={conv.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.user}`} className="object-cover" />
                        <AvatarFallback className="bg-zinc-950 text-white font-black">{(conv.user || "U").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
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
                      <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t("recentConversations.noData")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// imports moved to top
