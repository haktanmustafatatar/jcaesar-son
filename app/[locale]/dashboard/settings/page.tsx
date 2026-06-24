"use client";

import { useState, useEffect } from "react";
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
  LogOut,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import Link from "next/link";

export default function UserSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { signOut, client } = useClerk();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  // Edit states for user profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password update states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Notification Preferences states
  const [conversationAlerts, setConversationAlerts] = useState(true);
  const [botHealthChecks, setBotHealthChecks] = useState(true);
  const [platformUpdates, setPlatformUpdates] = useState(true);

  // Billing states
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isManagingPlan, setIsManagingPlan] = useState(false);
  const [isBuyingCredits, setIsBuyingCredits] = useState(false);

  // Clerk Active Sessions states
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // 2FA enrollment states
  const [totpSecret, setTotpSecret] = useState<any>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isEnrolling2fa, setIsEnrolling2fa] = useState(false);
  const [show2faDialog, setShow2faDialog] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  // Load notification preferences
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await fetch("/api/user/preferences");
        if (res.ok) {
          const data = await res.json();
          setConversationAlerts(data.conversationAlerts);
          setBotHealthChecks(data.botHealthChecks);
          setPlatformUpdates(data.platformUpdates);
        }
      } catch (err) {
        console.error("[Preferences] Error loading preferences:", err);
      }
    };
    fetchPrefs();
  }, []);

  // Load billing details
  useEffect(() => {
    const fetchBilling = async () => {
      try {
        setIsLoadingBilling(true);
        const res = await fetch("/api/user/billing");
        if (res.ok) {
          const data = await res.json();
          setBillingInfo(data);
        }
      } catch (err) {
        console.error("[Billing] Error loading billing:", err);
      } finally {
        setIsLoadingBilling(false);
      }
    };
    fetchBilling();
  }, []);

  // Load Clerk user sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      try {
        const sessions = await user.getSessions();
        setActiveSessions(sessions);
      } catch (err) {
        console.error("[Sessions] Error fetching sessions:", err);
      }
    };
    fetchSessions();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await user.update({
        firstName,
        lastName
      });
      toast.success("Profil başarıyla güncellendi.");
    } catch (err: any) {
      toast.error(err.message || "Profil güncellenemedi.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePreference = async (key: string, value: boolean) => {
    try {
      // Optimistic update
      if (key === "conversationAlerts") setConversationAlerts(value);
      if (key === "botHealthChecks") setBotHealthChecks(value);
      if (key === "platformUpdates") setPlatformUpdates(value);

      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });

      if (!res.ok) {
        throw new Error("API error");
      }
      toast.success("Tercihler güncellendi.");
    } catch (err) {
      toast.error("Tercihler güncellenemedi.");
      // Revert on error
      if (key === "conversationAlerts") setConversationAlerts(!value);
      if (key === "botHealthChecks") setBotHealthChecks(!value);
      if (key === "platformUpdates") setPlatformUpdates(!value);
    }
  };

  const handleManagePlan = async () => {
    setIsManagingPlan(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Müşteri portalına yönlendirilemedi.");
      }
    } catch (err) {
      toast.error("İşlem gerçekleştirilemedi.");
    } finally {
      setIsManagingPlan(false);
    }
  };

  const handleBuyCredits = async () => {
    setIsBuyingCredits(true);
    try {
      const res = await fetch("/api/stripe/extra-credits", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Ödeme oturumu başlatılamadı.");
      }
    } catch (err) {
      toast.error("İşlem gerçekleştirilemedi.");
    } finally {
      setIsBuyingCredits(false);
    }
  };

  const handleEnable2fa = async () => {
    if (!user) return;
    setIsEnrolling2fa(true);
    try {
      const totp = await user.createTOTP();
      setTotpSecret(totp);
      setShow2faDialog(true);
    } catch (err: any) {
      toast.error(err.message || "MFA kurulumu başlatılamadı.");
    } finally {
      setIsEnrolling2fa(false);
    }
  };

  const handleVerify2fa = async () => {
    if (!user || !totpSecret) return;
    if (totpCode.length < 6) return toast.error("Geçerli bir kod girin.");
    setIsEnrolling2fa(true);
    try {
      await user.verifyTOTP({ code: totpCode });
      toast.success("2FA (İki Aşamalı Doğrulama) başarıyla etkinleştirildi!");
      setShow2faDialog(false);
      setTotpSecret(null);
      setTotpCode("");
    } catch (err: any) {
      toast.error(err.message || err.errors?.[0]?.message || "Doğrulama kodu geçersiz.");
    } finally {
      setIsEnrolling2fa(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const sessionToRevoke = activeSessions.find(s => s.id === sessionId);
      if (sessionToRevoke) {
        await sessionToRevoke.revoke();
        toast.success("Oturum sonlandırıldı.");
        const sessions = await user?.getSessions();
        if (sessions) setActiveSessions(sessions);
      }
    } catch (err) {
      toast.error("Oturum sonlandırılamadı.");
    }
  };

  const handleSaveAll = async () => {
    if (activeTab === "profile") {
      await handleSaveProfile();
    } else {
      toast.info("Bu sekmedeki değişiklikler otomatik olarak kaydedilmektedir.");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading("Avatar yükleniyor...");
      await user?.setProfileImage({ file });
      toast.dismiss();
      toast.success("Avatar başarıyla güncellendi.");
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Avatar güncellenemedi.");
    }
  };

  const triggerAvatarUpload = () => {
    document.getElementById("avatar-upload")?.click();
  };

  const handleUpdatePassword = async () => {
    if (!user) return;
    if (!currentPassword || !newPassword) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await user.updatePassword({
        currentPassword,
        newPassword
      });
      toast.success("Şifre başarıyla güncellendi.");
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || err.message || "Şifre güncellenemedi.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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

  const tabs = [
    { id: "profile", label: "Profile", icon: User, description: "Personal info & accounts" },
    { id: "general", label: "General", icon: Globe, description: "Platform preferences" },
    { id: "security", label: "Security", icon: Shield, description: "Password & safety" },
    { id: "billing", label: "Billing", icon: CreditCard, description: "Plans & usage" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        id="avatar-upload"
        className="hidden"
        accept="image/*"
        onChange={handleAvatarChange}
      />

      {/* Header Area */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Settings</h1>
          <p className="text-muted-foreground font-medium text-sm">Manage your J.Caesar experience and account preferences.</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-xl h-11 px-6 font-semibold border-muted-foreground/10" onClick={() => {
             if (user) {
               setFirstName(user.firstName || "");
               setLastName(user.lastName || "");
             }
           }}>
              Discard
           </Button>
           <Button 
             className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20"
             onClick={handleSaveAll}
             disabled={isSavingProfile}
           >
             {isSavingProfile ? (
               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             ) : (
               <Save className="mr-2 h-4 w-4" />
             )}
             Save Changes
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 items-start">
        {/* Elite Sidebar Navigation */}
        <div className="space-y-6 sticky top-4">
           <div className="flex flex-col gap-1 p-2 bg-muted/30 dark:bg-zinc-900/50 rounded-3xl border border-muted-foreground/5">
             {tabs.map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`
                   group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 relative overflow-hidden
                   ${activeTab === tab.id 
                     ? "bg-white dark:bg-zinc-800 text-primary dark:text-white shadow-xl shadow-black/5" 
                     : "text-muted-foreground hover:bg-white/50 dark:hover:bg-zinc-800/30 hover:text-zinc-600 dark:hover:text-zinc-300"}
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
                    ${activeTab === tab.id ? "bg-primary/5" : "bg-muted/50 dark:bg-zinc-800 group-hover:bg-white dark:group-hover:bg-zinc-700"}
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
                     <h3 className="text-sm font-bold">Plan: {billingInfo?.plan?.name || "Yükleniyor..."}</h3>
                     {billingInfo?.subscription?.currentPeriodEnd && (
                       <p className="text-[10px] text-zinc-400 font-medium leading-relaxed font-mono">
                         Yenileme: {new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString()}
                       </p>
                     )}
                  </div>
                  <Button size="sm" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 text-[11px] font-bold h-9 rounded-xl" onClick={() => setActiveTab("billing")}>
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
                   <div className="h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-zinc-100 dark:to-zinc-800" />
                   <CardContent className="px-8 pb-10 -mt-12 relative z-10">
                      <div className="flex flex-col items-center md:flex-row md:items-end gap-6 text-center md:text-left">
                         <div className="relative group cursor-pointer" onClick={triggerAvatarUpload}>
                            <div className="w-32 h-32 rounded-[40px] bg-white dark:bg-zinc-900 p-2 shadow-2xl overflow-hidden ring-4 ring-white dark:ring-zinc-950">
                               <img 
                                 src={user?.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.firstName || "JCaesar"}`} 
                                 alt="Avatar" 
                                 className="w-full h-full object-cover rounded-[32px]"
                               />
                            </div>
                            <div className="absolute inset-2 bg-black/40 backdrop-blur-[2px] rounded-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                               <Camera className="w-8 h-8 text-white" />
                            </div>
                         </div>
                         <div className="flex-1 space-y-1 mb-2">
                            <h2 className="text-2xl font-bold tracking-tight">{user?.firstName} {user?.lastName}</h2>
                            <p className="text-sm font-medium text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                               <Mail className="w-4 h-4" />
                               {user?.primaryEmailAddress?.emailAddress}
                            </p>
                         </div>
                         <Button variant="outline" className="mb-2 rounded-xl h-10 px-6 font-bold border-muted-foreground/10" onClick={triggerAvatarUpload}>
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
                            <Input placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="h-12 rounded-xl focus-visible:ring-primary/20 transition-all" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Last Name</Label>
                            <Input placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className="h-12 rounded-xl focus-visible:ring-primary/20 transition-all" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Email Address</Label>
                            <Input type="email" value={user?.primaryEmailAddress?.emailAddress || ""} readOnly className="h-12 rounded-xl bg-muted/50 cursor-not-allowed focus-visible:ring-primary/20 transition-all" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Organization</Label>
                            <Input defaultValue="J.Caesar AI Lab" readOnly className="h-12 rounded-xl bg-muted/50 cursor-not-allowed focus-visible:ring-primary/20 transition-all" />
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
                         <Button 
                           variant="outline" 
                           onClick={() => setTheme("light")}
                           className={`h-32 rounded-3xl flex flex-col gap-3 border-2 transition-all ${
                             theme === "light" 
                               ? "border-primary bg-primary/5" 
                               : "border-transparent opacity-65 hover:opacity-100"
                           }`}
                         >
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center border">
                               <Globe className="w-6 h-6 text-primary" />
                            </div>
                            <span className="font-bold text-xs text-zinc-800">Light Mode</span>
                         </Button>
                         <Button 
                           variant="outline" 
                           onClick={() => setTheme("dark")}
                           className={`h-32 rounded-3xl flex flex-col gap-3 border-2 transition-all ${
                             theme === "dark" 
                               ? "border-primary bg-primary/5 text-white" 
                               : "border-transparent opacity-65 hover:opacity-100 bg-zinc-950 text-white"
                           }`}
                         >
                            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center ring-1 ring-white/10">
                               <Lock className="w-6 h-6 text-white" />
                            </div>
                            <span className="font-bold text-xs text-white">Dark Mode</span>
                         </Button>
                         <Button 
                           variant="outline" 
                           onClick={() => setTheme("system")}
                           className={`h-32 rounded-3xl flex flex-col gap-3 border-2 transition-all ${
                             theme === "system" 
                               ? "border-primary bg-primary/5" 
                               : "border-transparent opacity-65 hover:opacity-100 bg-muted/45"
                           }`}
                         >
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
                           { key: "conversationAlerts", title: "Conversation Alerts", desc: "Get notified when a customer initiates a chat.", icon: MessageSquare, state: conversationAlerts },
                           { key: "botHealthChecks", title: "Bot Health Checks", desc: "Weekly summaries of bot efficiency and uptime.", icon: Bot, state: botHealthChecks },
                           { key: "platformUpdates", title: "Platform Updates", desc: "New features and maintenance announcements.", icon: Zap, state: platformUpdates },
                         ].map((item) => (
                           <div key={item.key} className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors border border-black/[0.03]">
                             <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-black/[0.05]">
                                   <item.icon className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                                </div>
                                <div className="space-y-0.5 text-left">
                                   <p className="text-sm font-bold">{item.title}</p>
                                   <p className="text-[11px] text-muted-foreground font-medium">{item.desc}</p>
                                </div>
                             </div>
                             <Switch 
                               checked={item.state} 
                               onCheckedChange={(checked) => handleUpdatePreference(item.key, checked)}
                             />
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
                     <Card className="rounded-[36px] bg-white dark:bg-zinc-900 border-muted-foreground/10 shadow-xl shadow-black/5 overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                           <div className="flex items-center justify-between">
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                                 <MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg">
                                 KULLANIM: {billingInfo?.limits?.messageLimit ? Math.round((billingInfo.limits.messageUsage / billingInfo.limits.messageLimit) * 100) : 0}%
                              </span>
                           </div>
                           <div className="space-y-2 text-left">
                              <div className="flex items-end justify-between px-1">
                                 <h3 className="text-lg font-bold">AI Messages</h3>
                                 <span className="text-xs font-bold text-muted-foreground">
                                   {billingInfo?.limits?.messageUsage?.toLocaleString() || 0} / {billingInfo?.limits?.messageLimit?.toLocaleString() || 0}
                                 </span>
                              </div>
                              <div className="h-3 w-full bg-muted dark:bg-zinc-800 rounded-full overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${billingInfo?.limits?.messageLimit ? Math.min(100, (billingInfo.limits.messageUsage / billingInfo.limits.messageLimit) * 100) : 0}%` }}
                                   transition={{ duration: 1.5, ease: "easeOut" }}
                                   className="h-full bg-emerald-500 rounded-full" 
                                  />
                              </div>
                              <div className="flex items-center justify-between mt-1 px-1">
                                <p className="text-[11px] text-muted-foreground font-medium">Resets on period renewal.</p>
                                <Button 
                                  onClick={handleBuyCredits} 
                                  disabled={isBuyingCredits}
                                  variant="link" 
                                  className="h-auto p-0 text-[11px] font-bold text-primary hover:text-primary/80"
                                >
                                  {isBuyingCredits ? "Yükleniyor..." : "Ek Mesaj Satın Al (+1000) →"}
                                </Button>
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     <Card className="rounded-[36px] bg-white dark:bg-zinc-900 border-muted-foreground/10 shadow-xl shadow-black/5 overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                           <div className="flex items-center justify-between">
                              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
                                 <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                                 KULLANIM: {billingInfo?.limits?.chatbotLimit ? Math.round((billingInfo.limits.chatbotCount / billingInfo.limits.chatbotLimit) * 100) : 0}%
                              </span>
                           </div>
                           <div className="space-y-2 text-left">
                              <div className="flex items-end justify-between px-1">
                                 <h3 className="text-lg font-bold">Active Chatbots</h3>
                                 <span className="text-xs font-bold text-muted-foreground">
                                   {billingInfo?.limits?.chatbotCount || 0} / {billingInfo?.limits?.chatbotLimit || 0} Bots
                                 </span>
                              </div>
                              <div className="h-3 w-full bg-muted dark:bg-zinc-800 rounded-full overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${billingInfo?.limits?.chatbotLimit ? Math.min(100, (billingInfo.limits.chatbotCount / billingInfo.limits.chatbotLimit) * 100) : 0}%` }}
                                   transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                   className="h-full bg-blue-500 rounded-full" 
                                   />
                              </div>
                              <p className="text-[11px] text-muted-foreground font-medium px-1 pt-1">Limit based on subscription tier.</p>
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
                           <div className="space-y-6 text-left">
                              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/20 rounded-full border border-primary/20">
                                 <Zap className="w-4 h-4 text-primary fill-primary" />
                                 <span className="text-[11px] font-bold text-primary uppercase tracking-widest">
                                   Active Plan: {billingInfo?.plan?.name || "Free"}
                                 </span>
                              </div>
                              <div className="space-y-3">
                                 <h3 className="text-4xl font-bold tracking-tight">Focus on growth, we scale with you.</h3>
                                 <p className="text-zinc-400 max-w-[450px] font-medium leading-relaxed">
                                   You are currently subscribed to the {billingInfo?.plan?.name || "Free"} Plan. Upgrade or manage your parameters to scale customer service automation instantly.
                                 </p>
                              </div>
                              <div className="flex gap-4 pt-4">
                                 <Button 
                                   onClick={handleManagePlan} 
                                   disabled={isManagingPlan}
                                   className="bg-white text-zinc-950 hover:bg-zinc-200 px-8 h-12 rounded-2xl font-bold shadow-xl shadow-white/5"
                                 >
                                    {isManagingPlan ? "Yönlendiriliyor..." : "Manage Plan"}
                                 </Button>
                              </div>
                           </div>

                           <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-[40px] border border-white/10 backdrop-blur-xl min-w-[240px]">
                              <span className="text-sm font-bold text-zinc-400 mb-1">Faturalandırma</span>
                              <p className="text-3xl font-bold">Aylık</p>
                              <div className="w-full h-px bg-white/10 my-6" />
                              <span className="text-sm font-bold text-primary mb-1">Yenileme Tarihi</span>
                              <p className="text-xl font-bold font-mono">
                                {billingInfo?.subscription?.currentPeriodEnd 
                                  ? new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString()
                                  : "N/A"}
                              </p>
                           </div>
                        </div>
                     </CardContent>
                  </Card>

                  {/* Render Recent Invoices */}
                  {billingInfo?.invoices && billingInfo.invoices.length > 0 && (
                    <div className="space-y-4 mt-8 text-left">
                       <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">Recent Invoices</h4>
                       <div className="bg-white dark:bg-zinc-900 border border-muted-foreground/10 rounded-2xl overflow-hidden shadow-sm">
                         <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse text-sm">
                             <thead>
                               <tr className="border-b dark:border-zinc-800 bg-muted/30 dark:bg-zinc-800/40">
                                 <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Invoice Number</th>
                                 <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Date</th>
                                 <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Amount</th>
                                 <th className="p-4 font-bold text-xs text-muted-foreground uppercase">Status</th>
                                 <th className="p-4 font-bold text-xs text-muted-foreground uppercase text-right">PDF</th>
                               </tr>
                             </thead>
                             <tbody>
                               {billingInfo.invoices.map((inv: any) => (
                                 <tr key={inv.id} className="border-b last:border-0 dark:border-zinc-800 hover:bg-muted/10 dark:hover:bg-zinc-800/20">
                                   <td className="p-4 font-semibold">{inv.number || "Draft"}</td>
                                   <td className="p-4 text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</td>
                                   <td className="p-4 font-mono font-bold">{inv.total.toFixed(2)} {inv.currency}</td>
                                   <td className="p-4">
                                     <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                       inv.status === "paid" 
                                         ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30" 
                                         : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30"
                                     }`}>
                                       {inv.status}
                                     </span>
                                   </td>
                                   <td className="p-4 text-right">
                                     {inv.invoicePdf ? (
                                       <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold text-xs">
                                         Download
                                       </a>
                                     ) : (
                                       "-"
                                     )}
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>
                    </div>
                  )}
               </div>
            )}

            {activeTab === "security" && (
               <Card className="rounded-[40px] border-muted-foreground/10 shadow-xl shadow-black/5">
                 <CardContent className="p-10 space-y-10">
                    <div className="flex items-center gap-6">
                       <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center border border-amber-100 dark:border-amber-900/20">
                          <Shield className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                       </div>
                       <div className="space-y-1 text-left">
                          <h3 className="text-xl font-bold tracking-tight">Security & Privacy</h3>
                          <p className="text-sm text-muted-foreground font-medium">Protect your data and manage account access.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                       <div 
                         onClick={() => setShowPasswordDialog(true)}
                         className="p-8 rounded-[32px] bg-muted/20 hover:bg-muted/30 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/60 border border-black/[0.03] dark:border-white/[0.02] space-y-4 transition-all cursor-pointer group text-left"
                       >
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform border dark:border-zinc-800">
                             <Lock className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                          </div>
                          <div className="space-y-1">
                             <h4 className="font-bold text-sm">Change Password</h4>
                             <p className="text-[11px] text-muted-foreground font-medium">Update your account password regularly.</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:translate-x-1 transition-transform" />
                       </div>

                       <div 
                         onClick={handleEnable2fa}
                         className="p-8 rounded-[32px] bg-muted/20 hover:bg-muted/30 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/60 border border-black/[0.03] dark:border-white/[0.02] space-y-4 transition-all cursor-pointer group text-left"
                       >
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform border dark:border-zinc-800">
                             <Smartphone className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                          </div>
                          <div className="space-y-1">
                             <h4 className="font-bold text-sm">Two-Factor (2FA)</h4>
                             <p className={`text-[11px] font-bold flex items-center gap-1 ${
                               user?.twoFactorEnabled ? "text-emerald-600" : "text-amber-600"
                             }`}>
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                  user?.twoFactorEnabled ? "bg-emerald-500" : "bg-amber-500"
                                }`} />
                                {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
                             </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:translate-x-1 transition-transform" />
                       </div>
                    </div>

                    <div className="pt-10 border-t border-muted/60 space-y-6 text-left">
                       <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">Active Sessions</h3>
                       <div className="space-y-3">
                          {activeSessions.map((session) => {
                            const isCurrent = session.id === client?.activeSessions[0]?.id;
                            const browserName = session.latestActivity?.browserName || "Unknown Browser";
                            const osName = session.latestActivity?.osName || "Unknown OS";
                            const ipAddress = session.latestActivity?.ipAddress || "Unknown IP";
                            
                            return (
                              <div key={session.id} className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 dark:bg-zinc-800/20 border border-black/[0.02] dark:border-white/[0.02]">
                                 <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-zinc-950 rounded-xl">
                                       <Globe className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold">{osName} · {ipAddress}</p>
                                       <p className="text-[10px] text-muted-foreground font-medium italic">
                                         {isCurrent ? "Current session" : "Other session"} · {browserName}
                                       </p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/30">
                                      {session.status === "active" ? "Live" : session.status}
                                    </span>
                                    {!isCurrent && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleRevokeSession(session.id)}
                                        className="h-8 text-zinc-400 hover:text-destructive"
                                      >
                                        Revoke
                                      </Button>
                                    )}
                                 </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                 </CardContent>
               </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Delete Account Dialog */}
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

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => !isUpdatingPassword && setShowPasswordDialog(open)}>
        <DialogContent className="sm:max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Şifre Değiştir</DialogTitle>
            <DialogDescription>
              Güvenliğiniz için mevcut şifrenizi ve yeni şifrenizi girin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mevcut Şifre</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-xl"
              />
            </div>
            <Button 
              onClick={handleUpdatePassword} 
              disabled={isUpdatingPassword || !currentPassword || !newPassword}
              className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white"
            >
              {isUpdatingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clerk 2FA Enrollment Dialog */}
      <Dialog open={show2faDialog} onOpenChange={(open) => !isEnrolling2fa && setShow2faDialog(open)}>
        <DialogContent className="sm:max-w-md rounded-[24px] text-left">
          <DialogHeader>
            <DialogTitle>İki Aşamalı Doğrulama (2FA)</DialogTitle>
            <DialogDescription>
              Google Authenticator veya başka bir 2FA uygulamasına aşağıdaki gizli anahtarı ekleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {totpSecret && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Gizli Anahtar (Secret Key)</Label>
                  <Input
                    readOnly
                    value={totpSecret.secret}
                    onClick={(e) => {
                      (e.target as HTMLInputElement).select();
                      navigator.clipboard.writeText(totpSecret.secret);
                      toast.success("Anahtar kopyalandı.");
                    }}
                    className="h-12 rounded-xl font-mono text-center cursor-pointer bg-muted/30"
                  />
                  <p className="text-[10px] text-muted-foreground text-center">Tıklayarak kopyalayabilirsiniz.</p>
                </div>
                <div className="space-y-2">
                  <Label>Doğrulama Kodu</Label>
                  <Input
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="h-12 rounded-xl text-center text-xl font-mono tracking-wider"
                  />
                </div>
                <Button 
                  onClick={handleVerify2fa} 
                  disabled={isEnrolling2fa || totpCode.length < 6}
                  className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white"
                >
                  {isEnrolling2fa ? "Doğrulanıyor..." : "2FA'yı Etkinleştir"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
