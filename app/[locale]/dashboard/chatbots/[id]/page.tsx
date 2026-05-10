"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useChat } from "ai/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  ChevronLeft, 
  Settings, 
  Code, 
  BarChart3,
  Sparkles,
  Info,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { toast } from "sonner";

export default function ChatbotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("Dashboard.chatbotDetail");
  const id = params.id as string;
  
  const [chatbot, setChatbot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading: isTyping } = useChat({
    api: `/api/chatbots/${id}/chat`,
    initialMessages: [],
    onResponse: () => {
      // Optional: scroll when response starts
    },
    onFinish: () => {
      // Optional: scroll when response ends
    },
    onError: (err: Error) => {
      toast.error("Neural connection interrupted. Please try again.");
    }
  });

  useEffect(() => {
    fetchChatbot();
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const fetchChatbot = async () => {
    try {
      const res = await fetch(`/api/chatbots/${id}`);
      if (res.ok) {
        const data = await res.json();
        setChatbot(data);
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: data.welcomeMessage || t("defaultDescription"),
            createdAt: new Date(),
          },
        ]);
      } else {
        toast.error("Chatbot not found");
        router.push("/dashboard/chatbots");
      }
    } catch (error) {
      console.error("Error fetching chatbot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-zinc-500 font-medium animate-pulse text-sm uppercase tracking-widest">{t("status.training")}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[40px] bg-white border-2 border-zinc-100 shadow-2xl shadow-black/5 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-6">
          <Link href="/dashboard/chatbots">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100">
              <ChevronLeft className="w-6 h-6 text-zinc-400" />
            </Button>
          </Link>
          <Avatar className="w-20 h-20 rounded-3xl shadow-xl border-4 border-white ring-2 ring-zinc-50 overflow-hidden">
            <AvatarImage src={chatbot?.avatar} className="object-cover" />
            <AvatarFallback className="bg-zinc-100 text-zinc-400">
              <Bot className="w-10 h-10" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900">{chatbot?.name}</h1>
              <Badge 
                className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${
                  chatbot?.status === "ACTIVE" 
                  ? "bg-green-500/10 text-green-600 border-green-500/20" 
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse"
                }`}
                variant="outline"
              >
                {chatbot?.status === "ACTIVE" ? t("status.active") : t("status.training")}
              </Badge>
            </div>
            <p className="text-zinc-500 text-sm mt-1 font-medium max-w-md line-clamp-1">{chatbot?.description || t("defaultDescription")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/chatbots/${id}/settings`}>
            <Button variant="outline" className="rounded-2xl h-12 px-6 border-zinc-200 hover:bg-zinc-50 font-bold text-zinc-600">
              <Settings className="w-4 h-4 mr-2" />
              {t("settings")}
            </Button>
          </Link>
          <Link href={`/dashboard/chatbots/${id}/embed`}>
            <Button className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-2xl h-12 px-6 font-bold shadow-lg shadow-black/10">
              <Code className="w-4 h-4 mr-2" />
              {t("embedCode")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chat Forge Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[40px] border-2 border-zinc-100 overflow-hidden bg-white/50 backdrop-blur-xl shadow-2xl shadow-black/5 min-h-[650px] flex flex-col">
            <div className="p-6 border-b border-zinc-100/50 flex items-center justify-between bg-zinc-50/30">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t("liveStatus")}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMessages([{ id: "welcome-"+Date.now(), role: "assistant", content: chatbot?.welcomeMessage || "Hello!", createdAt: new Date() }])} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary">
                <RefreshCw className="w-3 h-3 mr-2" />
                {t("resetForge")}
              </Button>
            </div>

            <ScrollArea className="flex-1 p-8">
              <div className="space-y-8">
                {messages.map((message: any, i: number) => (
                  <motion.div
                    key={message.id || i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex items-start gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      message.role === "user" ? "bg-zinc-900" : "bg-white border border-zinc-100"
                    }`}>
                      {message.role === "user" ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                    <div className={`max-w-[80%] space-y-2`}>
                      <div className={`p-5 rounded-3xl text-sm leading-relaxed font-medium ${
                        message.role === "user" 
                        ? "bg-zinc-950 text-white rounded-tr-none shadow-lg shadow-black/5" 
                        : "bg-white border border-zinc-100 text-zinc-700 rounded-tl-none shadow-sm"
                      }`}>
                        {message.content}
                      </div>
                      {message.annotations && message.annotations.length > 0 && (
                         <div className={`text-[10px] font-bold text-zinc-400 uppercase tracking-widest ${message.role === "user" ? "text-right" : "text-left"}`}>
                           Prompt: {message.annotations[0].promptTokens || 0} | Cevap: {message.annotations[0].completionTokens || 0}
                         </div>
                      )}
                      <span className={`text-[10px] font-bold text-zinc-300 uppercase tracking-widest block ${message.role === "user" ? "text-right" : ""}`}>
                        {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="bg-white border border-zinc-100 p-5 rounded-3xl rounded-tl-none flex gap-1">
                      <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-8 bg-zinc-50/50 border-t border-zinc-100">
              <form onSubmit={handleSubmit} className="relative group">
                <Input
                  className="h-16 pl-6 pr-16 rounded-3xl bg-white border-2 border-zinc-100 focus:border-primary/30 transition-all font-medium text-zinc-700 shadow-sm"
                  placeholder={t("placeholder", { name: chatbot?.name || "Agent" })}
                  value={input}
                  onChange={handleInputChange}
                />
                <Button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 h-12 w-12 rounded-2xl bg-zinc-950 hover:bg-zinc-900 text-white shadow-xl shadow-black/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
              <p className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-4">{t("poweredBy")}</p>
            </div>
          </Card>
        </div>

        {/* Intelligence Intel Sidebar */}
        <div className="space-y-8">
          <Card className="rounded-[40px] border-2 border-zinc-100 bg-white overflow-hidden shadow-2xl shadow-black/5">
            <div className="p-8 space-y-8">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Sparkles className="w-3 h-3" />
                  {t("configTitle")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Model</span>
                    <span className="text-xs font-bold text-zinc-900 border-b-2 border-primary/20 pb-0.5">{chatbot?.model}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Temperature</span>
                    <span className="text-xs font-bold text-zinc-900">{chatbot?.temperature}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t("memoryLabel")}</span>
                    <span className="text-xs font-bold text-zinc-900">{t("activeRAG")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Info className="w-3 h-3" />
                  {t("statsTitle")}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 rounded-3xl border-2 border-zinc-50 bg-zinc-50/30">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{t("sourcesLabel")}</p>
                    <p className="text-xl font-black text-zinc-900">{chatbot?.dataSources?.length || 0}</p>
                  </div>
                  <div className="p-4 rounded-3xl border-2 border-zinc-50 bg-zinc-50/30">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{t("chatsLabel")}</p>
                    <p className="text-xl font-black text-zinc-900">{chatbot?._count?.conversations || 0}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full rounded-2xl h-14 border-zinc-100 hover:bg-zinc-50 font-bold text-zinc-600 shadow-sm transition-all hover:scale-105 active:scale-95 group">
                  <BarChart3 className="w-4 h-4 mr-2 group-hover:text-primary" />
                  {t("viewAnalytics")}
                </Button>
              </div>
            </div>
          </Card>

          <div className="p-8 rounded-[40px] bg-gradient-to-br from-zinc-900 to-zinc-800 text-white shadow-2xl shadow-zinc-950/20 group cursor-pointer overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
              <Bot className="w-24 h-24" />
            </div>
            <h4 className="text-lg font-bold mb-2">{t("needAPI")}</h4>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed mb-6">{t("apiDesc")}</p>
            <Button size="sm" className="bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl px-6 font-bold">
              {t("checkDocs")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
