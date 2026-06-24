"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function PublicBookingPage() {
  const params = useParams();
  const chatbotId = params?.chatbotId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [chatbot, setChatbot] = useState<any>(null);
  const [slotsData, setSlotsData] = useState<Record<string, string[]>>({});
  
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  
  const [successBooking, setSuccessBooking] = useState<any>(null);

  useEffect(() => {
    if (!chatbotId) return;

    const fetchSlots = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/booking/${chatbotId}/slots`);
        if (!res.ok) {
          throw new Error("Slots could not be fetched");
        }
        const data = await res.json();
        setChatbot(data.chatbot);
        setSlotsData(data.slots || {});
        
        // Auto-select first available date
        const dates = Object.keys(data.slots || {});
        if (dates.length > 0) {
          setSelectedDate(dates[0]);
        }
      } catch (err) {
        console.error(err);
        toast.error("Randevu saatleri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [chatbotId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
      toast.error("Lütfen bir tarih ve saat seçin.");
      return;
    }

    if (!name || !email) {
      toast.error("Lütfen isim ve e-posta alanlarını doldurun.");
      return;
    }

    setSubmitting(true);
    try {
      // Calculate start time in date object
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const appDate = new Date(selectedDate);
      appDate.setHours(hours, minutes, 0, 0);

      const res = await fetch(`/api/booking/${chatbotId}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          startTime: appDate.toISOString(),
          notes
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessBooking({
          date: appDate,
          time: selectedTime,
          title: data.appointment?.title
        });
        toast.success("Randevunuz başarıyla oluşturuldu!");
      } else {
        toast.error(data.error || "Randevu oluşturulamadı.");
      }
    } catch (err) {
      toast.error("Bağlantı hatası.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-bold text-muted-foreground">Rezervasyon takvimi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <Card className="max-w-md w-full rounded-3xl text-center p-8 border-muted-foreground/10">
          <CardContent className="space-y-4 pt-6">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Takvim Bulunamadı</h2>
            <p className="text-sm text-muted-foreground">İlgili sohbet botuna ait randevu takvimi mevcut değil veya aktif değil.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Success Screen
  if (successBooking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
        <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
          <Card className="rounded-[32px] border-emerald-500/20 bg-white dark:bg-zinc-900 shadow-2xl text-center p-8 overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            <CardContent className="space-y-6 pt-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold">Randevunuz Onaylandı!</CardTitle>
                <CardDescription className="text-sm">
                  Randevu onay bilgileri ve iptal linki e-posta adresinize gönderilmiştir.
                </CardDescription>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border text-left space-y-3 font-medium text-sm">
                <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                  <CalendarIcon className="h-4 w-4 text-zinc-400" />
                  <span>Tarih: {successBooking.date.toLocaleDateString("tr-TR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <span>Saat: {successBooking.time}</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                  <User className="h-4 w-4 text-zinc-400" />
                  <span>Hizmet: {chatbot.name}</span>
                </div>
              </div>

              <Button onClick={() => setSuccessBooking(null)} className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white">
                Yeni Randevu Al
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const availableDates = Object.keys(slotsData);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-12 md:py-24">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_400px] gap-8 items-start">
        {/* Left Side: Schedule Picker */}
        <div className="space-y-6">
          <div className="space-y-2 text-left">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{chatbot.name}</h1>
            <p className="text-muted-foreground font-medium text-sm">
              {chatbot.description || "Lütfen size uygun bir tarih ve saat seçerek randevunuzu tamamlayın."}
            </p>
          </div>

          <Card className="rounded-3xl border-muted-foreground/10 shadow-xl shadow-black/5 bg-white dark:bg-zinc-900 overflow-hidden">
            <CardHeader className="border-b dark:border-zinc-800 p-6 bg-muted/20 dark:bg-zinc-800/10">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Tarih Seçimi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {availableDates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground font-medium text-sm">
                  Aktif ve uygun hiçbir randevu saati bulunmuyor.
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-200">
                  {availableDates.map((dateStr) => {
                    const dateObj = new Date(dateStr);
                    const isSelected = selectedDate === dateStr;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setSelectedTime("");
                        }}
                        className={`flex flex-col items-center justify-center p-4 min-w-[85px] h-24 rounded-2xl border transition-all ${
                          isSelected 
                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/25 scale-[1.03]" 
                            : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-primary text-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          {dateObj.toLocaleDateString("tr-TR", { weekday: "short" })}
                        </span>
                        <span className="text-2xl font-black mt-1">
                          {dateObj.getDate()}
                        </span>
                        <span className="text-[10px] font-bold opacity-80 mt-1">
                          {dateObj.toLocaleDateString("tr-TR", { month: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Slots Picker */}
          {selectedDate && (
            <Card className="rounded-3xl border-muted-foreground/10 shadow-xl shadow-black/5 bg-white dark:bg-zinc-900 overflow-hidden">
              <CardHeader className="border-b dark:border-zinc-800 p-6 bg-muted/20 dark:bg-zinc-800/10">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                  <Clock className="h-5 w-5 text-primary" />
                  Saat Seçimi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {(slotsData[selectedDate] || []).map((timeStr) => {
                    const isSelected = selectedTime === timeStr;
                    return (
                      <button
                        key={timeStr}
                        type="button"
                        onClick={() => setSelectedTime(timeStr)}
                        className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                          isSelected 
                            ? "bg-primary border-primary text-white shadow-md shadow-primary/20 scale-[1.02]" 
                            : "bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {timeStr}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Booking Details Form */}
        <Card className="rounded-3xl border-muted-foreground/10 shadow-xl shadow-black/5 bg-white dark:bg-zinc-900 overflow-hidden md:sticky md:top-8">
          <CardHeader className="border-b dark:border-zinc-800 p-6 bg-muted/20 dark:bg-zinc-800/10">
            <CardTitle className="text-lg font-bold text-left text-zinc-900 dark:text-white">Randevu Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-0.5">Adınız Soyadınız</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                  <Input 
                    id="name" 
                    placeholder="Ahmet Yılmaz" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                    className="pl-11 h-12 rounded-xl focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-0.5">E-Posta Adresiniz</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="ahmet@example.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    className="pl-11 h-12 rounded-xl focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-0.5">Telefon Numaranız</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+90 555 123 4567" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className="pl-11 h-12 rounded-xl focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-0.5">Randevu Notları</Label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                  <Textarea 
                    id="notes" 
                    placeholder="Randevu ile ilgili eklemek istediğiniz detaylar..." 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    className="pl-11 pt-3.5 min-h-[90px] rounded-xl focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={submitting || !selectedDate || !selectedTime}
                className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 mt-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rezerve Ediliyor...
                  </>
                ) : (
                  "Randevuyu Onayla"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
