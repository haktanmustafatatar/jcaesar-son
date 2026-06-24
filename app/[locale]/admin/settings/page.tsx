"use client";

import { useState, useEffect } from "react";
import { 
  Settings2, 
  Shield, 
  Mail, 
  Globe, 
  Save, 
  Database,
  Lock,
  Loader2,
  Server,
  Key
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");

  const [siteName, setSiteName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [globalRateLimit, setGlobalRateLimit] = useState("");
  const [birdWorkspaceId, setBirdWorkspaceId] = useState("");
  const [birdApiKey, setBirdApiKey] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        setSmtpHost(data.smtp_host || "");
        setSmtpPort(data.smtp_port || "");
        setSmtpUser(data.smtp_user || "");
        setSmtpPass(data.smtp_pass || "");
        setSmtpFrom(data.smtp_from || "");
        setSiteName(data.site_name || "JCaesar AI");
        setSupportEmail(data.support_email || "");
        setMaintenanceMode(data.maintenance_mode === "true");
        setGlobalRateLimit(data.global_rate_limit || "1000/hour");
        setBirdWorkspaceId(data.bird_workspace_id || "");
        setBirdApiKey(data.bird_api_key || "");
      })
      .catch((err) => console.error("Error loading settings:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
          smtp_from: smtpFrom,
          site_name: siteName,
          support_email: supportEmail,
          maintenance_mode: maintenanceMode ? "true" : "false",
          global_rate_limit: globalRateLimit,
          bird_workspace_id: birdWorkspaceId,
          bird_api_key: birdApiKey,
        }),
      });
      if (res.ok) {
        toast.success("Sistem ayarları başarıyla kaydedildi!");
      } else {
        toast.error("Ayarlar kaydedilemedi.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Kaydetme sırasında bir hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Sistem Ayarları Yükleniyor...</p>
      </div>
    );
  }

  const tabs = [
    { id: "all", label: "Tüm Ayarlar", icon: Settings2 },
    { id: "general", label: "Genel Ayarlar", icon: Globe },
    { id: "smtp", label: "SMTP (E-Posta)", icon: Mail },
    { id: "limits", label: "API & Limitler", icon: Database },
    { id: "bird", label: "Bird Entegrasyonu", icon: Key },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Sistem Ayarları</h1>
          <p className="text-zinc-400 font-medium">Platform parametrelerini ve entegrasyonlarını yönetin.</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/95 text-white font-bold h-11 px-8 rounded-2xl shadow-xl shadow-primary/20"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Ayarları Kaydet
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8 items-start">
        {/* Left tabs menu */}
        <div className="flex flex-col gap-1 p-2 bg-zinc-900/50 rounded-3xl border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-3 p-3.5 rounded-2xl transition-all font-bold text-sm text-left
                ${activeTab === tab.id 
                  ? "bg-white/10 text-white" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"}
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {/* 1. GENERAL SETTINGS */}
          {(activeTab === "all" || activeTab === "general") && (
            <Card className="bg-zinc-900 border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 bg-zinc-950/20 p-6">
                <CardTitle className="text-white text-lg font-black">Genel Sistem Ayarları</CardTitle>
                <CardDescription>Sitenin temel görünümü ve durum ayarları</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-bold">Site Adı</Label>
                    <Input 
                      value={siteName} 
                      onChange={e => setSiteName(e.target.value)} 
                      className="bg-zinc-950 border-white/10 h-11 rounded-xl text-white focus-visible:ring-primary/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-bold">Destek E-Posta</Label>
                    <Input 
                      type="email" 
                      value={supportEmail} 
                      onChange={e => setSupportEmail(e.target.value)} 
                      className="bg-zinc-950 border-white/10 h-11 rounded-xl text-white focus-visible:ring-primary/20" 
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-white/5">
                    <div className="space-y-0.5">
                      <p className="text-sm text-white font-bold">Bakım Modu</p>
                      <p className="text-xs text-zinc-500 font-medium">Platformu ziyaretçilere kapatıp bakım ekranı gösterir</p>
                    </div>
                    <Switch 
                      checked={maintenanceMode} 
                      onCheckedChange={setMaintenanceMode} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2. SMTP SETTINGS */}
          {(activeTab === "all" || activeTab === "smtp") && (
            <Card className="bg-zinc-900 border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 bg-zinc-950/20 p-6">
                <CardTitle className="text-white text-lg font-black">SMTP E-Posta Sunucusu</CardTitle>
                <CardDescription>Sistem bildirimleri ve şifre sıfırlama e-postaları için</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-bold">SMTP Sunucu Adresi (Host)</Label>
                    <Input 
                      placeholder="smtp.example.com" 
                      value={smtpHost} 
                      onChange={e => setSmtpHost(e.target.value)} 
                      className="bg-zinc-950 border-white/10 h-11 rounded-xl text-white focus-visible:ring-primary/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-bold">SMTP Port</Label>
                    <Input 
                      placeholder="587" 
                      value={smtpPort} 
                      onChange={e => setSmtpPort(e.target.value)} 
                      className="bg-zinc-950 border-white/10 h-11 rounded-xl text-white focus-visible:ring-primary/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-bold">Gönderen E-Posta (From Address)</Label>
                    <Input 
                      placeholder="noreply@jcaesars.com" 
                      value={smtpFrom} 
                      onChange={e => setSmtpFrom(e.target.value)} 
                      className="bg-zinc-950 border-white/10 h-11 rounded-xl text-white focus-visible:ring-primary/20" 
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-bold">SMTP Kullanıcı Adı (User)</Label>
                    <Input 
                      value={smtpUser} 
                      onChange={e => setSmtpUser(e.target.value)} 
                      className="bg-zinc-950 border-white/10 h-11 rounded-xl text-white focus-visible:ring-primary/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-bold">SMTP Şifre (Password)</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={smtpPass} 
                      onChange={e => setSmtpPass(e.target.value)} 
                      className="bg-zinc-950 border-white/10 h-11 rounded-xl text-white focus-visible:ring-primary/20" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. API LIMITS */}
          {(activeTab === "all" || activeTab === "limits") && (
            <Card className="bg-zinc-900 border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 bg-zinc-950/20 p-6">
                <CardTitle className="text-white text-lg font-black">API & Limit Parametreleri</CardTitle>
                <CardDescription>Güvenlik ve rate limiting limitleri</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 border border-yellow-500/10 bg-yellow-500/5 rounded-2xl">
                  <Server className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  <p className="text-xs text-yellow-500/80 font-medium">
                    Global rate limit kurallarının platform geneline yayılması için sunucunun yeniden başlatılması gerekebilir.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-bold">Global İstek Limiti (Global Rate Limit)</Label>
                    <Input 
                      placeholder="e.g., 1000/hour" 
                      value={globalRateLimit} 
                      onChange={e => setGlobalRateLimit(e.target.value)} 
                      className="bg-zinc-950 border-white/10 h-11 rounded-xl text-white focus-visible:ring-primary/20" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. BIRD INTEGRATION */}
          {(activeTab === "all" || activeTab === "bird") && (
            <Card className="bg-zinc-900 border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 bg-zinc-950/20 p-6">
                <CardTitle className="text-white text-lg font-black">Bird Entegrasyonu (MessageBird)</CardTitle>
                <CardDescription>WhatsApp Business API ve SMS sağlayıcı bilgileri</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-bold">Workspace ID</Label>
                    <Input 
                      placeholder="Bird Workspace ID" 
                      value={birdWorkspaceId} 
                      onChange={e => setBirdWorkspaceId(e.target.value)} 
                      className="bg-zinc-950 border-white/10 h-11 rounded-xl text-white focus-visible:ring-primary/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-bold">API Key (Masked)</Label>
                    <Input 
                      type="password"
                      placeholder="••••••••••••••••••••••••" 
                      value={birdApiKey} 
                      onChange={e => setBirdApiKey(e.target.value)} 
                      className="bg-zinc-950 border-white/10 h-11 rounded-xl text-white focus-visible:ring-primary/20" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
