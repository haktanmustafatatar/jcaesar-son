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
  Target,
  Zap,
  Megaphone,
  Send,
  Trash,
  Plus,
  LayoutGrid,
  List,
  Download,
  Check,
  ChevronDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import Link from "next/link";

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
  const [isSendCampaigning, setIsSendCampaigning] = useState(false);
  const [chatbots, setChatbots] = useState<any[]>([]);
  
  // Layout and view modes
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  
  // Advanced filtration states
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [botFilter, setBotFilter] = useState("ALL");

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Manual Contact Creation states
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    sourceChannel: "WIDGET",
    chatbotId: ""
  });

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
        if (data.length > 0) {
          setNewContact(prev => ({ ...prev, chatbotId: data[0].id }));
        }
      }
    } catch (error) {
      toast.error("Veriler yüklenemedi.");
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
      toast.error("Lütfen gerekli alanları doldurun.");
      return;
    }

    setIsSendCampaigning(true);
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
      toast.error("Bağlantı hatası.");
    } finally {
      setIsSendCampaigning(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;
    
    try {
      const res = await fetch(`/api/crm/contacts?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Müşteri silindi.");
        fetchData();
      } else {
        toast.error("Müşteri silinemedi.");
      }
    } catch(err) {
      toast.error("Bağlantı hatası.");
    }
  };

  // Drag and drop status handler
  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    e.dataTransfer.setData("text/plain", contactId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    const contactId = e.dataTransfer.getData("text/plain");
    if (!contactId) return;

    // Optimistically update
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, status: targetStatus } : c));

    try {
      const res = await fetch("/api/crm/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contactId, status: targetStatus })
      });
      if (!res.ok) {
        throw new Error("API error");
      }
      toast.success("Durum güncellendi.");
    } catch (err) {
      toast.error("Durum güncellenemedi.");
      fetchData(); // Revert
    }
  };

  const handleCreateContact = async () => {
    if (!newContact.name || !newContact.chatbotId) {
      toast.error("Lütfen ad ve bot seçimi yapın.");
      return;
    }

    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact)
      });
      if (res.ok) {
        toast.success("Yeni müşteri başarıyla eklendi.");
        setIsAddContactOpen(false);
        setNewContact(prev => ({
          ...prev,
          name: "",
          email: "",
          phone: "",
          notes: "",
          sourceChannel: "WIDGET"
        }));
        fetchData();
      } else {
        toast.error("Müşteri eklenemedi.");
      }
    } catch (err) {
      toast.error("Bağlantı hatası.");
    }
  };

  // Bulk Actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredContacts.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Seçili ${selectedIds.length} müşteriyi silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/crm/contacts?ids=${selectedIds.join(",")}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Seçili kişiler silindi.");
        setSelectedIds([]);
        fetchData();
      } else {
        toast.error("Silme işlemi başarısız.");
      }
    } catch (err) {
      toast.error("Bağlantı hatası.");
    }
  };

  const handleBulkStatusChange = async (targetStatus: string) => {
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, bulkStatus: targetStatus })
      });
      if (res.ok) {
        toast.success("Durumlar toplu olarak güncellendi.");
        setSelectedIds([]);
        fetchData();
      } else {
        toast.error("Güncelleme başarısız.");
      }
    } catch (err) {
      toast.error("Bağlantı hatası.");
    }
  };

  const handleCSVExport = () => {
    const targetContacts = selectedIds.length > 0 
      ? contacts.filter(c => selectedIds.includes(c.id))
      : filteredContacts;
      
    if (targetContacts.length === 0) {
      toast.error("Dışa aktarılacak müşteri bulunamadı.");
      return;
    }

    const headers = ["İsim", "E-posta", "Telefon", "Durum", "Kaynak Kanal", "Kayıt Tarihi"];
    const rows = targetContacts.map(c => [
      c.name || "",
      c.email || "",
      c.phone || "",
      c.status || "NEW",
      c.sourceChannel || "WIDGET",
      new Date(c.createdAt).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jcaesar_contacts_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV dosyası indirildi.");
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = 
      (c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (c.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesChannel = channelFilter === "ALL" || c.sourceChannel === channelFilter;
    const matchesBot = botFilter === "ALL" || c.chatbotId === botFilter;

    return matchesSearch && matchesStatus && matchesChannel && matchesBot;
  });

  const kanbanColumns = [
    { id: "NEW", label: "Yeni Müşteri", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { id: "CONTACTED", label: "İletişimde", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    { id: "QUALIFIED", label: "Nitelikli", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    { id: "CLOSED", label: "Kapanış", color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Syncing CRM Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-4 lg:p-8 max-w-[1600px] mx-auto text-left">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
         {[
           { label: t("totalContacts") || "Toplam Müşteri", value: contacts.length, icon: Users, color: "bg-blue-500" },
           { label: t("hotLeads") || "Nitelikli Leads", value: contacts.filter(c => c.status === "QUALIFIED").length, icon: Target, color: "bg-emerald-500" },
           { label: t("newLeads") || "Yeni Girişler", value: contacts.filter(c => c.status === "NEW").length, icon: Zap, color: "bg-orange-500" },
           { label: t("activeBots") || "Aktif Ajanlar", value: chatbots.length, icon: Bot, color: "bg-purple-500" },
         ].map((stat, i) => (
           <Card key={i} className="rounded-3xl border-zinc-100 dark:border-zinc-800 shadow-sm p-6 flex items-center gap-4 bg-white dark:bg-zinc-900 hover:shadow-md transition-all">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                 <stat.icon className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
                 <h4 className="text-2xl font-black text-zinc-950 dark:text-white mt-0.5">{stat.value}</h4>
              </div>
           </Card>
         ))}
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex-1">
           <Badge variant="outline" className="mb-3 rounded-full bg-primary/10 text-primary border-primary/20 font-black text-[9px] px-3 tracking-widest uppercase italic">J.Caesar CRM</Badge>
           <h1 className="text-4xl font-black tracking-tight text-zinc-950 dark:text-white mb-2">{t("title")}</h1>
           <p className="text-zinc-500 dark:text-zinc-400 font-medium">{t("subtitle")}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-12 w-full sm:w-64 pl-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-950 dark:text-white font-bold focus:bg-white transition-all shadow-inner" 
              />
           </div>

           {/* Layout Switches */}
           <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl gap-0.5">
             <Button 
               variant="ghost" 
               size="icon"
               onClick={() => setViewMode("list")}
               className={`rounded-lg h-9 w-9 p-0 ${viewMode === "list" ? "bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-950 bg-transparent"}`}
             >
               <List className="w-4.5 h-4.5" />
             </Button>
             <Button 
               variant="ghost" 
               size="icon"
               onClick={() => setViewMode("kanban")}
               className={`rounded-lg h-9 w-9 p-0 ${viewMode === "kanban" ? "bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-950 bg-transparent"}`}
             >
               <LayoutGrid className="w-4.5 h-4.5" />
             </Button>
           </div>

           <Button onClick={() => setIsAddContactOpen(true)} className="h-12 px-5 rounded-xl bg-zinc-950 text-white font-bold hover:scale-102 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Müşteri
           </Button>

           <Button onClick={() => setIsCampaignModalOpen(true)} className="h-12 px-6 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-primary/20">
              <Megaphone className="w-4 h-4 mr-2" />
              Toplu Kampanya
           </Button>
           
           <Button onClick={fetchData} variant="outline" className="h-12 w-12 rounded-xl border-zinc-200 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-all flex items-center justify-center shrink-0 bg-transparent">
              <RefreshCw className="w-4.5 h-4.5" />
           </Button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div className="flex flex-wrap items-center gap-4 bg-muted/20 dark:bg-zinc-900/40 p-5 rounded-3xl border text-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Filtrele:</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full sm:w-auto">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40 rounded-xl bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-bold text-xs">
              <SelectValue placeholder="Tüm Durumlar" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="ALL" className="font-bold text-xs">Tüm Durumlar</SelectItem>
              <SelectItem value="NEW" className="font-bold text-xs">Yeni (NEW)</SelectItem>
              <SelectItem value="CONTACTED" className="font-bold text-xs">İletişimde</SelectItem>
              <SelectItem value="QUALIFIED" className="font-bold text-xs">Nitelikli</SelectItem>
              <SelectItem value="CLOSED" className="font-bold text-xs">Kapandı</SelectItem>
            </SelectContent>
          </Select>

          {/* Channel Filter */}
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-9 w-40 rounded-xl bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-bold text-xs">
              <SelectValue placeholder="Tüm Kanallar" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="ALL" className="font-bold text-xs">Tüm Kanallar</SelectItem>
              <SelectItem value="WIDGET" className="font-bold text-xs">Web Widget</SelectItem>
              <SelectItem value="WHATSAPP" className="font-bold text-xs">WhatsApp</SelectItem>
              <SelectItem value="INSTAGRAM" className="font-bold text-xs">Instagram</SelectItem>
              <SelectItem value="TELEGRAM" className="font-bold text-xs">Telegram</SelectItem>
              <SelectItem value="BOOKING" className="font-bold text-xs">Booking Takvim</SelectItem>
            </SelectContent>
          </Select>

          {/* Chatbot Filter */}
          <Select value={botFilter} onValueChange={setBotFilter}>
            <SelectTrigger className="h-9 w-40 rounded-xl bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-bold text-xs">
              <SelectValue placeholder="Tüm Ajanlar" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="ALL" className="font-bold text-xs">Tüm Ajanlar</SelectItem>
              {chatbots.map(bot => (
                <SelectItem key={bot.id} value={bot.id} className="font-bold text-xs">{bot.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Action Bar (Rendered when contacts are selected) */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-950 text-white border-none shadow-xl text-xs font-bold animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span>Seçili {selectedIds.length} Müşteri için İşlem:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-white hover:text-white/80 bg-white/10 hover:bg-white/15">
                  Durum Değiştir <ChevronDown className="w-4 h-4 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl">
                <DropdownMenuItem className="font-bold cursor-pointer" onClick={() => handleBulkStatusChange("NEW")}>Yeni (NEW)</DropdownMenuItem>
                <DropdownMenuItem className="font-bold cursor-pointer" onClick={() => handleBulkStatusChange("CONTACTED")}>İletişimde</DropdownMenuItem>
                <DropdownMenuItem className="font-bold cursor-pointer" onClick={() => handleBulkStatusChange("QUALIFIED")}>Nitelikli</DropdownMenuItem>
                <DropdownMenuItem className="font-bold cursor-pointer" onClick={() => handleBulkStatusChange("CLOSED")}>Kapandı</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleCSVExport} variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-white hover:text-white/80 bg-white/10 hover:bg-white/15">
              <Download className="w-4 h-4 mr-1.5" />
              CSV Dışa Aktar
            </Button>

            <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-9 px-4 rounded-xl font-bold shadow-lg shadow-destructive/15">
              <Trash className="w-4 h-4 mr-1.5" />
              Sil
            </Button>

            <Button onClick={() => setSelectedIds([])} variant="ghost" size="sm" className="h-9 px-3 rounded-xl text-zinc-400 hover:text-white">
              Seçimi Kaldır
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {filteredContacts.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-100 dark:border-zinc-800 shadow-sm">
           <div className="w-20 h-20 rounded-3xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-6 shadow-inner">
              <Users className="w-10 h-10 text-zinc-300" />
           </div>
           <h3 className="text-xl font-black text-zinc-950 dark:text-white mb-2">Müşteri Bulunamadı</h3>
           <p className="text-zinc-500 dark:text-zinc-400 max-w-xs font-medium text-xs">Aradığınız kriterlere uygun herhangi bir kayıt bulunamadı.</p>
        </div>
      ) : viewMode === "list" ? (
        /* List Mode View (with check boxes) */
        <Card className="rounded-[40px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b dark:border-zinc-800 bg-muted/20 dark:bg-zinc-800/40">
                    <th className="p-4 w-12 text-center">
                      <Checkbox 
                        checked={selectedIds.length === filteredContacts.length && filteredContacts.length > 0} 
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        className="rounded-md"
                      />
                    </th>
                    <th className="p-4 font-bold text-xs text-muted-foreground uppercase">İsim</th>
                    <th className="p-4 font-bold text-xs text-muted-foreground uppercase">E-posta</th>
                    <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Telefon</th>
                    <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Kaynak</th>
                    <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Ajan</th>
                    <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Durum</th>
                    <th className="p-4 font-bold text-xs text-muted-foreground uppercase text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => {
                    const isSelected = selectedIds.includes(contact.id);
                    return (
                      <tr key={contact.id} className={cn(
                        "border-b last:border-0 dark:border-zinc-800 hover:bg-muted/10 dark:hover:bg-zinc-800/20 transition-all",
                        isSelected && "bg-primary/[0.01]"
                      )}>
                        <td className="p-4 w-12 text-center">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(contact.id, !!checked)}
                            className="rounded-md"
                          />
                        </td>
                        <td className="p-4 font-semibold text-zinc-950 dark:text-white">
                          <Link href={`/dashboard/leads/${contact.id}`} className="hover:underline flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center font-bold text-primary text-sm">
                              {contact.name?.charAt(0) || "?"}
                            </div>
                            {contact.name}
                          </Link>
                        </td>
                        <td className="p-4 text-muted-foreground">{contact.email || "-"}</td>
                        <td className="p-4 text-muted-foreground">{contact.phone || "-"}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-[9px] font-black border-zinc-200 uppercase">
                            {contact.sourceChannel || "WIDGET"}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs font-bold text-zinc-700 dark:text-zinc-300">{contact.chatbot?.name}</td>
                        <td className="p-4">
                          <Badge className={cn(
                             "rounded-full font-black uppercase text-[9px] px-3 py-1 border-none tracking-wider",
                             contact.status === "QUALIFIED" ? "bg-emerald-50 text-emerald-600 border" :
                             contact.status === "CLOSED" ? "bg-zinc-100 text-zinc-500" : "bg-blue-50 text-blue-600 border"
                          )}>
                             {contact.status === "QUALIFIED" ? "NİTELİKLİ" : (contact.status === "CLOSED" ? "KAPANDI" : (contact.status === "CONTACTED" ? "İLETİŞİMDE" : "YENİ"))}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="rounded-xl h-8 w-8 text-zinc-400 hover:text-zinc-950 dark:hover:text-white">
                                 <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl">
                              <DropdownMenuItem className="font-bold cursor-pointer" asChild>
                                <Link href={`/dashboard/leads/${contact.id}`}>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Detayları Gör
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer font-bold" onClick={() => handleDeleteContact(contact.id)}>
                                <Trash className="w-4 h-4 mr-2" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Kanban Pipeline View (Drag and Drop enabled) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {kanbanColumns.map((col) => {
            const colContacts = filteredContacts.filter(c => c.status === col.id);
            return (
              <div 
                key={col.id} 
                className="space-y-4 bg-zinc-50/50 dark:bg-zinc-900/30 p-5 rounded-[32px] border min-h-[500px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />
                    <span className="font-black text-sm text-zinc-950 dark:text-white">{col.label}</span>
                  </div>
                  <Badge variant="outline" className="border-zinc-200 text-zinc-500 font-black text-[10px] px-2 h-5">
                    {colContacts.length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {colContacts.map((contact) => (
                    <div
                      key={contact.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, contact.id)}
                      className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group relative text-left"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{contact.sourceChannel || "WIDGET"}</span>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl">
                            <DropdownMenuItem className="font-bold cursor-pointer" asChild>
                              <Link href={`/dashboard/leads/${contact.id}`}>
                                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                Detayları Gör
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer font-bold" onClick={() => handleDeleteContact(contact.id)}>
                              <Trash className="w-3.5 h-3.5 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <h4 className="font-black text-zinc-950 dark:text-white text-sm tracking-tight">{contact.name || "İsimsiz"}</h4>
                      
                      <div className="space-y-1.5 mt-4 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        {contact.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-zinc-400" /> <span className="truncate">{contact.email}</span></div>}
                        {contact.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-zinc-400" /> <span>{contact.phone}</span></div>}
                      </div>

                      <div className="mt-4 pt-3 border-t dark:border-zinc-800 flex items-center justify-between text-[9px] font-black text-zinc-400 uppercase tracking-wider">
                        <span>Ajan: {contact.chatbot?.name}</span>
                        <span>{format(new Date(contact.createdAt), "dd MMM")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Add Contact Dialog Modal */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="rounded-[40px] max-w-md p-8 border-none bg-white text-zinc-950 shadow-2xl text-left">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-zinc-950">Yeni Müşteri Kaydı</DialogTitle>
            <DialogDescription className="font-medium text-zinc-500">
               Müşteri bilgilerini manuel olarak veritabanına ekleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-0.5">Adı Soyadı</Label>
              <Input 
                value={newContact.name} 
                onChange={e => setNewContact({...newContact, name: e.target.value})} 
                placeholder="Örn: Hakan Tatar" 
                className="h-11 rounded-xl bg-zinc-50 border-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-0.5">E-posta</Label>
              <Input 
                value={newContact.email} 
                onChange={e => setNewContact({...newContact, email: e.target.value})} 
                placeholder="hakan@example.com" 
                className="h-11 rounded-xl bg-zinc-50 border-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-0.5">Telefon</Label>
              <Input 
                value={newContact.phone} 
                onChange={e => setNewContact({...newContact, phone: e.target.value})} 
                placeholder="+90 555..." 
                className="h-11 rounded-xl bg-zinc-50 border-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-0.5">İlişkili Sohbet Ajanı</Label>
                <Select value={newContact.chatbotId} onValueChange={(v) => setNewContact({...newContact, chatbotId: v})}>
                  <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-100 font-bold text-zinc-950">
                    <SelectValue placeholder="Seçim yapın" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {chatbots.map(bot => (
                      <SelectItem key={bot.id} value={bot.id} className="font-bold text-xs">{bot.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-0.5">Kanal</Label>
                <Select value={newContact.sourceChannel} onValueChange={(v) => setNewContact({...newContact, sourceChannel: v})}>
                  <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-100 font-bold text-zinc-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="WIDGET" className="font-bold text-xs">Web Widget</SelectItem>
                    <SelectItem value="WHATSAPP" className="font-bold text-xs">WhatsApp</SelectItem>
                    <SelectItem value="INSTAGRAM" className="font-bold text-xs">Instagram</SelectItem>
                    <SelectItem value="TELEGRAM" className="font-bold text-xs">Telegram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-0.5">Dahili Notlar</Label>
              <Textarea 
                value={newContact.notes} 
                onChange={e => setNewContact({...newContact, notes: e.target.value})} 
                placeholder="Müşteri notları..." 
                className="min-h-[80px] rounded-xl bg-zinc-50 border-zinc-100 pt-3"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsAddContactOpen(false)} className="rounded-xl h-11 px-4 font-bold text-xs text-zinc-400">Vazgeç</Button>
            <Button onClick={handleCreateContact} className="rounded-xl h-11 px-6 font-bold text-xs bg-zinc-950 text-white hover:bg-zinc-900">Müşteriyi Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Modal */}
      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="rounded-[40px] max-w-2xl p-10 border-none shadow-2xl text-left bg-white text-zinc-950">
          <DialogHeader>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
               <Megaphone className="w-7 h-7" />
            </div>
            <DialogTitle className="text-3xl font-black text-zinc-950">{t("campaign.title")}</DialogTitle>
            <DialogDescription className="font-bold text-zinc-500 text-sm">
               {t("campaign.subtitle")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t("campaign.subject")}</Label>
              <Input 
                value={campaign.subject}
                onChange={(e) => setCampaign({...campaign, subject: e.target.value})}
                className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t("campaign.message")}</Label>
              <Textarea 
                value={campaign.message}
                onChange={(e) => setCampaign({...campaign, message: e.target.value})}
                placeholder={`Örn: Merhaba {name}, indirim fırsatlarımızı kaçırmayın.`}
                className="min-h-[160px] rounded-[24px] bg-zinc-50 border-zinc-100 font-bold p-6 leading-relaxed focus:bg-white transition-all"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsCampaignModalOpen(false)} className="rounded-2xl h-14 px-8 font-black uppercase text-[11px] tracking-widest text-zinc-400">{t("campaign.cancel")}</Button>
            <Button 
              onClick={handleSendCampaign} 
              disabled={isSendCampaigning}
              className="rounded-2xl h-14 px-10 font-black uppercase text-[11px] tracking-widest bg-zinc-950 text-white hover:bg-zinc-900 shadow-xl"
            >
              {isSendCampaigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> {t("campaign.send")}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
