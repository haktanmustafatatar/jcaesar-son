"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  MessageSquare, 
  User, 
  Clock, 
  ChevronRight,
  MoreVertical,
  Download,
  Trash2,
  Calendar,
  Phone,
  Instagram,
  Send,
  Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

interface Chatbot {
  name: string;
  avatar: string | null;
}

interface Conversation {
  id: string;
  chatbotId: string;
  channel: string;
  channelUserId: string | null;
  status: "ACTIVE" | "CLOSED" | "ESCALATED";
  updatedAt: string;
  createdAt: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactProfilePic: string | null;
  messages: Message[];
  chatbot: Chatbot;
}

const channelIcons: Record<string, any> = {
  widget: MessageSquare,
  whatsapp: Phone,
  instagram: Instagram,
  telegram: Send,
};

function formatRelativeTime(dateString: string, locale: string = "tr") {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isTr = locale === "tr";

  if (diffMins < 1) return isTr ? "Şimdi" : "Just now";
  if (diffMins < 60) return isTr ? `${diffMins} dk önce` : `${diffMins}m ago`;
  if (diffHours < 24) return isTr ? `${diffHours} saat önce` : `${diffHours}h ago`;
  return isTr ? `${diffDays} gün önce` : `${diffDays}d ago`;
}

export default function ConversationsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Selected conversation for Slide-over
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedConversationMessages, setSelectedConversationMessages] = useState<Message[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const response = await fetch("/api/conversations/export");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `conversations-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(locale === "tr" ? "Bu konuşmayı silmek istediğinize emin misiniz?" : "Are you sure you want to delete this conversation?")) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (selectedConversation?.id === id) {
          setSelectedConversation(null);
        }
      } else {
        alert("Failed to delete conversation");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleConversationClick = async (convo: Conversation) => {
    setSelectedConversation(convo);
    setIsMessagesLoading(true);
    try {
      const res = await fetch(`/api/conversations/${convo.id}/messages`);
      if (res.ok) {
        const messagesData = await res.json();
        setSelectedConversationMessages(messagesData);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const filteredConversations = conversations.filter(convo => {
    const contactName = convo.contactName || (locale === "tr" ? "Ziyaretçi" : "Visitor");
    const lastMessage = convo.messages?.[0]?.content || "";
    const query = searchQuery.toLowerCase();
    return (
      contactName.toLowerCase().includes(query) ||
      lastMessage.toLowerCase().includes(query) ||
      convo.chatbot.name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {locale === "tr" ? "Konuşmalar" : "Conversations"}
          </h1>
          <p className="text-muted-foreground">
            {locale === "tr" 
              ? "Tüm yapay zeka etkileşimlerini gerçek zamanlı olarak yönetin ve izleyin."
              : "Manage and monitor all AI interactions in real-time."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {locale === "tr" ? "CSV Dışa Aktar" : "Export CSV"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={locale === "tr" ? "Konuşmaları, ziyaretçileri veya botları arayın..." : "Search conversations, customers, or bots..."}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {locale === "tr" ? "Henüz konuşma yok." : "No conversations found."}
          </div>
        ) : (
          filteredConversations.map((convo, index) => {
            const IconComponent = channelIcons[convo.channel] || MessageSquare;
            const contactName = convo.contactName || (locale === "tr" ? "Ziyaretçi" : "Visitor");
            const lastMessage = convo.messages?.[0]?.content || "";

            return (
              <motion.div
                key={convo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="group hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => handleConversationClick(convo)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
                          <User className="h-5 w-5" />
                          <div className="absolute -bottom-1 -right-1 bg-background p-0.5 rounded-full border">
                            <IconComponent className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{contactName}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {convo.chatbot.name}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {lastMessage || (locale === "tr" ? "Mesaj yok" : "No messages")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden md:flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(convo.updatedAt, locale)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Badge 
                            className={
                              convo.status === "ACTIVE" 
                                ? "bg-green-500/10 text-green-500 hover:bg-green-500/10" 
                                : convo.status === "CLOSED"
                                ? "bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/10"
                                : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/10"
                            }
                          >
                            {convo.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleConversationClick(convo)}>
                                {locale === "tr" ? "Konuşmayı İncele" : "View Chat"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => handleDeleteConversation(convo.id, e)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {locale === "tr" ? "Sil" : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Slide-over Conversation Detail Sheet */}
      <Sheet open={selectedConversation !== null} onOpenChange={(open) => { if (!open) setSelectedConversation(null); }}>
        <SheetContent className="sm:max-w-md w-full flex flex-col h-full bg-background p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="flex items-center gap-2">
              <span>{selectedConversation?.contactName || (locale === "tr" ? "Ziyaretçi" : "Visitor")}</span>
              <Badge variant="secondary" className="text-xs">
                {selectedConversation?.chatbot.name}
              </Badge>
            </SheetTitle>
            <SheetDescription>
              {locale === "tr" ? "Konuşma detayları ve geçmişi" : "Conversation details and log"}
            </SheetDescription>
          </SheetHeader>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isMessagesLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span>{locale === "tr" ? "Mesajlar yükleniyor..." : "Loading messages..."}</span>
              </div>
            ) : selectedConversationMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                {locale === "tr" ? "Mesaj bulunamadı." : "No messages found."}
              </div>
            ) : (
              selectedConversationMessages.map((msg) => {
                const isUser = msg.role === "USER";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <span className="text-[10px] opacity-70 block text-right mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-6 border-t bg-muted/20 flex justify-end">
            <Button variant="outline" onClick={() => setSelectedConversation(null)}>
              {locale === "tr" ? "Kapat" : "Close"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

