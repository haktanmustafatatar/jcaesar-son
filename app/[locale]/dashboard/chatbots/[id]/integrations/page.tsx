"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Bot,
  MessageCircle,
  Instagram,
  Facebook,
  ShoppingBag,
  ShoppingCart,
  Calendar,
  Layers,
  ArrowUpRight,
  ChevronLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  Globe,
  Settings2,
  Share2,
  Cpu,
  Activity,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

import { ConnectModal } from "@/components/dashboard/channels/connect-modal";
import { MetaSelector } from "@/components/dashboard/channels/meta-selector";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Trash2, Power } from "lucide-react";

export default function IntegrationsPage() {
  const t = useTranslations("Dashboard.integrations");
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [chatbot, setChatbot] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Connection states
  const [channels, setChannels] = useState<any[]>([]);
  const [isChannelsLoading, setIsChannelsLoading] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectType, setConnectType] = useState<any>(null);
  const [metaSelectorOpen, setMetaSelectorOpen] = useState(false);
  const [metaSessionId, setMetaSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchChatbot();
    fetchChannels();
    
    // Handle Meta OAuth returns
    const session = searchParams.get("meta_session");
    const metaConnected = searchParams.get("meta_connected");
    if (session) {
      setMetaSessionId(session);
      setMetaSelectorOpen(true);
    } else if (metaConnected === "true") {
      setMetaSelectorOpen(true);
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

  const fetchChannels = async () => {
    try {
      setIsChannelsLoading(true);
      const res = await fetch(`/api/chatbots/${id}/channels`);
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
    } finally {
      setIsChannelsLoading(false);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?")) return;
    try {
      const res = await fetch(`/api/chatbots/${id}/channels?channelId=${channelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Integration disconnected successfully");
        fetchChannels();
      }
    } catch (error) {
      toast.error("Failed to disconnect integration");
    }
  };

  const integrations = [
    {
      id: "WHATSAPP",
      title: "WhatsApp Business",
      subtitle: "Official Meta API",
      category: "social",
      description: "Direct connection to your WhatsApp Business number for AI-powered customer support.",
      icons: [<MessageCircle className="w-5 h-5 text-[#25D366]" />],
      complexity: "Medium",
      color: "from-emerald-500/20 to-green-500/20",
      accent: "emerald",
      requiresPlan: ["elite", "enterprise"]
    },
    {
      id: "INSTAGRAM",
      title: "Instagram DM",
      subtitle: "Meta Ecosystem",
      category: "social",
      description: "Automate your Instagram Direct Messages and stories replies with neural intelligence.",
      icons: [<Instagram className="w-5 h-5 text-[#E1306C]" />],
      complexity: "Easy",
      color: "from-pink-500/20 to-orange-500/20",
      accent: "pink",
      requiresPlan: ["elite", "enterprise"]
    },
    {
      id: "FACEBOOK",
      title: "Messenger",
      subtitle: "Facebook Native",
      category: "social",
      description: "Connect your Facebook Page to allow the agent to handle customer inquiries 24/7.",
      icons: [<Facebook className="w-5 h-5 text-[#1877F2]" />],
      complexity: "Easy",
      color: "from-blue-500/20 to-indigo-500/20",
      accent: "blue",
      requiresPlan: ["elite", "enterprise"]
    },
    {
      id: "SHOPIFY",
      title: "Shopify Engine",
      subtitle: "E-Commerce Intelligence",
      category: "ecommerce",
      description: "Real-time product syncing, order tracking, and inventory-aware sales logic.",
      icons: [<ShoppingBag className="w-5 h-5 text-[#95BF47]" />],
      complexity: "One-Click",
      color: "from-lime-500/20 to-emerald-500/20",
      accent: "emerald"
    },
    {
      id: "WOOCOMMERCE",
      title: "WooCommerce",
      subtitle: "WordPress Native",
      category: "ecommerce",
      description: "Deep-link your WordPress store with our neural engine for automated sales support.",
      icons: [<ShoppingCart className="w-5 h-5 text-[#96588A]" />],
      complexity: "Plugin",
      color: "from-purple-500/20 to-pink-500/20",
      accent: "purple"
    },
    {
      id: "GOOGLE_CALENDAR",
      title: "Google Sync",
      subtitle: "Calendar & Meetings",
      category: "productivity",
      description: "Automate booking and appointment management directly through the chat interface.",
      icons: [<Calendar className="w-5 h-5 text-[#4285F4]" />],
      complexity: "OAuth",
      color: "from-amber-500/20 to-orange-500/20",
      accent: "amber"
    }
  ];

  const filteredIntegrations = integrations.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-40">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 animate-in fade-in slide-in-from-top-6 duration-700">
        <div className="flex items-center gap-6">
          <Link href={`/dashboard/chatbots/${id}/embed`}>
            <Button variant="ghost" size="icon" className="w-14 h-14 rounded-3xl hover:bg-zinc-100 border-2 border-zinc-50 bg-white">
              <ChevronLeft className="w-6 h-6 text-zinc-900" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">{t("neuralConnect")}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-950">{t("title")}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => fetchChannels()}
            disabled={isChannelsLoading}
            variant="outline" 
            className="h-14 px-6 rounded-2xl border-2 border-zinc-100 font-bold hover:bg-zinc-50"
          >
            {isChannelsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {t("refreshStatus")}
          </Button>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder={t("searchPlaceholder")} 
              className="pl-12 h-14 w-full md:w-80 rounded-2xl bg-white border-2 border-zinc-100 focus:border-zinc-300 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-100/50 w-fit rounded-2xl border border-zinc-200 shadow-inner overflow-x-auto scrollbar-hide">
        {["all", "ecommerce", "social", "productivity"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeCategory === cat 
                  ? "bg-white text-zinc-950 shadow-sm ring-1 ring-black/5" 
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t(`categories.${cat}`)}
            </button>
        ))}
      </div>

      {/* Grid of Power */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredIntegrations.map((item, index) => {
            const channel = channels.find(c => c.type === item.id);
            const isConnected = channel?.status === "CONNECTED" || channel?.status === "ACTIVE";

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ delay: index * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <Card className={`group relative rounded-[48px] border-2 bg-white overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-zinc-200 ${isConnected ? 'border-emerald-500/20' : 'border-zinc-100'}`}>
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  
                  <CardContent className="p-10 space-y-8">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2">
                        {item.icons.map((icon, i) => (
                          <div key={i} className="w-14 h-14 rounded-[22px] bg-zinc-50 border border-zinc-100 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            {icon}
                          </div>
                        ))}
                      </div>
                      <Badge variant="outline" className={`rounded-full border-none px-3 py-1 text-[9px] font-black uppercase tracking-tighter ${
                        isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {isConnected ? t('status.connected') : t('status.disconnected')}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="text-2xl font-black text-zinc-950 tracking-tight">{item.title}</h3>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{item.subtitle}</p>
                      </div>
                      <p className="text-sm font-medium text-zinc-500 leading-relaxed pr-4">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-zinc-50 flex items-center justify-between gap-4">
                      {item.requiresPlan && chatbot?.organization?.plan?.slug && !item.requiresPlan.includes(chatbot.organization.plan.slug) ? (
                        <div className="w-full space-y-3">
                           <Button 
                             disabled
                             className="h-12 w-full rounded-2xl bg-zinc-100 text-zinc-400 font-bold text-xs cursor-not-allowed"
                           >
                             <Bot className="w-3.5 h-3.5 mr-2" /> Upgrade to Unlock
                           </Button>
                           <p className="text-[10px] text-center font-bold text-primary uppercase tracking-widest cursor-pointer hover:underline">
                              See Pricing Plans
                           </p>
                        </div>
                      ) : isConnected ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setConnectType(item.id);
                              setConnectModalOpen(true);
                            }}
                            className="h-10 px-4 rounded-xl font-bold text-xs hover:bg-zinc-100"
                          >
                            <Settings2 className="w-3.5 h-3.5 mr-2" /> {t("status.configurable")}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDisconnect(channel.id)}
                            className="h-10 w-10 rounded-xl font-bold text-red-500 hover:bg-red-50"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => {
                            setConnectType(item.id);
                            setConnectModalOpen(true);
                          }}
                          className="h-12 w-full rounded-2xl bg-zinc-950 text-white font-bold text-xs hover:bg-zinc-800"
                        >
                          {t("status.ready")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Component Modals */}
      <ConnectModal 
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        type={connectType}
        chatbotId={id}
        onSuccess={fetchChannels}
      />
      
      <MetaSelector 
        open={metaSelectorOpen}
        onOpenChange={setMetaSelectorOpen}
        sessionId={metaSessionId || ""}
        chatbotId={id}
        onSuccess={fetchChannels}
      />

      {/* Expert Assistance Banner */}
      <div className="relative rounded-[60px] bg-zinc-950 p-12 overflow-hidden shadow-2xl shadow-black/20 group">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_70%_20%,rgba(226,91,49,0.15),transparent)] pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center shadow-2xl border border-white/10 group-hover:scale-110 transition-transform">
              <Globe className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-black text-white leading-tight">{t("expertAssistance.title")} <br/><span className="text-zinc-500">{t("expertAssistance.subtitle")}</span></h2>
            <p className="text-zinc-400 font-medium leading-relaxed max-w-sm">
              {t("expertAssistance.description")}
            </p>
          </div>
          <div className="bg-white/5 p-8 rounded-[48px] border border-white/5 flex flex-col gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <span>{t("expertAssistance.integrity")}</span>
                <span className="text-primary">99.9%</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-[99%] bg-primary rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-2 border-zinc-900 bg-zinc-800 overflow-hidden shadow-xl">
                    <img src={`https://i.pravatar.cc/100?u=${i+10}`} alt="Expert" className="w-full h-full object-cover grayscale" />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{t("expertAssistance.expertsReady")}</p>
                <p className="text-xs text-zinc-500 font-medium tracking-tight">{t("expertAssistance.expertsDesc")}</p>
              </div>
              <Button className="ml-auto rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold h-12 px-8">
                {t("expertAssistance.consultBtn")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
