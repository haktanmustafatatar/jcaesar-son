"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MessageSquare, 
  FileText, 
  ChevronLeft, 
  Save, 
  Loader2, 
  Clock, 
  Tag, 
  Share2,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function LeadDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [contact, setContact] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  
  // Editable form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchLeadData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/crm/contacts/${id}`);
        if (!res.ok) throw new Error("Failed to load contact");
        const data = await res.json();
        
        setContact(data.contact);
        setAppointments(data.appointments || []);
        setConversations(data.conversations || []);
        
        setName(data.contact.name || "");
        setEmail(data.contact.email || "");
        setPhone(data.contact.phone || "");
        setNotes(data.contact.notes || "");
        setStatus(data.contact.status || "NEW");
      } catch (err) {
        toast.error("Müşteri detayları yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeadData();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          email,
          phone,
          notes,
          status
        })
      });

      if (res.ok) {
        toast.success("Müşteri bilgileri başarıyla güncellendi.");
      } else {
        toast.error("Bilgiler güncellenemedi.");
      }
    } catch (err) {
      toast.error("Bağlantı hatası.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/crm/contacts?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Müşteri başarıyla silindi.");
        router.push("/dashboard/leads");
      } else {
        toast.error("Müşteri silinemedi.");
      }
    } catch (err) {
      toast.error("Bağlantı hatası.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-bold text-muted-foreground">Müşteri detayları yükleniyor...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-bold">Müşteri Bulunamadı</h2>
        <Button onClick={() => router.push("/dashboard/leads")} className="mt-4">Listeye Geri Dön</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 text-left">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-xl border-zinc-200 h-10 w-10 bg-transparent" onClick={() => router.push("/dashboard/leads")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white">Müşteri Profil Kartı</h1>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">CRM Lead Management Console</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDelete} variant="destructive" className="rounded-xl font-bold h-11 px-5 shadow-lg shadow-destructive/10">
            <Trash2 className="w-4 h-4 mr-2" />
            Müşteriyi Sil
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl font-bold h-11 px-6 bg-primary text-white shadow-lg shadow-primary/20">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Değişiklikleri Kaydet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
        {/* Left Side: General Profile Info Form */}
        <div className="space-y-6">
          <Card className="rounded-[32px] border-zinc-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/15 border-b p-6">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Müşteri Detayları
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">İsim Soyisim</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl bg-zinc-50 border-zinc-100" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">E-posta Adresi</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="h-11 rounded-xl bg-zinc-50 border-zinc-100" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">Telefon Numarası</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="h-11 rounded-xl bg-zinc-50 border-zinc-100" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">Kanal Statüsü</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-100 font-bold text-zinc-800">
                    <SelectValue placeholder="Durum Seçin" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="NEW" className="font-bold">Yeni (NEW)</SelectItem>
                    <SelectItem value="CONTACTED" className="font-bold">İletişimde (CONTACTED)</SelectItem>
                    <SelectItem value="QUALIFIED" className="font-bold">Nitelikli (QUALIFIED)</SelectItem>
                    <SelectItem value="CLOSED" className="font-bold">Kapanış (CLOSED)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">Müşteri Kaynağı (Channel)</Label>
                <div className="flex gap-2">
                  <Badge variant="outline" className="h-7 font-black border-zinc-200">
                    {contact.sourceChannel || "WIDGET"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">Dahili Notlar</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Müşteri hakkında dahili notlarınızı buraya yazın..." className="min-h-[120px] rounded-xl bg-zinc-50 border-zinc-100 pt-3" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Tabular Details (Chat History, Appointments) */}
        <div className="space-y-6">
          {/* Active Appointments */}
          <Card className="rounded-[32px] border-zinc-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/15 border-b p-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Randevular ({appointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {appointments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground font-medium text-sm">
                  Kayıtlı randevu bulunmuyor.
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((app, idx) => (
                    <div key={idx} className="p-4 border rounded-2xl bg-zinc-50/40 dark:bg-zinc-800/20 border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-950 dark:text-white">{app.title}</p>
                          <p className="text-[11px] font-bold text-zinc-400 mt-0.5">
                            {new Date(app.startTime).toLocaleString("tr-TR")}
                          </p>
                        </div>
                      </div>
                      <Badge className={app.status === "CANCELLED" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}>
                        {app.status === "CANCELLED" ? "İPTAL EDİLDİ" : "ONAYLANDI"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation History */}
          <Card className="rounded-[32px] border-zinc-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/15 border-b p-6">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Konuşma Geçmişi ({conversations.length} Sohbet)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {conversations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground font-medium text-sm">
                  Aktif bir konuşma geçmişi bulunmuyor.
                </div>
              ) : (
                conversations.map((conv, cIdx) => (
                  <div key={cIdx} className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2 border-zinc-100">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">SOHBET ID: #{conv.id.slice(-6)}</span>
                      <Badge variant="outline" className="border-zinc-200 text-[10px] font-black uppercase">
                        Kanal: {conv.channel}
                      </Badge>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto space-y-3 p-4 bg-zinc-50/50 dark:bg-zinc-800/10 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      {conv.messages && conv.messages.length > 0 ? (
                        conv.messages.map((msg: any, mIdx: number) => {
                          const isUser = msg.role === "USER";
                          return (
                            <div key={mIdx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[70%] p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                                isUser 
                                  ? "bg-primary text-white rounded-tr-none" 
                                  : "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white border rounded-tl-none"
                              }`}>
                                <p>{msg.content}</p>
                                <span className={`text-[8px] mt-1 block text-right font-medium ${isUser ? "text-white/70" : "text-muted-foreground"}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground text-center">Mesaj bulunmuyor.</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
