"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "ai/react";
import { useSearchParams } from "next/navigation";
import { 
  Send, 
  Bot, 
  X, 
  Minimize2, 
  Maximize2, 
  Globe, 
  ShieldCheck, 
  ExternalLink,
  RefreshCw,
  User,
  Mail,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Citation {
  title: string;
  url: string;
  similarity: number;
}

export default function WidgetPage() {
  const searchParams = useSearchParams();
  const chatbotSlug = searchParams.get("id") || "demo";
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState({ name: "", email: "" });
  const [chatbotConfig, setChatbotConfig] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Config
  useEffect(() => {
    fetch(`/api/embed/${chatbotSlug}`)
      .then(res => res.json())
      .then(data => {
        setChatbotConfig(data);
        if (data.collectLeads) setShowLeadForm(true);
      });
  }, [chatbotSlug]);

  // Vercel AI SDK useChat
  const { messages, input, handleInputChange, handleSubmit, isLoading, data, setMessages } = useChat({
    api: `/api/embed/${chatbotSlug}`,
    body: {
      name: leadData.name,
      email: leadData.email
    },
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: chatbotConfig?.welcomeMessage || "Merhaba! Size nasıl yardımcı olabilirim?",
      },
    ],
    onError: (err) => {
      console.error("Widget Chat Error:", err);
      const isLimit = err.message?.includes("MESSAGE_LIMIT_REACHED") || err.message?.includes("403");
      const errorMsg = isLimit 
        ? "Bu botun aylık mesaj limiti dolduğu için şu an yanıt veremiyor."
        : "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
      
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: errorMsg,
          createdAt: new Date()
        }
      ]);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Extract citations from the stream data
  const getCitations = (messageId: string): Citation[] => {
    if (!data) return [];
    const meta: any = data.find((d: any) => d.messageId === messageId);
    return meta?.sources || [];
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leadData.email) setShowLeadForm(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9, filter: "blur(10px)" }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              height: isMinimized ? "auto" : "640px",
            }}
            exit={{ opacity: 0, y: 40, scale: 0.9, filter: "blur(10px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="mb-4 w-[400px] bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 overflow-hidden flex flex-col"
          >
            {/* Premium Header */}
            <div className="p-5 bg-zinc-950 text-white flex items-center justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
               <div className="flex items-center gap-3 relative z-10">
                 <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                   <Bot className="w-6 h-6 text-white" />
                 </div>
                 <div>
                   <h3 className="font-bold text-sm tracking-tight leading-tight">{chatbotConfig?.name || "JCaesar Assistant"}</h3>
                   <div className="flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Online</span>
                   </div>
                 </div>
               </div>
               <div className="flex items-center gap-1 relative z-10">
                 <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10" onClick={() => setIsMinimized(!isMinimized)}>
                    {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10" onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
               </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <>
                <ScrollArea className="flex-1 p-6 space-y-6 bg-zinc-50/30 relative">
                  {showLeadForm ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center p-4 space-y-6"
                    >
                      <div className="space-y-2">
                        <h4 className="text-xl font-bold text-zinc-900 tracking-tight">Hoş Geldiniz!</h4>
                        <p className="text-sm text-zinc-500">Sohbete başlamadan önce size nasıl hitap etmemizi istersiniz?</p>
                      </div>
                      <form onSubmit={handleLeadSubmit} className="w-full space-y-3">
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <Input 
                            placeholder="Adınız" 
                            className="pl-11 h-12 rounded-2xl bg-white border-zinc-100 focus:ring-primary/20" 
                            value={leadData.name}
                            onChange={e => setLeadData(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <Input 
                            placeholder="E-posta Adresiniz" 
                            type="email"
                            required
                            className="pl-11 h-12 rounded-2xl bg-white border-zinc-100 focus:ring-primary/20" 
                            value={leadData.email}
                            onChange={e => setLeadData(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                        <Button type="submit" className="w-full h-12 bg-zinc-950 text-white rounded-2xl font-bold hover:bg-primary transition-all">
                          Sohbete Başla <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </form>
                    </motion.div>
                  ) : (
                    <div className="space-y-8 pb-4">
                      {messages.map((message, i) => (
                        <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                          <div className="shrink-0 pt-1">
                            <Avatar className={`w-8 h-8 rounded-xl border border-black/5 shadow-sm ${message.role === "assistant" ? "bg-zinc-950" : "bg-white"}`}>
                              {message.role === "assistant" ? <AvatarImage src="/bot-avatar.png" className="p-1" /> : <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">U</AvatarFallback>}
                            </Avatar>
                          </div>
                          <div className={`flex flex-col gap-2 max-w-[85%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                            <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${message.role === "user" ? "bg-zinc-950 text-white rounded-br-none" : "bg-white text-zinc-800 rounded-bl-none border border-black/5"}`}>
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              {message.role === "assistant" && getCitations(message.id).length > 0 && (
                                <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2">
                                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/80"><ShieldCheck className="w-3 h-3" /> Verified Sources</div>
                                  <div className="flex flex-wrap gap-2">
                                    {getCitations(message.id).map((source, idx) => (
                                      <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-zinc-50 border border-zinc-100 rounded-lg group transition-all hover:bg-primary/5 hover:border-primary/20">
                                        <Globe className="w-2.5 h-2.5 text-zinc-400 group-hover:text-primary" />
                                        <span className="text-[10px] font-bold text-zinc-600 group-hover:text-primary truncate max-w-[120px]">{source.title || "Kaynak"}</span>
                                        <ExternalLink className="w-2.5 h-2.5 text-zinc-300 group-hover:text-primary opacity-0 group-hover:opacity-100" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-black text-zinc-400/60 uppercase tracking-tighter px-1">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </motion.div>
                      ))}
                      {isLoading && messages[messages.length - 1].role === "user" && (
                        <div className="flex gap-3">
                          <Avatar className="w-8 h-8 rounded-xl bg-zinc-950 flex items-center justify-center p-1.5 ring-1 ring-white/10 animate-pulse">
                             <Bot className="w-4 h-4 text-primary" />
                          </Avatar>
                          <div className="bg-white border border-black/5 p-4 rounded-3xl rounded-bl-none flex items-center gap-1.5 h-10">
                             <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                             <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                             <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Chat Input */}
                {!showLeadForm && (
                  <div className="p-5 border-t border-zinc-100 bg-white">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-2 bg-zinc-50 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all border border-transparent focus-within:border-primary/10 overflow-hidden">
                      <div className="px-3 pt-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                         <span>AI Autopilot Active</span>
                         {isLoading && <RefreshCw className="w-2.5 h-2.5 animate-spin text-primary" />}
                      </div>
                      <div className="flex items-center">
                        <Input placeholder="Mesajınızı buraya yazın..." value={input} onChange={handleInputChange} className="flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 text-sm font-medium py-6 px-4" />
                        <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="w-10 h-10 rounded-xl bg-zinc-950 hover:bg-primary text-white shadow-lg transition-all shrink-0 mr-1">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsOpen(true)} className="w-16 h-16 bg-zinc-950 rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex items-center justify-center group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Bot className="w-7 h-7 text-white relative z-10 group-hover:scale-110 transition-transform" />
        </motion.button>
      )}
    </div>
  );
}
