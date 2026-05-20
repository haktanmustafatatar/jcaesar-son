"use client";

import { useState, useEffect } from "react";
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  MoreVertical,
  Loader2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Trash,
  Settings,
  Users,
  Briefcase,
  Sliders,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
} from "date-fns";
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

export default function UserCalendarPage() {
  const t = useTranslations("Dashboard.Calendar");
  const locale = useLocale();
  const dateLocale = getLocaleObj(locale);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [chatbots, setChatbots] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Scheduling Configurations state
  const [activeChatbotId, setActiveChatbotId] = useState("");
  const [schedSettings, setSchedSettings] = useState({
    workingDays: "1,2,3,4,5",
    startHour: "09:00",
    endHour: "18:00",
    slotDuration: 60,
    staffCapacity: 3
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // New staff state
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "STAFF" });
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  const [newApp, setNewApp] = useState({
    title: "",
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    price: 0,
    contactEmail: "",
    chatbotId: "",
    staffId: ""
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [appRes, botRes, staffRes] = await Promise.all([
        fetch("/api/crm/appointments"),
        fetch("/api/chatbots"),
        fetch("/api/crm/staff")
      ]);
      
      if (appRes.ok) {
        setAppointments(await appRes.json());
      }
      if (botRes.ok) {
        const bots = await botRes.json();
        setChatbots(bots);
        if (bots.length > 0 && !activeChatbotId) {
          setActiveChatbotId(bots[0].id);
        }
      }
      if (staffRes.ok) {
        setStaff(await staffRes.json());
      }
    } catch (error) {
      toast.error("Failed to sync scheduling data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch scheduling settings whenever chatbot target changes
  useEffect(() => {
    if (!activeChatbotId) return;
    fetch(`/api/crm/appointments/settings?chatbotId=${activeChatbotId}`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) setSchedSettings(data);
      })
      .catch(() => {});
  }, [activeChatbotId]);

  const handleSaveSettings = async () => {
    if (!activeChatbotId) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/crm/appointments/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId: activeChatbotId, ...schedSettings })
      });
      if (res.ok) {
        toast.success("Schedule setting updated successfully!");
      } else {
        toast.error("Failed to update schedule bounds.");
      }
    } catch (error) {
      toast.error("Network error.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateStaff = async () => {
    if (!newStaff.name) {
      toast.error("Name is required.");
      return;
    }
    setIsAddingStaff(true);
    try {
      const res = await fetch("/api/crm/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaff)
      });
      if (res.ok) {
        toast.success("Staff member hired!");
        setNewStaff({ name: "", email: "", role: "STAFF" });
        fetchData();
      } else {
        toast.error("Failed to hire staff.");
      }
    } catch (error) {
      toast.error("Network error.");
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to dismiss this staff member?")) return;
    try {
      const res = await fetch(`/api/crm/staff?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Staff member dismissed.");
        fetchData();
      }
    } catch (error) {
      toast.error("Network error.");
    }
  };

  const handleCreateAppointment = async () => {
    if (!newApp.title || !newApp.startTime || !newApp.chatbotId) {
      toast.error("Randevu başlığı, zaman ve Ajan seçimi zorunludur.");
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/crm/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newApp)
      });
      
      if (res.ok) {
        toast.success(t("save") || "Appointment booked!");
        setIsModalOpen(false);
        setNewApp({
          title: "",
          startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          price: 0,
          contactEmail: "",
          chatbotId: "",
          staffId: ""
        });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Randevu çakışması veya kısıtlama.");
      }
    } catch (error) {
      toast.error("Network error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm(t("deleteConfirm") || "Are you sure?")) return;
    try {
      const res = await fetch(`/api/crm/appointments?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success(t("delete") || "Appointment deleted.");
        fetchData();
      }
    } catch(err) {
      toast.error("Network error.");
    }
  };

  const toggleWorkingDay = (day: string) => {
    const days = schedSettings.workingDays ? schedSettings.workingDays.split(",") : [];
    const index = days.indexOf(day);
    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(day);
    }
    setSchedSettings({ ...schedSettings, workingDays: days.sort().join(",") });
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, "d");
        const cloneDay = day;
        const dayAppointments = appointments.filter(app => isSameDay(new Date(app.startTime), cloneDay));
        
        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[140px] p-3 border-r border-b border-zinc-100 transition-all cursor-pointer hover:bg-zinc-50 relative group",
              !isSameMonth(day, monthStart) && "bg-zinc-50/30 text-zinc-300",
              isSameDay(day, selectedDate) && "bg-primary/[0.02]"
            )}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <div className="flex justify-between items-start mb-2">
               <span className={cn(
                 "text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl transition-all",
                 isSameDay(day, new Date()) ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-zinc-950"
               )}>
                 {formattedDate}
               </span>
               {dayAppointments.length > 0 && (
                 <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black h-5 px-1.5">
                   {dayAppointments.length}
                 </Badge>
               )}
            </div>
            <div className="space-y-1">
               {dayAppointments.slice(0, 2).map((app, idx) => (
                 <div key={idx} className="text-[9px] font-bold p-1.5 rounded-lg border truncate bg-white border-zinc-200 text-zinc-700 shadow-sm">
                   {format(new Date(app.startTime), "HH:mm")} - {app.title}
                 </div>
               ))}
               {dayAppointments.length > 2 && (
                 <div className="text-[8px] font-black text-zinc-400 text-center py-0.5">
                   + {dayAppointments.length - 2}
                 </div>
               )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-white rounded-[40px] border border-zinc-200 shadow-sm overflow-hidden">{rows}</div>;
  };

  const selectedDayAppointments = appointments.filter(app => isSameDay(new Date(app.startTime), selectedDate));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Syncing Calendar Systems...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-700">
      <Tabs defaultValue="calendar" className="w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-zinc-950">Capacity CRM & Takvim</h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Manage staff allocation, booking slots & working hours</p>
          </div>
          <TabsList className="bg-zinc-50 border border-zinc-100 rounded-2xl p-1 h-14 shrink-0">
            <TabsTrigger value="calendar" className="rounded-xl font-bold h-12 px-6 data-[state=active]:bg-zinc-950 data-[state=active]:text-white">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Takvim Görünümü
            </TabsTrigger>
            <TabsTrigger value="staff" className="rounded-xl font-bold h-12 px-6 data-[state=active]:bg-zinc-950 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Çalışanlar ({staff.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl font-bold h-12 px-6 data-[state=active]:bg-zinc-950 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Çalışma Saatleri
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Main Calendar & Day Booking Details */}
        <TabsContent value="calendar" className="outline-none">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              {/* Custom Calendar Month Picker Header */}
              <div className="flex items-center justify-between mb-6 bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm">
                <h3 className="text-xl font-black text-zinc-950 capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="rounded-xl border-zinc-200 h-10 w-10" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="rounded-xl border-zinc-200 font-bold h-10 px-4" onClick={() => setCurrentMonth(new Date())}>
                    Bugün
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-xl border-zinc-200 h-10 w-10" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => setIsModalOpen(true)} className="ml-4 rounded-xl bg-zinc-950 text-white font-bold h-10 px-6 hover:scale-105 transition-all">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Rezervasyon
                  </Button>
                </div>
              </div>

              {/* Day column headers */}
              <div className="grid grid-cols-7 mb-2 px-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-400 py-2">
                    {format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i), "E", { locale: dateLocale })}
                  </div>
                ))}
              </div>

              {renderCells()}
            </div>

            {/* Right sidebar: Selected day's appointment capacity flow */}
            <div className="lg:w-96 space-y-6">
              <Card className="rounded-[40px] bg-zinc-950 text-white border-none p-8 overflow-hidden relative shadow-2xl">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-[80px]" />
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Günlük Akış & Kapasite</p>
                  <h3 className="text-3xl font-black mb-1 capitalize">
                    {format(selectedDate, "dd MMMM", { locale: dateLocale })}
                  </h3>
                  <p className="text-zinc-400 font-bold text-sm">{format(selectedDate, "EEEE", { locale: dateLocale })}</p>
                </div>
              </Card>

              <div className="space-y-4">
                <h4 className="px-4 text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                  Planlanmış Randevular
                  <Badge variant="outline" className="border-zinc-200 text-zinc-500 text-[10px] font-black">
                    {selectedDayAppointments.length}
                  </Badge>
                </h4>
                
                {selectedDayAppointments.length === 0 ? (
                  <div className="p-12 bg-zinc-50 rounded-[40px] border border-dashed border-zinc-200 text-center">
                    <CalendarDays className="w-10 h-10 text-zinc-300 mx-auto mb-4" />
                    <p className="text-sm font-bold text-zinc-400">Bu gün için planlanmış randevu yok.</p>
                  </div>
                ) : (
                  selectedDayAppointments.map((app, idx) => (
                    <Card key={idx} className="rounded-[32px] border-zinc-100 hover:border-primary/20 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-500">
                              <Clock className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-zinc-950">{format(new Date(app.startTime), "HH:mm")} - {format(new Date(app.endTime), "HH:mm")}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge className={cn(
                                  "text-[8px] font-black px-1.5 h-4 border-none",
                                  app.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                )}>
                                  {app.paymentStatus === "PAID" ? "ÖDENDİ" : "ÖDENMEDİ"}
                                </Badge>
                                {app.price > 0 && <span className="text-[10px] font-black text-zinc-950">${app.price}</span>}
                              </div>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="rounded-xl h-8 w-8">
                                <MoreVertical className="w-4 h-4 text-zinc-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl">
                              <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer" onClick={() => handleDeleteAppointment(app.id)}>
                                <Trash className="w-4 h-4 mr-2" />
                                Randevuyu İptal Et
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h5 className="font-black text-zinc-950 text-sm mb-4">{app.title}</h5>
                        
                        <div className="flex flex-col gap-2 pt-4 border-t border-zinc-100 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-400">Müşteri</span>
                            <span className="font-black text-zinc-800">{app.contact?.name || "Bilinmeyen"}</span>
                          </div>
                          {app.staff && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-zinc-400 flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5" />
                                Görevli Çalışan
                              </span>
                              <Badge className="bg-zinc-100 text-zinc-800 border-none font-bold">
                                {app.staff.name}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Staff Management Panel */}
        <TabsContent value="staff" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="rounded-[40px] border-zinc-200 shadow-xl bg-white p-8 space-y-6">
              <div>
                <h3 className="text-xl font-black text-zinc-950">Çalışan Ekle</h3>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Add a new staff member to availability slots</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">İsim Soyisim</Label>
                  <Input 
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="Ahmet Yılmaz"
                    className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-Posta</Label>
                  <Input 
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    placeholder="ahmet@firma.com"
                    className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Görev / Rol</Label>
                  <Input 
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    placeholder="Uzman Terapist"
                    className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-medium"
                  />
                </div>

                <Button 
                  onClick={handleCreateStaff}
                  disabled={isAddingStaff}
                  className="w-full h-14 rounded-2xl bg-zinc-950 hover:bg-zinc-900 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-black/10 mt-6"
                >
                  {isAddingStaff && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Çalışanı Kaydet
                </Button>
              </div>
            </Card>

            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-xl font-black text-zinc-950 px-2 flex items-center justify-between">
                Aktif Çalışan Kadrosu
                <Badge className="bg-zinc-100 text-zinc-700 border-none font-black">{staff.length} Üye</Badge>
              </h3>
              
              {staff.length === 0 ? (
                <div className="p-20 bg-zinc-50 rounded-[40px] border border-zinc-200 border-dashed text-center">
                  <Users className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Henüz çalışan kaydı yapılmamış.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {staff.map((s) => (
                    <Card key={s.id} className="rounded-[32px] border-zinc-100 p-6 flex flex-col justify-between hover:shadow-xl transition-all group relative overflow-hidden bg-white">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-xl">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black text-zinc-950 text-base">{s.name}</h4>
                          <p className="text-xs font-bold text-primary uppercase mt-0.5">{s.role}</p>
                          <p className="text-xs font-medium text-zinc-400 mt-2">{s.email || "-"}</p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-6 border-t border-zinc-50 mt-6">
                        <Button 
                          onClick={() => handleDeleteStaff(s.id)}
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-4 font-bold"
                        >
                          Kadro Dışı Bırak
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Working Hours & Bounds Config Settings */}
        <TabsContent value="settings" className="outline-none">
          <Card className="rounded-[40px] border-zinc-200 shadow-xl bg-white p-10 max-w-3xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-100 pb-8 gap-4">
              <div>
                <h3 className="text-xl font-black text-zinc-950">Çalışma Saatleri & Slot Ayarları</h3>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Configure active reservation slots bounds</p>
              </div>
              <div className="w-60">
                <Select value={activeChatbotId} onValueChange={setActiveChatbotId}>
                  <SelectTrigger className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold">
                    <SelectValue placeholder="Seçili Ajan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {chatbots.map(bot => (
                      <SelectItem key={bot.id} value={bot.id} className="font-bold">{bot.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-8">
              {/* Working Days Checkbox grid */}
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Hizmet Verilen Günler</Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: "1", label: "Pzt" },
                    { id: "2", label: "Sal" },
                    { id: "3", label: "Çar" },
                    { id: "4", label: "Per" },
                    { id: "5", label: "Cum" },
                    { id: "6", label: "Cmt" },
                    { id: "7", label: "Paz" }
                  ].map((day) => {
                    const activeDays = schedSettings.workingDays ? schedSettings.workingDays.split(",") : [];
                    const isChecked = activeDays.includes(day.id);
                    return (
                      <Button
                        key={day.id}
                        type="button"
                        onClick={() => toggleWorkingDay(day.id)}
                        variant={isChecked ? "default" : "outline"}
                        className={cn(
                          "rounded-2xl font-bold h-12 px-6",
                          isChecked ? "bg-zinc-950 text-white" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                        )}
                      >
                        {day.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Working hours bound times input */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Mesai Başlangıç Saati</Label>
                  <Input 
                    value={schedSettings.startHour}
                    onChange={(e) => setSchedSettings({ ...schedSettings, startHour: e.target.value })}
                    placeholder="09:00"
                    className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Mesai Bitiş Saati</Label>
                  <Input 
                    value={schedSettings.endHour}
                    onChange={(e) => setSchedSettings({ ...schedSettings, endHour: e.target.value })}
                    placeholder="18:00"
                    className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Slot Süresi (Dakika)</Label>
                  <Input 
                    type="number"
                    value={schedSettings.slotDuration}
                    onChange={(e) => setSchedSettings({ ...schedSettings, slotDuration: Number(e.target.value) })}
                    className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Eşzamanlı Kapasite (Personel Olmadığında)</Label>
                  <Input 
                    type="number"
                    value={schedSettings.staffCapacity}
                    onChange={(e) => setSchedSettings({ ...schedSettings, staffCapacity: Number(e.target.value) })}
                    className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100">
                <Button 
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings || !activeChatbotId}
                  className="w-full h-14 rounded-2xl bg-zinc-950 hover:bg-zinc-900 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-black/10"
                >
                  {isSavingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Ayarları Güncelle
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Booking Dialog Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-[40px] max-w-lg p-8 border-none bg-white text-zinc-950 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-zinc-950">Yeni Rezervasyon Girişi</DialogTitle>
            <DialogDescription className="font-medium text-zinc-500">
              Müşteriniz için takvim randevusu oluşturun
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Randevu Başlığı</Label>
              <Input 
                value={newApp.title}
                onChange={(e) => setNewApp({...newApp, title: e.target.value})}
                placeholder="Örn: 1 Saatlik Diş Muayenesi"
                className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-medium"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Zaman & Saat</Label>
                <Input 
                  type="datetime-local"
                  value={newApp.startTime}
                  onChange={(e) => setNewApp({...newApp, startTime: e.target.value})}
                  className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Ücret (TRY)</Label>
                <Input 
                  type="number"
                  value={newApp.price}
                  onChange={(e) => setNewApp({...newApp, price: Number(e.target.value)})}
                  className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">İlişkili Sohbet Ajanı</Label>
              <Select 
                value={newApp.chatbotId}
                onValueChange={(v) => setNewApp({...newApp, chatbotId: v})}
              >
                <SelectTrigger className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold text-zinc-950">
                  <SelectValue placeholder="Lütfen bir bot seçin" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {chatbots.map(bot => (
                    <SelectItem key={bot.id} value={bot.id} className="text-zinc-950 font-bold">
                      {bot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Atanacak Çalışan (İsteğe Bağlı)</Label>
              <Select 
                value={newApp.staffId}
                onValueChange={(v) => setNewApp({...newApp, staffId: v})}
              >
                <SelectTrigger className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold text-zinc-950">
                  <SelectValue placeholder="Personel Ata (Otomatik Seçim)" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-zinc-950 font-bold">
                      {s.name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Müşteri E-Posta Adresi</Label>
              <Input 
                value={newApp.contactEmail}
                onChange={(e) => setNewApp({...newApp, contactEmail: e.target.value})}
                placeholder="musteri@mail.com"
                className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-medium"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-2xl h-12 px-6 font-bold text-zinc-500">İptal</Button>
            <Button 
              onClick={handleCreateAppointment} 
              disabled={isSaving}
              className="rounded-2xl h-12 px-8 font-black bg-zinc-950 text-white hover:bg-zinc-900 shadow-xl"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Randevuyu Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
