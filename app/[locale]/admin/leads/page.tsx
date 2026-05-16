"use client";

import { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Mail,
  Phone,
  Building2,
  Calendar,
  Loader2,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (error) {
      toast.error("Talepler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success("Durum güncellendi.");
        fetchLeads();
      }
    } catch (error) {
      toast.error("Güncelleme başarısız.");
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Talepler Getiriliyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <Badge variant="outline" className="mb-3 rounded-full bg-primary/10 text-primary border-primary/20 font-black text-[9px] px-3 tracking-widest uppercase">Müşterİ Taleplerİ</Badge>
           <h1 className="text-4xl font-black tracking-tight text-white mb-2">Enterprise Leads</h1>
           <p className="text-zinc-500 font-medium">Kurumsal çözümler için başvuran potansiyel müşterilerinizi yönetin.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ara..." 
                className="h-12 w-64 pl-11 rounded-2xl bg-zinc-900/50 border-white/5 text-white font-medium focus:ring-primary/20" 
              />
           </div>
           <Button onClick={fetchLeads} variant="outline" className="h-12 w-12 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 transition-all">
              <RefreshCw className="w-4 h-4 text-white" />
           </Button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="grid grid-cols-1 gap-6">
        {filteredLeads.length === 0 ? (
          <Card className="rounded-[40px] bg-zinc-900/20 border-dashed border-white/5 p-20 flex flex-col items-center justify-center text-center">
             <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-zinc-600" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Henüz Talep Yok</h3>
             <p className="text-zinc-500 max-w-sm">Enterprise formu üzerinden henüz bir başvuru almadınız.</p>
          </Card>
        ) : (
          filteredLeads.map((lead) => (
            <Card key={lead.id} className="rounded-[32px] bg-zinc-900/40 border-white/5 hover:border-primary/20 transition-all duration-500 group overflow-hidden">
               <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-stretch">
                     {/* Left: Contact Info */}
                     <div className="p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-white/5 space-y-6">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center font-black text-primary text-xl">
                              {lead.name.charAt(0)}
                           </div>
                           <div>
                              <h3 className="font-black text-white text-lg">{lead.name}</h3>
                              <p className="text-xs font-medium text-zinc-500">{lead.company}</p>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                              <Mail className="w-4 h-4" />
                              <span className="text-sm font-bold">{lead.email}</span>
                           </div>
                           {lead.phone && (
                              <div className="flex items-center gap-3 text-zinc-400">
                                 <Phone className="w-4 h-4" />
                                 <span className="text-sm font-bold">{lead.phone}</span>
                              </div>
                           )}
                           <div className="flex items-center gap-3 text-zinc-500">
                              <Calendar className="w-4 h-4" />
                              <span className="text-[11px] font-bold uppercase tracking-widest">
                                {format(new Date(lead.createdAt), "dd MMMM yyyy, HH:mm", { locale: tr })}
                              </span>
                           </div>
                        </div>
                     </div>

                     {/* Middle: Message */}
                     <div className="p-8 flex-1 bg-white/[0.02]">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Müşterİ Mesajı</p>
                        <p className="text-zinc-300 font-medium leading-relaxed italic">
                           "{lead.message}"
                        </p>
                     </div>

                     {/* Right: Actions */}
                     <div className="p-8 md:w-64 flex flex-col justify-between gap-6">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Durum</p>
                           <div className="flex flex-wrap gap-2">
                              <Badge 
                                className={`rounded-xl font-bold uppercase text-[9px] px-3 py-1 ${
                                  lead.status === "PENDING" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                  lead.status === "CONTACTED" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                }`}
                              >
                                {lead.status === "PENDING" ? "Beklemede" : lead.status === "CONTACTED" ? "Görüşülüyor" : "Tamamlandı"}
                              </Badge>
                           </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                           <Button 
                             onClick={() => updateStatus(lead.id, lead.status === "PENDING" ? "CONTACTED" : "CLOSED")}
                             className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-bold h-10 shadow-lg shadow-primary/20"
                           >
                             {lead.status === "PENDING" ? "Görüşmeye Başla" : "Kapat"}
                           </Button>
                           <Button variant="ghost" className="w-full rounded-xl text-zinc-400 hover:text-white font-bold h-10" asChild>
                              <a href={`mailto:${lead.email}`}>
                                 <ExternalLink className="w-4 h-4 mr-2" />
                                 Mail Gönder
                              </a>
                           </Button>
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
