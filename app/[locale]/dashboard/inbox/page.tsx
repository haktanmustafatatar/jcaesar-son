"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  Filter,
  User,
  Bot,
  MoreHorizontal,
  Send,
  Paperclip,
  Smile,
  Check,
  X,
  Tag,
  Phone,
  Instagram,
  Facebook,
  Mail,
  Globe,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Clock,
  Zap,
  StickyNote,
  AlertCircle,
  Send as TelegramIcon,
  Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

const channelConfig: Record<string, { icon: any, color: string, bg: string, label: string }> = {
  widget: { icon: Globe, color: "text-blue-500", bg: "bg-blue-50", label: "Website" },
  whatsapp: { icon: Phone, color: "text-emerald-500", bg: "bg-emerald-50", label: "WhatsApp" },
  instagram: { icon: Instagram, color: "text-pink-500", bg: "bg-pink-50", label: "Instagram" },
  facebook: { icon: Facebook, color: "text-blue-600", bg: "bg-blue-50", label: "Facebook" },
  email: { icon: Mail, color: "text-zinc-500", bg: "bg-zinc-50", label: "Email" },
  telegram: { icon: TelegramIcon, color: "text-sky-500", bg: "bg-sky-50", label: "Telegram" },
  slack: { icon: Hash, color: "text-purple-500", bg: "bg-purple-50", label: "Slack" },
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isAiActive, setIsAiActive] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  
  // Input fields
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Mobile responsive views
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Status Filter Tab & CRM Form states
  const [activeTab, setActiveTab] = useState<"active" | "closed">("active");
  const [isCrmFormOpen, setIsCrmFormOpen] = useState(false);
  const [crmName, setCrmName] = useState("");
  const [crmEmail, setCrmEmail] = useState("");
  const [crmPhone, setCrmPhone] = useState("");
  const [crmNotes, setCrmNotes] = useState("");
  const [isAddingToCrm, setIsAddingToCrm] = useState(false);

  // Redesign states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isAddingTagInline, setIsAddingTagInline] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const selectedConv = conversations.find(c => c.id === selectedId);

  // Auto-populate CRM details on selection
  useEffect(() => {
    if (selectedConv) {
      setCrmName(selectedConv.contactName || selectedConv.user?.name || selectedConv.channelUserId || "");
      setCrmEmail(selectedConv.contactEmail || selectedConv.user?.email || "");
      setCrmPhone(selectedConv.contactPhone || selectedConv.user?.phone || "");
      const channelLabel = selectedConv.channel === "widget" ? "Web Sitesi" : selectedConv.channel;
      setCrmNotes(selectedConv.contactNotes || `${channelLabel} sohbetinden eklendi.`);
      setIsCrmFormOpen(false);
    }
  }, [selectedId, conversations]);

  const filteredConversations = conversations.filter(c => {
    const isActive = c.status === "ACTIVE" || c.status === "ESCALATED";
    const matchesTab = activeTab === "active" ? isActive : c.status === "CLOSED";
    
    if (!matchesTab) return false;

    // Apply channel filter if selected
    if (selectedChannel && c.channel?.toLowerCase() !== selectedChannel.toLowerCase()) {
      return false;
    }

    // Apply search query if present
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (c.contactName || c.user?.name || c.channelUserId || "").toLowerCase();
      const email = (c.contactEmail || c.user?.email || "").toLowerCase();
      const phone = (c.contactPhone || c.user?.phone || "").toLowerCase();
      const lastMsg = (c.messages?.[0]?.content || "").toLowerCase();
      const tags = (c.tags as string[] || []).map(t => t.toLowerCase());

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        lastMsg.includes(q) ||
        tags.some(t => t.includes(q))
      );
    }

    return true;
  });

  // Poll for new messages every 5 seconds to guarantee real-time feel
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll active chat messages more frequently (every 3 seconds) when selected
  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      const interval = setInterval(() => {
        fetchMessages(selectedId, true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedId]);

  // Auto-scroll to bottom of chat logs when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollArea = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  const fetchConversations = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
          setIsAiActive(data[0].aiEnabled);
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchMessages = async (id: string, silent = false) => {
    if (!silent) setIsMessagesLoading(true);
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      if (!silent) setIsMessagesLoading(false);
    }
  };

  const handleSelectConversation = (conv: any) => {
    setSelectedId(conv.id);
    setIsAiActive(conv.aiEnabled);
    setMobileView("chat"); // transition to chat panel on mobile
  };

  const handleToggleAiAutopilot = async (checked: boolean) => {
    if (!selectedId) return;
    setIsAiActive(checked);
    
    // Optimistic UI updates inside conversations list
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, aiEnabled: checked } : c));

    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled: checked })
      });
      if (!res.ok) {
        // rollback if failed
        setIsAiActive(!checked);
        setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, aiEnabled: !checked } : c));
      }
    } catch (err) {
      console.error("Error toggling AI Autopilot:", err);
    }
  };

  const handleResolveChat = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" })
      });
      if (res.ok) {
        // reload list
        fetchConversations();
        setSelectedId(null);
        setMobileView("list");
      }
    } catch (err) {
      console.error("Error resolving conversation:", err);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedId) return;
    if (!confirm("Bu sohbeti ve tüm mesajlarını kalıcı olarak silmek istediğinizden emin misiniz?")) return;
    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchConversations();
        setSelectedId(null);
        setMobileView("list");
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  const handleAddTagSubmit = async (tag: string) => {
    if (!selectedId || !selectedConv || !tag.trim()) return;
    
    const trimmedTag = tag.trim().toLowerCase();
    const currentTags = selectedConv.tags as string[] || [];
    if (currentTags.includes(trimmedTag)) return;

    const newTags = [...currentTags, trimmedTag];
    
    // Optimistic update
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, tags: newTags } : c));

    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags })
      });
      if (!res.ok) {
        // rollback
        setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, tags: currentTags } : c));
      }
    } catch (err) {
      console.error("Error adding tag:", err);
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, tags: currentTags } : c));
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !newNoteText.trim() || isSavingNote) return;

    const noteContent = newNoteText.trim();
    setNewNoteText("");
    setIsSavingNote(true);

    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteContent })
      });
      if (res.ok) {
        // reload list
        fetchConversations(true);
      } else {
        alert("Not eklenemedi.");
      }
    } catch (err) {
      console.error("Error saving note:", err);
      alert("Not eklenirken hata oluştu.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedId || !selectedConv) return;
    const currentTags = selectedConv.tags as string[] || [];
    const newTags = currentTags.filter(t => t !== tagToRemove);

    // Optimistic update
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, tags: newTags } : c));

    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags })
      });
      if (!res.ok) {
        // rollback
        setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, tags: currentTags } : c));
      }
    } catch (err) {
      console.error("Error removing tag:", err);
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, tags: currentTags } : c));
    }
  };

  const handleSaveToCrm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv) return;
    setIsAddingToCrm(true);
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatbotId: selectedConv.chatbotId,
          name: crmName,
          email: crmEmail || undefined,
          phone: crmPhone || undefined,
          notes: crmNotes,
          sourceChannel: selectedConv.channel.toUpperCase(),
          externalId: selectedConv.channelUserId
        })
      });
      if (res.ok) {
        alert("Kişi CRM'e başarıyla kaydedildi!");
        setIsCrmFormOpen(false);
      } else {
        const err = await res.json();
        alert(`Hata: ${err.error || "Kişi kaydedilemedi"}`);
      }
    } catch (err) {
      console.error("Error saving CRM contact:", err);
      alert("CRM kişisi kaydedilirken hata oluştu. Lütfen detayları kontrol edin.");
    } finally {
      setIsAddingToCrm(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedId || !inputText.trim() || isSending) return;

    const messageContent = inputText.trim();
    setInputText("");
    setIsSending(true);

    // Optimistically insert user's assistant reply to the layout
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      role: "ASSISTANT",
      content: messageContent,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent })
      });

      if (res.ok) {
        // Refetch to get actual message with correct ID
        fetchMessages(selectedId, true);
        // Refresh conversations list to update last message preview
        fetchConversations(true);
      } else {
        // Rollback optimistic message if error
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      }
    } catch (err) {
      console.error("Error sending manual agent message:", err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60); // minutes
    
    if (diff < 1) return "Şimdi";
    if (diff < 60) return `${diff}dk`;
    if (diff < 1440) return `${Math.floor(diff / 60)}s`;
    return d.toLocaleDateString();
  };

  return (
    <div className="h-[calc(100vh-10rem)] lg:h-[calc(100vh-8.5rem)] flex gap-6 overflow-hidden max-w-full">
      
      {/* 1. Conversations List Column */}
      <div 
        className={`
          w-full md:w-[320px] xl:w-[380px] flex flex-col bg-white/60 backdrop-blur-xl rounded-[32px] border border-black/5 shadow-2xl shadow-black/[0.02]
          ${mobileView === "list" ? "flex" : "hidden md:flex"}
        `}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-950">Inbox</h2>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mt-1">
                {filteredConversations.length} {activeTab === "active" ? "Aktif" : "Kapalı"} Oturum
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={`rounded-xl transition-all ${selectedChannel ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted/50 hover:bg-white text-zinc-600"}`}>
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl">
                <DropdownMenuItem onClick={() => setSelectedChannel(null)} className="rounded-xl py-2.5 font-bold text-xs">
                  Tüm Kanallar
                </DropdownMenuItem>
                <DropdownMenuSeparator className="opacity-50" />
                {Object.entries(channelConfig).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => setSelectedChannel(key)}
                      className={`rounded-xl py-2 font-bold text-xs flex items-center gap-2 ${selectedChannel === key ? "bg-primary/5 text-primary" : ""}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      {cfg.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex bg-muted/30 p-1 rounded-2xl border border-black/[0.02]">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "active"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-muted-foreground hover:text-zinc-900"
              }`}
            >
              Aktif ({conversations.filter(c => c.status === "ACTIVE" || c.status === "ESCALATED").length})
            </button>
            <button
              onClick={() => setActiveTab("closed")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "closed"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-muted-foreground hover:text-zinc-900"
              }`}
            >
              Kapalı ({conversations.filter(c => c.status === "CLOSED").length})
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Sohbetleri ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary/20 focus-visible:bg-white transition-all font-bold text-sm" 
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <div className="h-16 bg-muted/40 animate-pulse rounded-2xl" />
              <div className="h-16 bg-muted/40 animate-pulse rounded-2xl" />
              <div className="h-16 bg-muted/40 animate-pulse rounded-2xl" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-zinc-700">{activeTab === "active" ? "Aktif" : "Kapalı"} sohbet bulunamadı</p>
              <p className="text-xs text-muted-foreground">Web sitenizden veya sosyal medya hesaplarınızdan gelen sohbetler burada görünecektir.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conv) => {
                const cfg = channelConfig[conv.channel?.toLowerCase()] || channelConfig.widget;
                const isSelected = selectedId === conv.id;
                const Icon = cfg.icon;
                const lastMsg = conv.messages?.[0];
                const userName = conv.contactName || conv.user?.name || conv.channelUserId || "Visitor";
                const userAvatar = conv.contactProfilePic || conv.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.id}`;
                
                return (
                  <motion.button
                    key={conv.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectConversation(conv)}
                    className={`
                      w-full group relative p-4 rounded-[24px] text-left transition-all duration-300 overflow-hidden
                      ${isSelected 
                        ? "bg-white shadow-xl shadow-black/5 border border-black/5 ring-1 ring-primary/5" 
                        : "hover:bg-white/40 border border-transparent"}
                    `}
                  >
                    {isSelected && (
                      <motion.div 
                        layoutId="active-nav"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-primary rounded-r-full" 
                      />
                    )}
                    
                    <div className="flex gap-4">
                      <div className="relative">
                        <Avatar className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm">
                          <AvatarImage src={userAvatar} />
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">{userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {conv.status === "ACTIVE" && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm font-bold truncate ${isSelected ? "text-zinc-900" : "text-zinc-700"}`}>
                            {userName}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground">{lastMsg ? formatTime(lastMsg.createdAt) : ""}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 mb-2">
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">{cfg.label}</span>
                        </div>
                        
                        <p className={`text-xs truncate font-medium ${isSelected ? "text-zinc-600" : "text-muted-foreground/80"}`}>
                          {lastMsg?.content || "Mesaj yok"}
                        </p>
                      </div>

                      {(conv.unreadCount || 0) > 0 && (
                        <div className="self-start mt-1">
                           <span className="flex items-center justify-center w-5 h-5 bg-primary text-white text-[10px] font-black rounded-full animate-bounce">
                             {conv.unreadCount}
                           </span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 2. Chat Feed / Main Window */}
      <div 
        className={`
          flex-1 flex flex-col bg-white rounded-[40px] border border-black/5 shadow-2xl shadow-black/[0.03] overflow-hidden relative
          ${mobileView === "chat" ? "flex" : "hidden md:flex"}
        `}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
        
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white/50 backdrop-blur-sm z-10 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {/* Back Button on Mobile */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setMobileView("list")}
                  className="md:hidden rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <div className="relative">
                  <Avatar className="w-12 h-12 rounded-2xl border border-black/5">
                    <AvatarImage src={selectedConv.contactProfilePic || selectedConv.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConv.id}`} />
                    <AvatarFallback>{(selectedConv.contactName || selectedConv.user?.name || selectedConv.channelUserId || "U").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-lg shadow-sm border border-black/5">
                    {(() => {
                      const cfg = channelConfig[selectedConv.channel?.toLowerCase()] || channelConfig.widget;
                      const Icon = cfg.icon;
                      return (
                        <div className={cfg.color}>
                          <Icon className="w-3 h-3" />
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-zinc-900 flex items-center gap-2 text-base lg:text-lg">
                    {selectedConv.contactName || selectedConv.user?.name || selectedConv.channelUserId || "Ziyaretçi"}
                    <Badge variant="outline" className="text-[9px] h-5 rounded-md border-primary/20 text-primary bg-primary/5 uppercase tracking-widest px-1.5">
                      {selectedConv.status === "ACTIVE" ? "AKTİF" : selectedConv.status === "ESCALATED" ? "DESTEK" : "KAPALI"}
                    </Badge>
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground">{selectedConv.contactEmail || selectedConv.user?.email || "E-posta adresi yok"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* AI Autopilot Switch */}
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-1.5 mb-1">
                     <Zap className={`w-3.5 h-3.5 ${isAiActive ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                     <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">YZ Otopilot</span>
                   </div>
                   <Switch 
                     checked={isAiActive} 
                     onCheckedChange={handleToggleAiAutopilot}
                     className="data-[state=checked]:bg-emerald-500"
                   />
                </div>
                
                <div className="h-10 w-px bg-muted hidden sm:block" />

                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                       <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleResolveChat}
                            className="rounded-xl h-10 px-4 font-bold border-emerald-500/20 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all text-xs"
                          >
                            <Check className="w-4 h-4 mr-2" /> Kapat
                          </Button>
                       </TooltipTrigger>
                       <TooltipContent>Sohbeti Kapat</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-muted/30">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl">
                       <DropdownMenuItem onClick={() => setIsAddingTagInline(true)} className="rounded-xl py-2.5 font-bold text-xs"><Tag className="w-4 h-4 mr-2 text-muted-foreground" /> Etiket Ekle</DropdownMenuItem>
                       <DropdownMenuItem onClick={() => { const el = document.getElementById("new-note-textarea"); if (el) el.focus(); }} className="rounded-xl py-2.5 font-bold text-xs"><StickyNote className="w-4 h-4 mr-2 text-muted-foreground" /> Dahili Not Ekle</DropdownMenuItem>
                       <DropdownMenuSeparator className="opacity-50" />
                       <DropdownMenuItem onClick={handleResolveChat} className="rounded-xl py-2.5 font-bold text-xs text-destructive focus:bg-destructive/5"><X className="w-4 h-4 mr-2" /> Oturumu Kapat</DropdownMenuItem>
                       <DropdownMenuItem onClick={handleDeleteConversation} className="rounded-xl py-2.5 font-bold text-xs text-destructive focus:bg-destructive/5"><X className="w-4 h-4 mr-2" /> Sohbeti Sil</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Chat Messages Logs */}
            <ScrollArea ref={scrollContainerRef} className="flex-1 p-6 lg:p-8 bg-zinc-50/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.03),transparent)]" />
              
              <div className="space-y-10 relative z-10 max-w-4xl mx-auto pb-8">
                {isMessagesLoading && messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="h-12 bg-muted/40 animate-pulse rounded-2xl w-2/3" />
                    <div className="h-12 bg-muted/40 animate-pulse rounded-2xl w-1/2 ml-auto" />
                    <div className="h-12 bg-muted/40 animate-pulse rounded-2xl w-3/4" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                    <AlertCircle className="w-8 h-8 text-zinc-400 mb-2" />
                    <p className="text-sm font-bold">Bu sohbette henüz mesaj bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {messages.map((msg) => {
                      const role = msg.role.toLowerCase();
                      const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const sources = msg.sources as any[];
                      const isAgent = role === "assistant" && msg.agentId;
                      
                      return (
                        <div key={msg.id} className={`flex gap-4 ${role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                          <div className="pt-2">
                            <Avatar className={`w-9 h-9 rounded-xl border border-black/5 shadow-sm ${role === "user" ? "bg-white" : isAgent ? "bg-blue-600 text-white" : "bg-zinc-950"}`}>
                              {isAgent ? (
                                <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold text-xs"><User className="w-4 h-4" /></div>
                              ) : role === "assistant" ? (
                                <AvatarImage src={selectedConv.chatbot?.avatar || "/bot-avatar.png"} className="p-1.5" />
                              ) : (
                                <AvatarImage src={selectedConv.contactProfilePic || selectedConv.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConv.id}`} />
                              )}
                              <AvatarFallback className={isAgent ? "bg-blue-600 text-white" : role === "assistant" ? "bg-zinc-950 text-white" : "bg-primary/5 text-primary"}>
                                {isAgent ? "TR" : role === "assistant" ? "AI" : ((selectedConv.contactName || selectedConv.user?.name || selectedConv.channelUserId || "U").charAt(0))}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          
                          <div className={`flex flex-col gap-2 max-w-[85%] xl:max-w-[70%] ${role === "user" ? "items-end" : "items-start"}`}>
                            <div 
                              className={`
                                relative p-4 lg:p-5 rounded-[24px] text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words w-full
                                ${role === "user" 
                                  ? "bg-zinc-950 text-white rounded-br-sm shadow-zinc-950/10" 
                                  : isAgent
                                    ? "bg-blue-50 text-zinc-800 rounded-bl-sm ring-1 ring-blue-100/50"
                                    : "bg-white text-zinc-800 rounded-bl-sm ring-1 ring-black/[0.03]"}
                              `}
                            >
                              {msg.content}
                              
                              {sources && sources.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-muted/50 flex flex-col gap-2">
                                  <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                                     <ShieldCheck className="w-3.5 h-3.5" /> Doğrulanmış Kaynak
                                  </div>
                                  {sources.slice(0, 2).map((src: any, idx: number) => (
                                    <div key={idx} className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between group cursor-pointer hover:bg-primary/10 transition-colors">
                                       <div className="flex items-center gap-2 min-w-0">
                                         <Globe className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                         <span className="text-[11px] font-bold truncate max-w-[150px]">{src.title || src.url}</span>
                                       </div>
                                       <ExternalLink className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground px-2 flex items-center gap-2 italic">
                               {time}
                               {isAgent ? (
                                 <span className="flex items-center gap-1 text-[9px] bg-blue-100/60 text-blue-700 px-1.5 py-0.5 rounded-full font-bold not-italic">Temsilci</span>
                               ) : role === "assistant" ? (
                                 <span className="flex items-center gap-1 text-[9px] bg-amber-100/60 text-amber-700 px-1.5 py-0.5 rounded-full font-bold not-italic">Yapay Zeka</span>
                               ) : null}
                               {role === "assistant" && <Check className="w-3 h-3 text-emerald-500" />}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isTyping && (
                  <div className="flex gap-4">
                     <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center text-white ring-1 ring-white/10 animate-pulse">
                        <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                     </div>
                     <div className="bg-white p-4 rounded-3xl rounded-tl-sm border border-black/5 flex items-center gap-1.5 h-10 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                     </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Action Panel */}
            <div className="p-4 lg:p-6 bg-white/80 backdrop-blur-md border-t border-black/5 relative z-20">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
                <div className="relative flex flex-col bg-muted/40 rounded-[28px] focus-within:bg-white focus-within:shadow-2xl focus-within:shadow-primary/5 transition-all duration-500 border border-transparent focus-within:border-primary/20 overflow-hidden">
                   
                   <div className="px-5 py-2 flex items-center justify-between bg-black/[0.02] border-b border-black/[0.03]">
                      <div className="flex items-center gap-3">
                         <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isAiActive ? "bg-amber-100 text-amber-700" : "bg-zinc-200 text-zinc-700"}`}>
                            {isAiActive ? "YZ Modu Aktif" : "Temsilci Modu"}
                         </span>
                      </div>
                      <div className="flex gap-4">
                         <button type="button" className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter">Şablonlar / Hızlı Yanıt</button>
                      </div>
                   </div>

                   <div className="flex items-end p-2 gap-2">
                     <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-white rounded-2xl">
                        <Paperclip className="w-5 h-5" />
                     </Button>
                     
                     <Textarea 
                       value={inputText}
                       onChange={(e) => setInputText(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key === "Enter" && !e.shiftKey) {
                           e.preventDefault();
                           handleSendMessage();
                         }
                       }}
                       placeholder={isAiActive ? "Yapay Zeka Otopilot aktif. Devre dışı bırakmak için mesaj yazın..." : "Bir mesaj yazın..."}
                       className="flex-1 min-h-[48px] max-h-32 border-none bg-transparent focus-visible:ring-0 resize-none font-bold text-sm py-4 px-4 placeholder:text-muted-foreground/50"
                     />

                     <div className="flex gap-1">
                       <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-white rounded-2xl">
                          <Smile className="w-5 h-5" />
                       </Button>
                       <Button 
                         type="submit"
                         disabled={isSending || !inputText.trim()}
                         className="h-11 w-11 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/20 flex-shrink-0"
                       >
                          <Send className="w-4 h-4 ml-0.5" />
                       </Button>
                     </div>
                   </div>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="max-w-sm space-y-2">
              <h3 className="font-black text-lg text-zinc-800">Bir sohbet seçin</h3>
              <p className="text-sm text-muted-foreground">Sohbet geçmişini ve logları görüntülemek için sol sütundan aktif bir oturum seçin.</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. CRM / Metadata Right Column */}
      {selectedConv && (
        <div className="w-[280px] xl:w-[320px] hidden xl:flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
          
          {/* User Profile Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-[32px] border border-black/5 p-6 space-y-6">
             <div className="flex items-center justify-between mb-4">
               <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Kullanıcı Profili</h4>
             </div>
             
             <div className="flex flex-col items-center text-center gap-3">
               <div className="w-24 h-24 rounded-[32px] overflow-hidden p-1.5 bg-gradient-to-br from-primary/20 to-primary/5 shadow-xl shadow-primary/5">
                  <Avatar className="w-full h-full rounded-[24px]">
                     <AvatarImage src={selectedConv.contactProfilePic || selectedConv.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConv.id}`} className="object-cover" />
                     <AvatarFallback className="text-2xl">{(selectedConv.contactName || selectedConv.user?.name || selectedConv.channelUserId || "U").charAt(0)}</AvatarFallback>
                  </Avatar>
               </div>
               <div>
                 <h3 className="font-black text-lg">{selectedConv.contactName || selectedConv.user?.name || selectedConv.channelUserId || "Ziyaretçi"}</h3>
                 <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1">
                   <Mail className="w-3 h-3" /> {selectedConv.contactEmail || selectedConv.user?.email || "E-posta yok"}
                 </p>
                 
                                  {!isCrmFormOpen ? (
                    selectedConv.contactName ? (
                      <div className="mt-4 text-left p-3.5 bg-muted/40 rounded-2xl border border-black/[0.02] space-y-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Müşteri Detayı</span>
                          <span className="text-xs font-bold text-zinc-800 mt-1">{selectedConv.contactName}</span>
                        </div>
                        {selectedConv.contactPhone && (
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Telefon</span>
                            <span className="text-xs font-medium text-zinc-700 mt-0.5">{selectedConv.contactPhone}</span>
                          </div>
                        )}
                        {selectedConv.contactNotes && (
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Notlar</span>
                            <span className="text-xs font-medium text-zinc-600 mt-0.5 break-words line-clamp-3">{selectedConv.contactNotes}</span>
                          </div>
                        )}
                        <Button 
                          onClick={() => setIsCrmFormOpen(true)}
                          className="w-full rounded-xl font-bold text-xs bg-zinc-100 text-zinc-800 hover:bg-zinc-200 mt-2 h-8"
                        >
                          Bilgileri Güncelle
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => setIsCrmFormOpen(true)}
                        className="w-full rounded-xl font-bold text-xs bg-primary text-white hover:bg-primary/95 mt-4 h-9 shadow-md shadow-primary/10"
                      >
                        CRM'e Ekle
                      </Button>
                    )
                  ) : (
                   <form onSubmit={handleSaveToCrm} className="space-y-3 mt-4 text-left">
                     <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">CRM İsim</label>
                       <Input 
                         value={crmName} 
                         onChange={(e) => setCrmName(e.target.value)} 
                         placeholder="İsim" 
                         required 
                         className="h-9 rounded-xl text-xs font-bold bg-muted/30 border-none"
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">CRM E-Posta</label>
                       <Input 
                         value={crmEmail} 
                         onChange={(e) => setCrmEmail(e.target.value)} 
                         placeholder="E-Posta (isteğe bağlı)" 
                         type="email" 
                         className="h-9 rounded-xl text-xs font-bold bg-muted/30 border-none"
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">CRM Telefon</label>
                       <Input 
                         value={crmPhone} 
                         onChange={(e) => setCrmPhone(e.target.value)} 
                         placeholder="Telefon (isteğe bağlı)" 
                         type="tel" 
                         className="h-9 rounded-xl text-xs font-bold bg-muted/30 border-none"
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Notlar</label>
                       <Textarea 
                         value={crmNotes} 
                         onChange={(e) => setCrmNotes(e.target.value)} 
                         placeholder="Notlar" 
                         className="min-h-[60px] rounded-xl text-xs font-bold bg-muted/30 border-none py-2 px-3 focus-visible:ring-0 resize-none"
                       />
                     </div>
                     <div className="flex gap-2">
                       <Button 
                         type="submit" 
                         disabled={isAddingToCrm}
                         className="flex-1 h-9 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10"
                       >
                         {isAddingToCrm ? "Kaydediliyor..." : "Kaydet"}
                       </Button>
                       <Button 
                         type="button" 
                         onClick={() => setIsCrmFormOpen(false)}
                         className="h-9 rounded-xl font-bold text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
                       >
                         İptal
                       </Button>
                     </div>
                   </form>
                 )}
               </div>
             </div>
 
             <div className="space-y-4 pt-4 border-t border-black/5">
                 <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Meta Veriler</span>
                    <div className="p-3 bg-muted/30 rounded-2xl border border-black/[0.02] space-y-2">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold opacity-60">Ülke</span>
                          <span className="text-xs font-black uppercase">{selectedConv.country || "Bilinmiyor"}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold opacity-60">Kanal</span>
                          <span className="text-xs font-black uppercase">{selectedConv.channel === "widget" ? "Web Sitesi" : selectedConv.channel}</span>
                       </div>
                    </div>
                 </div>
 
                 <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Etiketler</span>
                    <div className="flex flex-wrap gap-1.5">
                       {(selectedConv.tags as string[] || []).map(tag => (
                         <Badge 
                           key={tag} 
                           variant="secondary" 
                           onClick={() => handleRemoveTag(tag)}
                           className="px-3 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 hover:bg-red-50 hover:text-red-600 border-none capitalize cursor-pointer transition-colors"
                         >
                           {tag} <span className="ml-1 text-[8px] opacity-60">×</span>
                         </Badge>
                       ))}
                       {isAddingTagInline ? (
                         <form
                           onSubmit={(e) => {
                             e.preventDefault();
                             handleAddTagSubmit(newTagInput);
                             setNewTagInput("");
                             setIsAddingTagInline(false);
                           }}
                           className="flex items-center gap-1.5 w-full mt-1"
                         >
                           <Input
                             value={newTagInput}
                             onChange={(e) => setNewTagInput(e.target.value)}
                             onKeyDown={(e) => {
                               if (e.key === "Escape") {
                                 setIsAddingTagInline(false);
                                 setNewTagInput("");
                               }
                             }}
                             placeholder="Etiket..."
                             autoFocus
                             className="h-8 rounded-lg text-[11px] font-bold bg-zinc-100/50 border-zinc-200/50 flex-1 py-1 px-2 focus-visible:ring-primary/20"
                           />
                           <Button type="submit" size="sm" className="h-8 w-8 rounded-lg p-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                             <Check className="w-3.5 h-3.5" />
                           </Button>
                           <Button
                             type="button"
                             onClick={() => {
                               setIsAddingTagInline(false);
                               setNewTagInput("");
                             }}
                             variant="ghost"
                             size="sm"
                             className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:bg-zinc-100"
                           >
                             <X className="w-3.5 h-3.5" />
                           </Button>
                         </form>
                       ) : (
                         <Badge 
                           variant="outline" 
                           onClick={() => setIsAddingTagInline(true)}
                           className="px-3 py-1 rounded-lg text-[10px] font-bold border-dashed border-muted-foreground/30 text-muted-foreground cursor-pointer hover:bg-zinc-50 transition-colors"
                         >
                           + Etiket Ekle
                         </Badge>
                       )}
                    </div>
                 </div>
              </div>
           </div>

           {/* Internal Notes Card */}
           <div className="bg-white/60 backdrop-blur-xl rounded-[32px] border border-black/5 p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-black/5">
                 <StickyNote className="w-4 h-4 text-amber-500" />
                 <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Dahili Notlar</h4>
              </div>

              {/* Notes Timeline List */}
              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                 {selectedConv.notes && selectedConv.notes.length > 0 ? (
                   selectedConv.notes.map((note: any) => (
                     <div key={note.id} className="p-3 rounded-2xl bg-amber-50/40 border border-amber-200/10 text-xs text-zinc-700 space-y-1">
                       <p className="font-semibold break-words leading-relaxed">{note.content}</p>
                       <div className="flex justify-between items-center text-[9px] text-zinc-400 font-semibold pt-1">
                         <span>{note.createdBy === "system" ? "Sistem" : "Temsilci"}</span>
                         <span>{new Date(note.createdAt).toLocaleDateString("tr-TR", {hour: "2-digit", minute:"2-digit"})}</span>
                       </div>
                     </div>
                   ))
                 ) : (
                   <p className="text-[11px] text-muted-foreground/80 italic text-center py-2">Dahili not bulunmuyor.</p>
                 )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNoteSubmit} className="space-y-2 pt-2 border-t border-black/5">
                 <Textarea
                   id="new-note-textarea"
                   value={newNoteText}
                   onChange={(e) => setNewNoteText(e.target.value)}
                   placeholder="Dahili bir not yazın..."
                   required
                   className="min-h-[50px] max-h-24 rounded-xl text-xs font-bold bg-muted/30 border-none py-2 px-3 focus-visible:ring-0 resize-none placeholder:text-muted-foreground/50"
                 />
                 <Button
                   type="submit"
                   disabled={isSavingNote || !newNoteText.trim()}
                   className="w-full h-8 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/10"
                 >
                   {isSavingNote ? "Kaydediliyor..." : "Not Ekle"}
                 </Button>
              </form>
           </div>
 
           {/* AI Strategy Info Card */}
           <div className="bg-zinc-950 text-white rounded-[32px] p-6 space-y-5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-1000" />
              
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ring-1 ring-white/10">
                       <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                       <h4 className="font-black text-sm">Bot Zekası</h4>
                       <p className="text-[10px] text-zinc-400 font-bold">{selectedConv.chatbot?.name || "Asistan Temsilci"}</p>
                    </div>
                 </div>
 
                 <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                       <span className="text-xs font-bold text-zinc-300">Otopilot</span>
                       <span className={`text-xs font-black ${isAiActive ? "text-emerald-400" : "text-amber-400"}`}>
                         {isAiActive ? "AKTİF" : "DURAKLATILDI"}
                       </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                       <span className="text-xs font-bold text-zinc-300">Toplam Mesaj</span>
                       <span className="text-xs font-black text-blue-400">{messages.length}</span>
                    </div>
                 </div>
              </div>
           </div>
         </div>
       )}     </div>
  );
}
