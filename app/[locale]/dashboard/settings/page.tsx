"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Settings2, 
  Shield, 
  Bell, 
  Globe, 
  CreditCard, 
  Save, 
  Trash2,
  Mail,
  Smartphone,
  Camera,
  Check,
  ChevronRight,
  Zap,
  Bot,
  MessageSquare,
  Lock,
  LogOut
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

export default function UserSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { signOut } = useClerk();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  const tabs = [
    { id: "profile", label: "Profile", icon: User, description: "Personal info & accounts" },
    { id: "general", label: "General", icon: Globe, description: "Platform preferences" },
    { id: "security", label: "Security", icon: Shield, description: "Password & safety" },
    { id: "billing", label: "Billing", icon: CreditCard, description: "Plans & usage" },
  ];

  const handleSendOtp = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/delete-otp", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setIsOtpSent(true);
        toast.success("Doğrulama kodu e-posta adresinize gönderildi.");
      } else {
        toast.error(data.error || "Kod gönderilemedi.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (otpValue.length < 6) return toast.error("Geçerli bir kod girin.");
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpValue }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Hesabınız başarıyla silindi.");
        setShowDeleteDialog(false);
        await signOut();
        window.location.href = "/";
      } else {
        toast.error(data.error || "Hesap silinemedi.");
      }
    } catch (e) {
      toast.error("Bağlantı hatası.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Area */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Settings</h1>
          <p className="text-muted-foreground font-medium text-sm">Manage your J.Caesar experience and account preferences.</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-xl h-11 px-6 font-semibold border-muted-foreground/10">
              Discard
           </Button>
           <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20">
             <Save className="mr-2 h-4 w-4" />
             Save All Changes
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 items-start">
        {/* Elite Sidebar Navigation */}
        <div className="space-y-6 sticky top-4">
           <div className="flex flex-col gap-1 p-2 bg-muted/30 rounded-3xl border border-muted-foreground/5">
             {tabs.map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`
                   group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 relative overflow-hidden
                   ${activeTab === tab.id 
                     ? "bg-white text-primary shadow-xl shadow-black/5" 
                     : "text-muted-foreground hover:bg-white/50 hover:text-zinc-600"}
                 `}
               >
                 {activeTab === tab.id && (
                   <motion.div 
                     layoutId="tab-indicator"
                     className="absolute left-0 w-1.5 h-6 bg-primary rounded-r-full" 
                   />
                 )}
                 <div className={`
                    p-2.5 rounded-xl transition-colors
                    ${activeTab === tab.id ? "bg-primary/5" : "bg-muted/50 group-hover:bg-white"}
                 `}>
                   <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`} />
                 </div>
                 <div className="flex flex-col items-start transition-transform group-active:scale-95">
                   <span className="text-sm font-bold tracking-tight leading-none mb-1">{tab.label}</span>
                   <span className="text-[10px] font-medium opacity-60 leading-none">{tab.description}</span>
                 </div>
               </button>
             ))}
           </div>

           <Card className="rounded-3xl bg-zinc-950 text-white overflow-hidden border-none shadow-2xl">
             <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 blur-3xl" />
                <div className="relative z-10 space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                     <h3 className="text-sm font-bold">Planınız Aktif</h3>
                     <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">Bir sonraki yenileme tarihiniz Mayıs 12, 2024.</p>
                  </div>
                  <Button size="sm" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 text-[11px] font-bold h-9 rounded-xl">
                    View Billing
                  </Button>
                </div>
             </CardContent>
           </Card>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {activeTab === "profile" && (
              <div className="space-y-8">
                {/* Avatar Section */}
                <Card className="rounded-[32px] border-muted-foreground/10 shadow-xl shadow-black/5 overflow-hidden">
                   <div className="h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-zinc-100" />
                   <CardContent className="px-8 pb-10 -mt-12 relative z-10">
                      <div className="flex flex-col items-center md:flex-row md:items-end gap-6 text-center md:text-left">
                         <div className="relative group cursor-pointer">
                            <div className="w-32 h-32 rounded-[40px] bg-white p-2 shadow-2xl overflow-hidden ring-4 ring-white">
                               <img 
                                 src="https://api.dicebear.com/7.x/avataaars/svg?seed=Haktan" 
                                 alt="Avatar" 
                                 className="w-full h-full object-cover rounded-[32px]"
                               />
                            </div>
                            <div className="absolute inset-2 bg-black/40 backdrop-blur-[2px] rounded-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                               <Camera className="w-8 h-8 text-white" />
                            </div>
                         </div>
                         <div className="flex-1 space-y-1 mb-2">
                            <h2 className="text-2xl font-bold tracking-tight">Haktan Mustafa Tatar</h2>
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                               <Mail className="w-4 h-4" />
                               haktan@jcaesar.ai
                            </p>
                         </div>
                         <Button variant="outline" className="mb-2 rounded-xl h-10 px-6 font-bold border-muted-foreground/10">
                            Upload New
                         </Button>
                      </div>
                   </CardContent>
                </Card>

                {/* Info Fields */}
                <Card className="rounded-[32px] border-muted-foreground/10 shadow-xl shadow-black/5">
                   <CardContent className="p-8 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">First Name</Label>
                            <Input placeholder="John" defaultValue="Haktan Mustafa" className="h-12 rounded-xl focus-visible:ring-primary/20 transition-all" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Last Name</Label>
                            <Input placeholder="Doe" defaultValue="Tatar" className="h-12 rounded-xl focus-visible:ring-primary/20 transition-all" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Email Address</Label>
                            <Input type="email" defaultValue="haktan@jcaesar.ai" className="h-12 rounded-xl focus-visible:ring-primary/20 transition-all" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Organization</Label>
                            <Input defaultValue="J.Caesar AI Lab" className="h-12 rounded-xl focus-visible:ring-primary/20 transition-all" />
                         </div>
                      </div>

                      <div className="pt-8 border-t space-y-4">
                         <div className="flex items-center justify-between">
                            <div className="space-y-1">
                               <h4 className="text-sm font-bold">Public Profile</h4>
                               <p className="text-[11px] text-muted-foreground font-medium">Show your profile in the directory.</p>
                            </div>
                            <Switch defaultChecked />
                         </div>
                      </div>
                   </CardContent>
                </Card>

                <Card className="rounded-[32px] border-destructive/20 bg-destructive/5 shadow-none overflow-hidden group">
                   <CardContent className="p-8 flex items-center justify-between">
                      <div className="space-y-1">
                         <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            Delete Account
                         </h4>
                         <p className="text-[11px] text-destructive/70 font-medium max-w-[400px]">
                            Permanently delete your account and all associated chatbots. This action cannot be undone.
                         </p>
                      </div>
                      <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="rounded-xl px-6 h-10 font-bold opacity-80 hover:opacity-100 shadow-lg shadow-destructive/20">
                         Delete
                      </Button>
                   </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "general" && (
              <Card className="rounded-[40px] border-muted-foreground/10 shadow-xl shadow-black/5">
                <CardContent className="p-10 space-y-10">
                   <div className="space-y-6">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Interface Theme</Label>
                      <div className="grid grid-cols-3 gap-6">
                         <Button variant="outline" className="h-32 rounded-3xl flex flex-col gap-3 border-2 border-primary bg-primary/5">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                               <Globe className="w-6 h-6 text-primary" />
                            </div>
                            <span className="font-bold text-xs">Light Mode</span>
                         </Button>
                         <Button variant="outline" className="h-32 rounded-3xl flex flex-col gap-3 border-2 border-transparent bg-zinc-950 text-white hover:bg-zinc-900 transition-all opacity-50 grayscale hover:grayscale-0">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center ring-1 ring-white/10">
                               <Lock className="w-6 h-6 text-white" />
                            </div>
                            <span className="font-bold text-xs">Dark Mode</span>
                         </Button>
                         <Button variant="outline" className="h-32 rounded-3xl flex flex-col gap-3 border-2 border-transparent bg-muted/40 opacity-40">
                            <div className="w-12 h-12 rounded-2xl bg-muted-foreground/20 flex items-center justify-center">
                               <Settings2 className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <span className="font-bold text-xs">System</span>
                         </Button>
                      </div>
                   </div>

                   <div className="space-y-8 pt-10 border-t border-muted/60">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Notification Settings</h3>
                      <div className="space-y-4">
                         {[
                           { title: "Conversation Alerts", desc: "Get notified when a customer initiates a chat.", icon: MessageSquare },
                           { title: "Bot Health Checks", desc: "Weekly summaries of bot efficiency and uptime.", icon: Bot },
                           { title: "Platform Updates", desc: "New features and maintenance announcements.", icon: Zap },
                         ].map((item, i) => (
                           <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors border border-black/[0.03]">
                             <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-black/[0.05]">
                                   <item.icon className="w-5 h-5 text-zinc-600" />
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-sm font-bold">{item.title}</p>
                                   <p className="text-[11px] text-muted-foreground font-medium">{item.desc}</p>
                                </div>
                             </div>
                             <Switch defaultChecked={i < 2} />
                           </div>
                         ))}
                      </div>
                   </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "billing" && (
               <div className="space-y-8">
                  {/* Elite Usage Meter Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <Card className="rounded-[36px] bg-white border-muted-foreground/10 shadow-xl shadow-black/5 overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                           <div className="flex items-center justify-between">
                              <div className="p-3 bg-emerald-50 rounded-2xl">
                                 <MessageSquare className="w-6 h-6 text-emerald-600" />
                              </div>
                              <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg">KULLANIM: %82</span>
                           </div>
                           <div className="space-y-2">
                              <div className="flex items-end justify-between px-1">
                                 <h3 className="text-lg font-bold">AI Messages</h3>
                                 <span className="text-xs font-bold text-muted-foreground">8,241 / 10,000</span>
                              </div>
                              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: "82%" }}
                                   transition={{ duration: 1.5, ease: "easeOut" }}
                                   className="h-full bg-emerald-500 rounded-full" 
                                 />
                              </div>
                              <p className="text-[11px] text-muted-foreground font-medium px-1">Resets in 14 days.</p>
                           </div>
                        </CardContent>
                     </Card>

                     <Card className="rounded-[36px] bg-white border-muted-foreground/10 shadow-xl shadow-black/5 overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                           <div className="flex items-center justify-between">
                              <div className="p-3 bg-blue-50 rounded-2xl">
                                 <Bot className="w-6 h-6 text-blue-600" />
                              </div>
                              <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg">KULLANIM: %40</span>
                           </div>
                           <div className="space-y-2">
                              <div className="flex items-end justify-between px-1">
                                 <h3 className="text-lg font-bold">Active Chatbots</h3>
                                 <span className="text-xs font-bold text-muted-foreground">2 / 5 Bots</span>
                              </div>
                              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: "40%" }}
                                   transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                   className="h-full bg-blue-500 rounded-full" 
                                 />
                              </div>
                              <p className="text-[11px] text-muted-foreground font-medium px-1 underline cursor-pointer hover:text-primary">Upgrade limit →</p>
                           </div>
                        </CardContent>
                     </Card>
                  </div>

                  <Card className="rounded-[40px] bg-zinc-950 text-white border-none shadow-2xl overflow-hidden relative group">
                     {/* Decorative Gradients */}
                     <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-all duration-700" />
                     <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 blur-[100px] translate-y-1/2 -translate-x-1/2" />
                     
                     <CardContent className="p-12 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                           <div className="space-y-6">
                              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/20 rounded-full border border-primary/20">
                                 <Zap className="w-4 h-4 text-primary fill-primary" />
                                 <span className="text-[11px] font-bold text-primary uppercase tracking-widest">Active Plan: Pro</span>
                              </div>
                              <div className="space-y-3">
                                 <h3 className="text-4xl font-bold tracking-tight">Focus on growth, we scale with you.</h3>
                                 <p className="text-zinc-400 max-w-[450px] font-medium leading-relaxed">
                                   You are currently subscribed to the Pro Plan. Enjoy unlimited training sources, priority support, and custom CSS for your widgets.
                                 </p>
                              </div>
                              <div className="flex gap-4 pt-4">
                                 <Button className="bg-white text-zinc-950 hover:bg-zinc-200 px-8 h-12 rounded-2xl font-bold shadow-xl shadow-white/5">
                                    Manage Plan
                                 </Button>
                                 <Button variant="ghost" className="text-zinc-400 hover:text-white h-12 px-6 font-bold">
                                    View Invoices
                                 </Button>
                              </div>
                           </div>

                           <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-[40px] border border-white/10 backdrop-blur-xl min-w-[240px]">
                              <span className="text-sm font-bold text-zinc-400 mb-1">Faturalandırma</span>
                              <p className="text-3xl font-bold">Aylık</p>
                              <div className="w-full h-px bg-white/10 my-6" />
                              <span className="text-sm font-bold text-primary mb-1">Sonraki Ödeme</span>
                              <p className="text-xl font-bold">12 Mayıs 2024</p>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               </div>
            )}

            {activeTab === "security" && (
               <Card className="rounded-[40px] border-muted-foreground/10 shadow-xl shadow-black/5">
                 <CardContent className="p-10 space-y-10">
                    <div className="flex items-center gap-6">
                       <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center border border-amber-100">
                          <Shield className="w-10 h-10 text-amber-600" />
                       </div>
                       <div className="space-y-1">
                          <h3 className="text-xl font-bold tracking-tight">Security & Privacy</h3>
                          <p className="text-sm text-muted-foreground font-medium">Protect your data and manage account access.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                       <div className="p-8 rounded-[32px] bg-muted/20 border border-black/[0.03] space-y-4 hover:bg-muted/30 transition-all cursor-pointer group">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Lock className="w-5 h-5 text-zinc-600" />
                          </div>
                          <div className="space-y-1">
                             <h4 className="font-bold text-sm">Change Password</h4>
                             <p className="text-[11px] text-muted-foreground font-medium">Update your account password regularly.</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:translate-x-1 transition-transform" />
                       </div>

                       <div className="p-8 rounded-[32px] bg-muted/20 border border-black/[0.03] space-y-4 hover:bg-muted/30 transition-all cursor-pointer group">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Smartphone className="h-5 w-5 text-zinc-600" />
                          </div>
                          <div className="space-y-1">
                             <h4 className="font-bold text-sm">Two-Factor (2FA)</h4>
                             <p className="text-[11px] text-muted-foreground font-medium text-amber-600 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Disabled
                             </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:translate-x-1 transition-transform" />
                       </div>
                    </div>

                    <div className="pt-10 border-t border-muted/60 space-y-6">
                       <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">Active Sessions</h3>
                       <div className="space-y-3">
                          <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-black/[0.02]">
                             <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-zinc-950 rounded-xl">
                                   <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                   <p className="text-sm font-bold">MacBook Pro · Istanbul, TR</p>
                                   <p className="text-[10px] text-muted-foreground font-medium italic">Current session · Chrome 123.0</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">Live</span>
                                <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-destructive">Revoke</Button>
                             </div>
                          </div>
                       </div>
                    </div>
                 </CardContent>
               </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={(open) => !isDeleting && setShowDeleteDialog(open)}>
        <DialogContent className="sm:max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Hesabı Sil</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Devam etmek için e-posta adresinize gönderilen 6 haneli onay kodunu girin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!isOtpSent ? (
               <div className="space-y-4 text-sm text-muted-foreground">
                 <p>Hesabınızı silmek için e-posta adresinize bir doğrulama kodu göndereceğiz.</p>
                 <Button onClick={handleSendOtp} disabled={isDeleting} className="w-full h-11 rounded-xl">
                   {isDeleting ? "Gönderiliyor..." : "Doğrulama Kodu Gönder"}
                 </Button>
               </div>
            ) : (
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label>Doğrulama Kodu</Label>
                   <Input 
                     value={otpValue} 
                     onChange={e => setOtpValue(e.target.value)} 
                     placeholder="123456" 
                     maxLength={6}
                     className="text-center text-2xl tracking-[0.5em] h-14 font-mono"
                   />
                 </div>
                 <Button onClick={handleConfirmDelete} disabled={isDeleting || otpValue.length < 6} variant="destructive" className="w-full h-11 rounded-xl">
                   {isDeleting ? "Siliniyor..." : "Hesabımı Kalıcı Olarak Sil"}
                 </Button>
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
