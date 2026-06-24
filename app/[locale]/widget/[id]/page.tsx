"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useChat } from "ai/react";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  RefreshCw,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

export default function WidgetPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [chatbot, setChatbot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading: isTyping } = useChat({
    api: `/api/widget/${id}/chat`,
    initialMessages: [],
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
      const res = await fetch(`/api/widget/${id}`);
      if (res.ok) {
        const data = await res.json();
        setChatbot(data);
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: data.welcomeMessage || "Hello! How can I help you?",
            createdAt: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching chatbot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
      </div>
    );
  }

  const primaryColor = chatbot?.primaryColor || "#e25b31";
  const fontFamily = chatbot?.fontFamily || "Inter, sans-serif";
  const borderRadius = chatbot?.borderRadius || "16px";

  return (
    <div 
      className="flex flex-col h-screen bg-white text-zinc-900 border-none overflow-hidden"
      style={{ fontFamily }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between shadow-sm border-b" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-white/20">
            <AvatarImage src={chatbot?.avatar} className="object-cover" />
            <AvatarFallback className="bg-white/10 text-white">
              <Bot className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-sm font-bold text-white line-clamp-1">{chatbot?.name || "AI Assistant"}</h1>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold text-white/70 uppercase">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-zinc-50/30">
        <div className="space-y-6">
          <AnimatePresence>
            {messages.map((message, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div 
                  className={`shrink-0 w-8 h-8 flex items-center justify-center shadow-sm ${
                    message.role === "user" ? "bg-zinc-950" : "bg-white border"
                  }`}
                  style={{ borderRadius: `calc(${borderRadius} / 2)` }}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
                <div className={`max-w-[85%] space-y-1`}>
                  <div 
                    className={`p-4 text-[14px] leading-relaxed transition-all duration-300 ${
                      message.role === "user" 
                      ? "text-white" 
                      : "bg-white border text-zinc-700 shadow-sm"
                    }`}
                    style={{ 
                      borderRadius: `calc(${borderRadius} / 1.5)`,
                      backgroundColor: message.role === "user" ? primaryColor : "white",
                      borderBottomLeftRadius: message.role === "assistant" ? "4px" : undefined,
                      borderBottomRightRadius: message.role === "user" ? "4px" : undefined,
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white border flex items-center justify-center" style={{ borderRadius: `calc(${borderRadius} / 2)` }}>
                <Bot className="w-4 h-4 text-zinc-400" />
              </div>
              <div 
                className="bg-white border p-4 flex gap-1 shadow-sm"
                style={{ borderRadius: `calc(${borderRadius} / 1.5)`, borderBottomLeftRadius: "4px" }}
              >
                <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <Input 
            className="h-12 bg-zinc-50 border-zinc-200 focus:bg-white transition-all pr-12 focus:ring-0 focus:border-zinc-300"
            style={{ borderRadius: `calc(${borderRadius} / 2)` }}
            placeholder={chatbot?.placeholderText || "Write a message..."}
            value={input}
            onChange={handleInputChange}
          />
          <Button 
            type="submit"
            size="icon"
            disabled={!input.trim() || isTyping}
            className="absolute right-1 top-1 h-10 w-10 shadow-lg active:scale-95 transition-all text-white"
            style={{ backgroundColor: primaryColor, borderRadius: `calc(${borderRadius} / 2.5)` }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        {chatbot?.showBranding && (
          <p className="text-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-3 opacity-60">
            Powered by <span className="text-primary font-black">JCaesar AI</span>
          </p>
        )}
      </div>
    </div>
  );
}
