"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Bot,
  Code, 
  Copy, 
  Check, 
  ChevronLeft, 
  Globe, 
  Settings, 
  Palette,
  Sparkles,
  Info,
  MessageCircle,
  Instagram,
  Facebook,
  ShoppingBag,
  ShoppingCart,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function EmbedPage() {
  const t = useTranslations("Dashboard.embed");
  const params = useParams();
  const id = params.id as string;
  const [chatbot, setChatbot] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    fetchChatbot();
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
  }, [id]);

  const fetchChatbot = async () => {
    try {
      const res = await fetch(`/api/chatbots/${id}`);
      if (res.ok) {
        const data = await res.json();
        setChatbot(data);
      }
    } catch (error) {
      console.error("Error fetching chatbot:", error);
    }
  };

  const embedCode = `<script
  src="${appUrl}/widget.js"
  data-chatbot-id="${id}"
  defer
></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success(t("copySuccess"));
    setTimeout(() => setCopied(false), 2000);
  };

  const channelModules = [
    {
      id: "meta",
      title: "Meta Suite",
      subtitle: "WhatsApp, IG & Messenger",
      description: "Deploy your agent across the Meta ecosystem with zero friction.",
      icons: [<MessageCircle className="w-5 h-5 text-[#25D366]" />, <Instagram className="w-5 h-5 text-[#E1306C]" />, <Facebook className="w-5 h-5 text-[#1877F2]" />],
      link: `/dashboard/chatbots/${id}/integrations`,
      status: "Configurable",
      color: "border-blue-500/10 hover:border-blue-500/40 bg-blue-500/5"
    },
    {
      id: "shopify",
      title: "Shopify Engine",
      subtitle: "E-Commerce Intelligence",
      description: "Sync products, track orders, and boost sales with AI logic.",
      icons: [<ShoppingBag className="w-5 h-5 text-[#95BF47]" />],
      link: `/dashboard/chatbots/${id}/integrations`,
      status: "Ready",
      color: "border-green-500/10 hover:border-green-500/40 bg-green-500/5"
    },
    {
      id: "woo",
      title: "WooCommerce",
      subtitle: "WordPress Native",
      description: "Deep integration for WooCommerce stores and inventory.",
      icons: [<ShoppingCart className="w-5 h-5 text-[#96588A]" />],
      link: `/dashboard/chatbots/${id}/integrations`,
      status: "Ready",
      color: "border-purple-500/10 hover:border-purple-500/40 bg-purple-500/5"
    },
    {
      id: "google",
      title: "Google Sync",
      subtitle: "Calendar & Meetings",
      description: "Book appointments and manage schedules via neural agent.",
      icons: [<Calendar className="w-5 h-5 text-[#4285F4]" />],
      link: `/dashboard/chatbots/${id}/integrations`,
      status: "Ready",
      color: "border-yellow-500/10 hover:border-yellow-500/40 bg-yellow-500/5"
    }
  ];

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-40">
      {/* Premium Command Center Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 animate-in fade-in slide-in-from-top-6 duration-1000">
        <div className="flex items-center gap-8">
          <Link href={`/dashboard/chatbots/${id}`}>
            <Button variant="ghost" size="icon" className="w-16 h-16 rounded-[24px] hover:bg-zinc-100 border-2 border-zinc-100 shadow-sm">
              <ChevronLeft className="w-8 h-8 text-zinc-900" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
               <Badge className="bg-zinc-950 text-white rounded-lg px-3 py-1 font-black text-[10px] uppercase tracking-widest">{t("controlCenter")}</Badge>
               <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{t("workerOnline")}</span>
               </div>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-zinc-900">
              {t("title")}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-3 rounded-[32px] border-2 border-zinc-100 shadow-xl shadow-black/5">
           <div className="flex -space-x-3 px-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-zinc-100 overflow-hidden ring-1 ring-zinc-50 shadow-sm">
                   <img src={`https://i.pravatar.cc/100?u=${i+id}`} alt="user" className="w-full h-full object-cover grayscale" />
                </div>
              ))}
           </div>
           <div className="pr-4 py-1">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">{t("deploymentHealth")}</p>
              <div className="flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-emerald-500" />
                 <span className="text-sm font-black text-zinc-900">{t("enterpriseVerified")}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Left Column: Modules & Integrations */}
        <div className="xl:col-span-8 space-y-12">
           
           {/* Section: Website Widget */}
           <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                 <Monitor className="w-5 h-5 text-zinc-400" />
                 <h2 className="text-xl font-black text-zinc-900 uppercase tracking-widest">{t("nativeWebClient")}</h2>
              </div>
              
              <Card className="rounded-[48px] border-none bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] overflow-hidden group">
                 <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                       <div className="p-12 space-y-8">
                          <div className="space-y-4">
                             <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center shadow-2xl shadow-black/30 group-hover:rotate-6 transition-transform">
                                <Code className="w-7 h-7 text-white" />
                             </div>
                             <h3 className="text-3xl font-black text-zinc-900">{t("directScript")}</h3>
                             <p className="text-sm font-medium text-zinc-500 leading-relaxed">
                                {t("scriptDescription")}
                             </p>
                          </div>
                          
                          <div className="space-y-4">
                             <Button 
                               onClick={copyToClipboard}
                               className="w-full h-16 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-black text-base shadow-xl shadow-black/10 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                             >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {copied ? t("copySuccess") : t("copyCode")}
                             </Button>
                             <div className="flex items-center justify-center gap-2">
                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t("cdnAccelerated")}</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="bg-zinc-50 p-8 flex items-center justify-center relative border-l border-zinc-100">
                          <div className="absolute inset-0 opacity-[0.03] grayscale pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                          <div className="relative w-full">
                             <pre className="p-8 rounded-[32px] bg-zinc-900 border border-zinc-800 shadow-2xl overflow-x-auto scrollbar-hide">
                                <code className="text-zinc-400 font-mono text-xs leading-relaxed block">
                                   {embedCode}
                                </code>
                             </pre>
                             <div className="mt-6 flex justify-center gap-8">
                                <div className="flex items-center gap-2">
                                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                   <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t("secure")}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                   <div className="w-2 h-2 rounded-full bg-blue-500" />
                                   <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t("utf8Ready")}</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </CardContent>
              </Card>
           </div>

           {/* Section: Integration Ecosystem */}
           <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-zinc-400" />
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-widest">{t("omnichannelEco")}</h2>
                 </div>
                 <Badge variant="outline" className="rounded-full border-zinc-200 text-zinc-400 font-bold uppercase tracking-widest text-[9px] px-4 py-1">{t("modulesActive", { count: 4 })}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {channelModules.map((module) => (
                    <Card key={module.id} className={`rounded-[48px] border-2 ${module.color} transition-all duration-500 p-10 group cursor-pointer relative overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-zinc-200`}>
                       <div className="flex justify-between items-start mb-10">
                          <div className="flex gap-3">
                             {module.icons.map((icon, i) => (
                                <div key={i} className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                   {icon}
                                </div>
                             ))}
                          </div>
                          <Badge className="bg-zinc-900 text-white rounded-lg text-[9px] font-black px-2 py-0.5">{module.status}</Badge>
                       </div>
                       
                       <div className="space-y-3 relative z-10">
                          <div className="flex items-center justify-between">
                             <div>
                                <h4 className="text-2xl font-black text-zinc-900 tracking-tight">{module.title}</h4>
                                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mt-1">{module.subtitle}</p>
                             </div>
                             <div className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center group-hover:bg-zinc-950 group-hover:border-zinc-950 transition-all">
                                <ArrowUpRight className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                             </div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500 leading-relaxed pr-6">
                             {module.description}
                          </p>
                       </div>
                       
                       <Link href={module.link} className="absolute inset-0 z-20" />
                    </Card>
                 ))}
              </div>
           </div>
        </div>

        {/* Right Column: Status & Intelligence */}
        <div className="xl:col-span-4 space-y-12">
           {/* Diagnostics Panel */}
           <Card className="rounded-[48px] border-none bg-zinc-950 text-white shadow-2xl shadow-black/40 overflow-hidden sticky top-8">
              <div className="p-10 space-y-10">
                 <div className="space-y-6">
                    <div className="flex items-center gap-3">
                       <Activity className="w-5 h-5 text-primary" />
                       <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">{t("liveIntelligence")}</h3>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4 hover:bg-white/10 transition-colors">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-zinc-500 uppercase">{t("knowledgeWeight")}</span>
                             <span className="text-xs font-black text-zinc-300">{((chatbot?.dataSources || []).reduce((acc: any, ds: any) => acc + (ds.fileSize || 0), 0) / 1024).toFixed(1)} KB</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: "65%" }}
                               className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full" 
                             />
                          </div>
                       </div>

                       <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4 hover:bg-white/10 transition-colors">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-zinc-500 uppercase">{t("neuralLatency")}</span>
                             <span className="text-xs font-black text-emerald-400">18ms</span>
                          </div>
                          <div className="flex gap-1 h-4 items-end">
                             {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4, 0.7, 0.9, 1].map((h, i) => (
                               <div key={i} className="flex-1 bg-emerald-500/30 rounded-t-sm" style={{ height: `${h * 100}%` }} />
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6 pt-10 border-t border-white/10">
                    <div className="flex items-center gap-3">
                       <Cpu className="w-5 h-5 text-zinc-400" />
                       <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">{t("systemHealth")}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-5 bg-white/5 rounded-[24px] text-center border border-white/5">
                          <p className="text-[9px] font-black text-zinc-500 uppercase mb-2">{t("memory")}</p>
                          <p className="text-sm font-black text-white">99.2% Free</p>
                       </div>
                       <div className="p-5 bg-white/5 rounded-[24px] text-center border border-white/5">
                          <p className="text-[9px] font-black text-zinc-500 uppercase mb-2">{t("ioLoad")}</p>
                          <p className="text-sm font-black text-white">Minimal</p>
                       </div>
                    </div>
                 </div>

                 <Button className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm shadow-xl shadow-primary/20">
                    {t("neuralRefresh")}
                 </Button>
              </div>
           </Card>

           <div className="p-10 rounded-[48px] bg-zinc-100 border-2 border-zinc-200 text-center space-y-6 group cursor-pointer hover:bg-zinc-50 transition-all">
              <div className="w-20 h-20 bg-white rounded-3xl mx-auto shadow-sm flex items-center justify-center group-hover:rotate-12 transition-transform">
                 <Bot className="w-10 h-10 text-zinc-950" />
              </div>
              <div>
                 <h4 className="text-xl font-black text-zinc-900 mb-1">{t("expertSupport.title")}</h4>
                 <p className="text-sm font-medium text-zinc-500 leading-relaxed px-4">
                    {t("expertSupport.description")}
                 </p>
              </div>
              <Button variant="outline" className="w-full h-12 rounded-xl border-zinc-200 text-zinc-900 font-bold hover:bg-white">
                 {t("expertSupport.chatBtn")}
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
