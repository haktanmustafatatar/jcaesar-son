"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  Calendar,
  Loader2,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Bot,
  TrendingUp,
  Target,
  Zap,
  Megaphone,
  Send,
  Trash
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr, enUS, de, fr, ru, el, ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";

const getLocaleObj = (locale: string) => {
  switch(locale) {
    case 'tr': return tr;
    case 'de': return de;
    case 'fr': return fr;
    case 'ru': return ru;
    case 'gr': return el;
    case 'ar': return ar;
    default: return enUS;
  }
};

export default function UserCRMPage() {
  const t = useTranslations("Dashboard.CRM");
  const locale = useLocale();
  const dateLocale = getLocaleObj(locale);

  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatbots, setChatbots] = useState<any[]>([]);
  
  const [campaign, setCampaign] = useState({
    chatbotId: "",
    subject: "",
    message: ""
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [contactRes, botRes] = await Promise.all([
        fetch("/api/crm/contacts"),
        fetch("/api/chatbots")
      ]);
      
      if (contactRes.ok) {
        const data = await contactRes.json();
        setContacts(data);
      }
      if (botRes.ok) {
        const data = await botRes.json();
        setChatbots(data);
      }
    } catch (error) {
      toast.error("Failed to load data");
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendCampaign = async () => {
    if (!campaign.chatbotId || !campaign.message) {
      toast.error("Please fill required fields.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaign)
      });

      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        setIsCampaignModalOpen(false);
        setCampaign({ chatbotId: "", subject: "", message: "" });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Network error.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if(id.startsWith("mock")) {
      toast.error("Cannot delete mock contact.");
      return;
    }
    if (!confirm("Are you sure you want to delete this contact?")) return;
    
    try {
      const res = await fetch(`/api/crm/contacts?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success(t("delete"));
        fetchData();
      } else {
        toast.error("Failed to delete.");
      }
    } catch(err) {
      toast.error("Network error.");
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 p-8 max-w-[1600px] mx-auto">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: t("totalContacts"), value: contacts.length, icon: Users, color: "bg-blue-500" },
           { label: t("hotLeads"), value: contacts.filter(c => c.status === "QUALIFIED").length, icon: Target, color: "bg-emerald-500" },
           { label: t("newLeads"), value: contacts.filter(c => c.status === "NEW").length, icon: Zap, color: "bg-orange-500" },
           { label: t("activeBots"), value: chatbots.length, icon: Bot, color: "bg-purple-500" },
         ].map((stat, i) => (
           <Card key={i} className="rounded-3xl border-zinc-100 shadow-sm p-6 flex items-center gap-4 bg-white hover:shadow-md transition-all">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                 <stat.icon className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
                 <h4 className="text-2xl font-black text-zinc-950">{stat.value}</h4>
              </div>
           </Card>
         ))}
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 bg-white p-8 rounded-[40px] border border-zinc-200 shadow-sm">
        <div className="flex-1">
           <Badge variant="outline" className="mb-3 rounded-full bg-primary/10 text-primary border-primary/20 font-black text-[9px] px-3 tracking-widest uppercase italic">Elite CRM V1.0</Badge>
           <h1 className="text-4xl font-black tracking-tight text-zinc-950 mb-2">{t("title")}</h1>
           <p className="text-zinc-500 font-medium">{t("subtitle")}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-14 w-full sm:w-80 pl-12 rounded-2xl bg-zinc-50 border-zinc-100 text-zinc-950 font-bold focus:bg-white transition-all shadow-inner" 
              />
           </div>
           <Button onClick={() => setIsCampaignModalOpen(true)} className="h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-primary/20">
              <Megaphone className="w-4 h-4 mr-2" />
              {t("massCampaign")}
           </Button>
           <Button onClick={fetchData} variant="outline" className="h-14 w-14 rounded-2xl border-zinc-100 text-zinc-400 hover:text-zinc-950 transition-all flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
           </Button>
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
        {filteredContacts.length === 0 ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-white rounded-[60px] border border-zinc-100 shadow-sm">
             <div className="w-24 h-24 rounded-[40px] bg-zinc-50 flex items-center justify-center mb-8 shadow-inner">
                <Users className="w-12 h-12 text-zinc-200" />
             </div>
             <h3 className="text-2xl font-black text-zinc-950 mb-3">{t("noData")}</h3>
             <p className="text-zinc-500 max-w-sm font-medium">{t("noDataDesc")}</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className={cn(
              "rounded-[48px] bg-white border-zinc-100 hover:border-primary/40 transition-all duration-700 group overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/5 border-2",
              contact.id.startsWith("mock") && "opacity-60"
            )}>
               <CardContent className="p-10">
                  <div className="flex items-center justify-between mb-8">
                     <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center font-black text-primary text-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                        {contact.name?.charAt(0) || "?"}
                     </div>
                     <div className="flex items-center gap-2">
                       <Badge className={cn(
                          "rounded-2xl font-black uppercase text-[10px] px-4 py-1.5 border-none tracking-widest",
                          contact.status === "QUALIFIED" ? "bg-emerald-100 text-emerald-600" :
                          contact.status === "CLOSED" ? "bg-zinc-100 text-zinc-500" : "bg-blue-100 text-blue-600"
                       )}>
                          {contact.status === "QUALIFIED" ? t("status.qualified") : (contact.status === "CLOSED" ? t("status.closed") : t("status.new"))}
                       </Badge>
                       
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button size="icon" variant="ghost" className="rounded-xl h-8 w-8 text-zinc-400 hover:text-zinc-950">
                              <MoreVertical className="w-4 h-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="rounded-2xl">
                           <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer" onClick={() => handleDeleteContact(contact.id)}>
                             <Trash className="w-4 h-4 mr-2" />
                             {t("delete")}
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </div>
                  </div>

                  <div className="space-y-6 mb-10">
                     <div>
                        <h3 className="font-black text-zinc-950 text-2xl mb-1 tracking-tight">{contact.name || "Bilinmeyen"}</h3>
                        <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                           <Bot className="w-3 h-3" />
                           {contact.chatbot?.name}
                        </div>
                     </div>

                     <div className="space-y-3 pt-4">
                        <div className="flex items-center gap-4 text-zinc-500 group-hover:text-zinc-950 transition-colors">
                           <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center">
                              <Mail className="w-4 h-4" />
                           </div>
                           <span className="text-sm font-bold truncate">{contact.email || "-"}</span>
                        </div>
                        {contact.phone && (
                           <div className="flex items-center gap-4 text-zinc-500 group-hover:text-zinc-950 transition-colors">
                              <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center">
                                 <Phone className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-bold">{contact.phone}</span>
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="pt-8 border-t border-zinc-100 flex items-center justify-between">
                     <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                           {format(new Date(contact.createdAt), "dd MMM yyyy", { locale: dateLocale })}
                        </span>
                     </div>
                     <div className="flex gap-2">
                        <Button size="icon" variant="outline" className="rounded-2xl w-11 h-11 border-zinc-100 hover:bg-primary hover:text-white transition-all shadow-sm" asChild>
                           <a href={`mailto:${contact.email}`}>
                              <Mail className="w-5 h-5" />
                           </a>
                        </Button>
                     </div>
                  </div>
               </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Campaign Modal */}
      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="rounded-[40px] max-w-2xl p-10 border-none shadow-2xl">
          <DialogHeader>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
               <Megaphone className="w-7 h-7" />
            </div>
            <DialogTitle className="text-3xl font-black text-zinc-950">{t("campaign.title")}</DialogTitle>
            <DialogDescription className="font-bold text-zinc-500 text-sm">
               {t("campaign.subtitle")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-8 py-8">
            <div className="space-y-3">
              <Label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t("campaign.targetGroup")}</Label>
              <Select onValueChange={(v) => setCampaign({...campaign, chatbotId: v})}>
                <SelectTrigger className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold text-zinc-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {chatbots.map(bot => (
                    <SelectItem key={bot.id} value={bot.id} className="font-bold">{bot.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t("campaign.subject")}</Label>
              <Input 
                value={campaign.subject}
                onChange={(e) => setCampaign({...campaign, subject: e.target.value})}
                className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t("campaign.message")}</Label>
              <Textarea 
                value={campaign.message}
                onChange={(e) => setCampaign({...campaign, message: e.target.value})}
                placeholder={`{name}`}
                className="min-h-[200px] rounded-[32px] bg-zinc-50 border-zinc-100 font-bold p-6 leading-relaxed focus:bg-white transition-all"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-4">
            <Button variant="ghost" onClick={() => setIsCampaignModalOpen(false)} className="rounded-2xl h-14 px-8 font-black uppercase text-[11px] tracking-widest text-zinc-400">{t("campaign.cancel")}</Button>
            <Button 
              onClick={handleSendCampaign} 
              disabled={isSending}
              className="rounded-2xl h-14 px-10 font-black uppercase text-[11px] tracking-widest bg-zinc-950 text-white hover:bg-zinc-900 shadow-xl"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> {t("campaign.send")}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
