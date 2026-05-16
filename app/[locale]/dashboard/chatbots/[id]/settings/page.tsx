"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { 
  Settings, 
  Bot, 
  Palette, 
  Sparkles, 
  Save, 
  ChevronLeft,
  Loader2,
  Trash2,
  Globe,
  Lock,
  MessageSquare,
  RefreshCw,
  Image as ImageIcon,
  Type,
  Share2,
  Zap,
  ShieldCheck,
  Calendar,
  List,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  Database,
  FileText,
  Pencil
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SourceDialog } from "@/components/dashboard/source-dialog";
import { ChannelCard } from "@/components/dashboard/channels/channel-card";
import { ConnectModal } from "@/components/dashboard/channels/connect-modal";
import { MetaSelector } from "@/components/dashboard/channels/meta-selector";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";

function SettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const t = useTranslations("Dashboard.channels");
  const router = useRouter();
  const id = params.id as string;
  
  const [mounted, setMounted] = useState(false);
  const [chatbot, setChatbot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [sourceDialogType, setSourceDialogType] = useState<"WEBSITE" | "TEXT" | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [isChannelsLoading, setIsChannelsLoading] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectType, setConnectType] = useState<any>(null);
  const [isRetrainingSource, setIsRetrainingSource] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [urlListDialogOpen, setUrlListDialogOpen] = useState(false);
  const [sourceUrls, setSourceUrls] = useState<any[]>([]);
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);
  const [metaSelectorOpen, setMetaSelectorOpen] = useState(false);
  const [metaSessionId, setMetaSessionId] = useState<string | null>(null);
  const [isDeletingKS, setIsDeletingKS] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [viewContentOpen, setViewContentOpen] = useState(false);
  const [viewingSource, setViewingSource] = useState<any>(null);
  const [sourceContent, setSourceContent] = useState("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);


  useEffect(() => {
    const session = searchParams.get("meta_session");
    const metaConnected = searchParams.get("meta_connected");
    const activeTab = searchParams.get("tab");
    if (session) {
      setMetaSessionId(session);
      setMetaSelectorOpen(true);
      const newUrl = window.location.pathname + (window.location.search.replace(/[\?\&]meta_session=[^\&]+/, '').replace(/^\&/, '?'));
      window.history.replaceState({}, '', newUrl);
    }
    if (metaConnected === "true") {
      // OAuth callback returned — open selector to finalize
      setMetaSelectorOpen(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);
  useEffect(() => {
    setMounted(true);
    fetchChatbot();
    fetchChannels();
  }, [id]);

  const fetchChannels = async () => {
    try {
      setIsChannelsLoading(true);
      const res = await fetch(`/api/chatbots/${id}/channels`);
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
    } finally {
      setIsChannelsLoading(false);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    try {
      const res = await fetch(`/api/chatbots/${id}/channels?channelId=${channelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Channel disconnected");
        fetchChannels();
      }
    } catch (error) {
      toast.error("Failed to disconnect channel");
    }
  };

  const fetchChatbot = async () => {
    try {
      const res = await fetch(`/api/chatbots/${id}`);
      if (res.ok) {
        const data = await res.json();
        setChatbot(data);
        setFormData(data);
        fetchDataSources();
      }
    } catch (error) {
      console.error("Error fetching chatbot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDataSources = async () => {
    try {
      const res = await fetch(`/api/chatbots/${id}/data-sources`);
      if (res.ok) {
        const data = await res.json();
        setDataSources(data);
      }
    } catch (error) {
      console.error("Error fetching data sources:", error);
    }
    // Also fetch knowledge sources
    try {
      const res = await fetch(`/api/knowledge?chatbotId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setKnowledgeSources(Array.isArray(data) ? data : data.sources || []);
      }
    } catch (error) {
      console.error("Error fetching knowledge sources:", error);
    }
  };

  const handleDeleteKnowledgeSource = async (ksId: string) => {
    if (!confirm('Delete this knowledge source and all its trained data?')) return;
    setIsDeletingKS(ksId);
    try {
      const res = await fetch(`/api/knowledge/${ksId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Knowledge source deleted');
        fetchDataSources();
      } else {
        toast.error('Failed to delete knowledge source');
      }
    } catch (err) {
      toast.error('Error deleting knowledge source');
    } finally {
      setIsDeletingKS(null);
    }
  };

  const handleViewContent = async (source: any) => {
    setViewingSource(source);
    setViewContentOpen(true);
    setIsLoadingContent(true);
    setSourceContent("");
    try {
      const res = await fetch(`/api/chatbots/${id}/source-content?dataSourceId=${source.id}`);
      if (res.ok) {
        const data = await res.json();
        setSourceContent(data.content);
      } else {
        toast.error("Failed to fetch source content");
      }
    } catch (err) {
      toast.error("Error connecting to neural engine");
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/chatbots/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Settings updated successfully");
        setChatbot(formData);
      } else {
        toast.error("Failed to update settings");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-zinc-500 font-medium animate-pulse uppercase tracking-widest text-xs">Accessing Neural Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20">
      {/* Elite Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="flex items-center gap-6">
          <Link href={`/dashboard/chatbots/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100">
              <ChevronLeft className="w-6 h-6 text-zinc-400" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 bg-clip-text text-transparent">
              Intelligence Forge
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Fine-tune the neural core and appearance of your agent
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-2xl h-12 px-10 font-bold shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Sync Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-10">
        <TabsList className="bg-zinc-100/50 p-1.5 rounded-3xl border border-zinc-200 h-auto flex flex-wrap lg:flex-nowrap gap-1">
          <TabsTrigger value="general" className="rounded-2xl px-8 h-12 font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg">
            <Bot className="w-4 h-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="personality" className="rounded-2xl px-8 h-12 font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg">
            <Sparkles className="w-4 h-4 mr-2" /> Personality
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-2xl px-8 h-12 font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg">
            <Palette className="w-4 h-4 mr-2" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="training" className="rounded-2xl px-8 h-12 font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg">
            <Zap className="w-4 h-4 mr-2" /> Training
          </TabsTrigger>
          <Link href={`/dashboard/chatbots/${id}/integrations`} className="flex-1 lg:flex-none">
            <Button variant="ghost" className="w-full rounded-2xl px-8 h-12 font-bold hover:bg-zinc-50 transition-all text-zinc-500 hover:text-zinc-950">
              <Share2 className="w-4 h-4 mr-2" /> {t("tabLabel") || "Channels"}
            </Button>
          </Link>
        </TabsList>

        <TabsContent value="general" className="animate-in fade-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[40px] border-2 border-zinc-100 shadow-2xl shadow-black/5 overflow-hidden bg-white">
                <CardHeader className="p-10 pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-950 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">Identity Profile</CardTitle>
                      <CardDescription className="text-zinc-400 font-medium tracking-tight mt-1">Basic identification and deployment settings</CardDescription>
                    </div>
                  </div>
                </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Agent Name</Label>
                  <Input 
                    value={formData.name ?? ""} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev: any) => ({ ...prev, name: val }));
                    }}
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-medium"
                    placeholder={chatbot?.name || "e.g., JCaesar Sales Lead"}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Primary Language</Label>
                  <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                    <SelectTrigger className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-zinc-200">
                      <SelectItem value="tr">Turkish</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Internal Description</Label>
                <Textarea 
                  value={formData.description ?? ""} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev: any) => ({ ...prev, description: val }));
                  }}
                  className="min-h-[120px] rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-medium resize-none p-6"
                  placeholder={chatbot?.description || "What is the purpose of this agent?"}
                />
              </div>
            </CardContent>
              </Card>

              <Card className="rounded-[40px] border-2 border-zinc-100 shadow-2xl shadow-black/5 overflow-hidden bg-white">
                <CardHeader className="p-10 pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">Access & Security</CardTitle>
                      <CardDescription className="text-zinc-400 font-medium tracking-tight mt-1">Control where and how your agent operates</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                  <div className="flex items-center justify-between p-6 rounded-3xl bg-zinc-50">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-900">Public Visibility</h4>
                      <p className="text-xs text-zinc-500 font-medium">Allow direct links to the chat interface</p>
                    </div>
                    <Switch 
                      checked={formData.isPublic} 
                      onCheckedChange={(v) => setFormData({...formData, isPublic: v})} 
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="rounded-[40px] border-2 border-zinc-100 bg-white p-8 overflow-hidden shadow-2xl shadow-black/5">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-8">
                  <Database className="w-3 h-3" />
                  Agent Health
                </h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-600">Status</span>
                    <Badge variant="outline" className={`rounded-full uppercase text-[9px] font-black ${
                      chatbot?.status === 'ACTIVE' ? 'bg-green-50 text-green-600 border-green-200' :
                      chatbot?.status === 'TRAINING' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      chatbot?.status === 'ERROR' ? 'bg-red-50 text-red-600 border-red-200' :
                      'bg-zinc-50 text-zinc-600 border-zinc-200'
                    }`}>{chatbot?.status || 'Unknown'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-600">Data Sources</span>
                    <span className="text-xs font-bold text-zinc-900">{dataSources.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-600">Total Pages</span>
                    <span className="text-xs font-bold text-zinc-900">{dataSources.reduce((acc, ds) => acc + (ds.pagesCount || 0), 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-600">Model</span>
                    <span className="text-xs font-bold text-zinc-400 uppercase">{chatbot?.model || 'gpt-4o-mini'}</span>
                  </div>
                </div>
              </Card>

              <div className="p-10 rounded-[40px] bg-red-50 border-2 border-red-100 group hover:bg-red-100 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h4 className="text-lg font-bold text-red-950">Danger Zone</h4>
                </div>
                <p className="text-sm text-red-800 font-medium leading-relaxed mb-6">Permanently delete this agent and all its training data, conversations, and configurations. This action cannot be undone.</p>
                <Button 
                  variant="destructive" 
                  className="w-full rounded-2xl h-12 font-bold shadow-xl shadow-red-500/20"
                  onClick={async () => {
                    if (confirm('Are you absolutely sure? This will permanently delete this agent, all its training data, conversations, and integrations. This action CANNOT be undone.')) {
                      try {
                        const res = await fetch(`/api/chatbots/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                          toast.success('Agent permanently deleted');
                          router.push('/dashboard/chatbots');
                        } else {
                          toast.error('Failed to delete agent');
                        }
                      } catch (err) {
                        toast.error('An error occurred while deleting');
                      }
                    }
                  }}
                >
                  Permanently Delete Agent
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="personality" className="animate-in fade-in zoom-in-95 duration-500">
          <Card className="rounded-[40px] border-2 border-zinc-100 shadow-2xl shadow-black/5 overflow-hidden bg-white max-w-4xl">
            <CardHeader className="p-10 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Neural Instructions</CardTitle>
                  <CardDescription className="text-zinc-400 font-medium tracking-tight mt-1">Configure the behavioral logic and response characteristics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-12">
              <div className="space-y-4">
                <div className="flex items-center justify-between pr-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">System Instructions (Expert Mode)</Label>
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <Textarea 
                  value={formData.systemPrompt ?? ""} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev: any) => ({ ...prev, systemPrompt: val }));
                  }}
                  className="min-h-[300px] rounded-3xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-mono text-sm leading-relaxed p-8 shadow-inner"
                  placeholder="You are a helpful assistant..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Temperature</Label>
                    <span className="text-xs font-black text-zinc-900 bg-zinc-100 px-3 py-1 rounded-full">{formData.temperature}</span>
                  </div>
                  <Slider 
                    value={[formData.temperature || 0.7]} 
                    min={0} 
                    max={1} 
                    step={0.1}
                    onValueChange={([v]) => setFormData({...formData, temperature: v})}
                  />
                  <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">Lower values are more deterministic and precise. Higher values encourage creative exploration.</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Max Response Tokens</Label>
                    <span className="text-xs font-black text-zinc-900 bg-zinc-100 px-3 py-1 rounded-full">{formData.maxTokens}</span>
                  </div>
                  <Slider 
                    value={[formData.maxTokens || 1000]} 
                    min={256} 
                    max={4096} 
                    step={128}
                    onValueChange={([v]) => setFormData({...formData, maxTokens: v})}
                  />
                  <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">Controls the maximum length of generated responses. 1000 tokens is approximately 750 words.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="animate-in fade-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Card className="rounded-[40px] border-2 border-zinc-100 shadow-2xl shadow-black/5 overflow-hidden bg-white">
              <CardHeader className="p-10 pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Visual Language</CardTitle>
                    <CardDescription className="text-zinc-400 font-medium tracking-tight mt-1">Customize the interface aesthetics for end users</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Primary Brand Color</Label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-14 h-14 rounded-2xl shadow-xl ring-4 ring-white border border-zinc-100" 
                        style={{ backgroundColor: formData.primaryColor }} 
                      />
                      <Input 
                        value={formData.primaryColor ?? ""} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev: any) => ({ ...prev, primaryColor: val }));
                        }}
                        className="h-14 flex-1 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-mono"
                        placeholder={chatbot?.primaryColor || "#e25b31"}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Agent Avatar URL</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden">
                        {formData.avatar ? <img src={formData.avatar} className="w-full h-full object-cover" /> : <Bot className="w-6 h-6 text-zinc-400" />}
                      </div>
                      <Input 
                        value={formData.avatar ?? ""} 
                        onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                        className="h-14 flex-1 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-medium"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Styling Section */}
                <div className="pt-10 space-y-8 border-t border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-sm font-bold text-zinc-900">Advanced Styling</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Font Family</Label>
                      <Select value={formData.fontFamily} onValueChange={(v) => setFormData({ ...formData, fontFamily: v })}>
                        <SelectTrigger className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="Inter, sans-serif">Inter (Modern)</SelectItem>
                          <SelectItem value="'Outfit', sans-serif">Outfit (Premium)</SelectItem>
                          <SelectItem value="'Plus Jakarta Sans', sans-serif">Jakarta (Clean)</SelectItem>
                          <SelectItem value="system-ui, sans-serif">System Default</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Border Radius</Label>
                      <div className="pt-2 px-2">
                        <Slider 
                          value={[parseInt(formData.borderRadius || "16")]} 
                          min={0} 
                          max={40} 
                          step={4}
                          onValueChange={([v]) => setFormData({...formData, borderRadius: `${v}px`})}
                        />
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                          <span>Sharp</span>
                          <span>{formData.borderRadius}</span>
                          <span>Round</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">User Message Color</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl border border-zinc-200 shadow-sm" style={{ backgroundColor: formData.userMessageColor }} />
                        <Input 
                          value={formData.userMessageColor} 
                          onChange={(e) => setFormData({...formData, userMessageColor: e.target.value})}
                          className="h-14 flex-1 rounded-2xl bg-zinc-50 border-zinc-100"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Assistant Message Color</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl border border-zinc-200 shadow-sm" style={{ backgroundColor: formData.assistantMessageColor }} />
                        <Input 
                          value={formData.assistantMessageColor} 
                          onChange={(e) => setFormData({...formData, assistantMessageColor: e.target.value})}
                          className="h-14 flex-1 rounded-2xl bg-zinc-50 border-zinc-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-zinc-100">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Welcome Message</Label>
                    <Input 
                      value={formData.welcomeMessage ?? ""} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({ ...prev, welcomeMessage: val }));
                      }}
                      className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-medium"
                      placeholder={chatbot?.welcomeMessage || "e.g., Hi! How can we assist you today?"}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Widget Position</Label>
                    <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
                      <SelectTrigger className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-zinc-200">
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="top-right">Top Right (Experimental)</SelectItem>
                        <SelectItem value="top-left">Top Left (Experimental)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between p-6 rounded-3xl bg-zinc-50">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-zinc-900">Show JCaesar Branding</h4>
                    <p className="text-xs text-zinc-500 font-medium">Remove the 'Powered by JCaesar' badge</p>
                  </div>
                  <Switch 
                    checked={!formData.showBranding} 
                    onCheckedChange={(v) => setFormData({...formData, showBranding: !v})} 
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
               <div className="p-10 rounded-[40px] bg-zinc-950 text-white shadow-2xl shadow-black/20 relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(226,91,49,0.2),transparent)] opacity-50" />
                  <div className="relative z-10 w-full space-y-8 flex flex-col items-center">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">Neural Preview</p>
                    <div className="w-80 h-96 bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
                      <div className="p-6 text-white flex items-center justify-between" style={{ backgroundColor: formData.primaryColor }}>
                         <div className="flex items-center gap-3">
                            {formData.avatar ? (
                              <img src={formData.avatar} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <Bot className="w-5 h-5" />
                            )}
                            <span className="font-bold text-xs">{formData.name || "Agent"}</span>
                         </div>
                         <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                      </div>
                      <div className="flex-1 p-6 flex items-end">
                         <div className="bg-zinc-100 p-4 rounded-2xl rounded-bl-none text-[10px] font-bold text-zinc-700 leading-relaxed shadow-sm">
                           {formData.welcomeMessage || "Hello! How can I help?"}
                         </div>
                      </div>
                      <div className="p-4 border-t border-zinc-100 flex items-center gap-3">
                         <div className="w-full h-10 bg-zinc-50 rounded-xl" />
                         <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg" style={{ backgroundColor: formData.primaryColor }}>
                            <Send className="w-4 h-4" />
                         </div>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="training" className="animate-in fade-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[40px] border-2 border-zinc-100 shadow-2xl shadow-black/5 overflow-hidden bg-white">
                <CardHeader className="p-10 pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-950 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Neural Knowledge</CardTitle>
                        <CardDescription className="text-zinc-400 font-medium tracking-tight mt-1">Manage the core data that trains your agent</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Data Sources</Label>
                      <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs font-bold" onClick={() => fetchDataSources()}>
                        <RefreshCw className={`w-3 h-3 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>

                    <div className="border border-zinc-100 rounded-[32px] overflow-hidden bg-zinc-50/30">
                      <table className="w-full text-left">
                        <thead className="bg-zinc-100/50 border-b border-zinc-100">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Source</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {dataSources.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-6 py-12 text-center text-zinc-400 font-medium text-sm italic">
                                No intelligence sources connected yet.
                              </td>
                            </tr>
                          ) : (
                            dataSources.map((source) => (
                              <tr key={source.id} className="group hover:bg-white transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center">
                                      {source.type === 'WEBSITE' ? <Globe className="w-4 h-4 text-zinc-400" /> : <MessageSquare className="w-4 h-4 text-zinc-400" />}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-zinc-900 truncate max-w-[240px]">{source.name}</span>
                                      <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[200px]">{source.url || 'Manual Entry'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <Badge className={`rounded-full px-3 py-0.5 text-[9px] font-black tracking-tighter uppercase w-fit ${
                                      source.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-200' : 
                                      source.status === 'PENDING' || source.status === 'CRAWLING' ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' :
                                      'bg-red-50 text-red-600 border-red-200'
                                    }`}>
                                      {source.status}
                                    </Badge>
                                    {source.pagesCount > 0 && (
                                      <span className="text-[9px] text-zinc-400 font-bold">
                                        {source.pagesCount} pages
                                      </span>
                                    )}
                                    {source.crawlSchedule && source.crawlSchedule !== 'none' && (
                                      <span className="text-[9px] text-blue-400 font-bold flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" />
                                        {source.crawlSchedule}
                                      </span>
                                    )}
                                    {source.status === 'ERROR' && (
                                      <span className="text-[9px] text-red-400 font-medium max-w-[120px] truncate" title={source.crawlStatus}>
                                        {source.crawlStatus || 'Unknown Error'}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-9 w-9 rounded-xl hover:bg-zinc-100 text-zinc-400"
                                      title="View Content"
                                      onClick={() => handleViewContent(source)}
                                    >
                                      <Bot className="w-4 h-4" />
                                    </Button>

                                    {(source.type === 'TEXT' || source.type === 'QA' || source.type === 'QNA') ? (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 rounded-xl hover:bg-zinc-100 text-zinc-400"
                                        title="Edit Content"
                                        onClick={() => {
                                          setSelectedSource(source);
                                          setSourceDialogType(source.type === 'QNA' ? 'QA' : source.type);
                                          setEditMode(true);
                                          setSourceDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 rounded-xl hover:bg-zinc-100 text-zinc-400"
                                        title="View Pages"
                                        onClick={async () => {
                                          if (!id || !source.id) return;
                                          setSelectedSource(source);
                                          setUrlListDialogOpen(true);
                                          setIsLoadingUrls(true);
                                          try {
                                            const controller = new AbortController();
                                            const timeoutId = setTimeout(() => controller.abort(), 10000);
                                            const res = await fetch(`/api/chatbots/${id}/data-sources/${source.id}/urls`, {
                                              signal: controller.signal
                                            });
                                            clearTimeout(timeoutId);
                                            if (res.ok) {
                                              const data = await res.json();
                                              setSourceUrls(data);
                                            } else {
                                              toast.error("Could not fetch page manifest");
                                              setSourceUrls([]);
                                            }
                                          } catch (err) {
                                            console.error("Fetch error:", err);
                                            setSourceUrls([]);
                                          } finally {
                                            setIsLoadingUrls(false);
                                          }
                                        }}
                                      >
                                        <List className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-9 w-9 rounded-xl hover:bg-zinc-100 text-zinc-400"
                                      title="Schedule Sync"
                                      onClick={() => {
                                        setSelectedSource(source);
                                        setScheduleDialogOpen(true);
                                      }}
                                    >
                                      <Calendar className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className={`h-9 w-9 rounded-xl hover:bg-zinc-100 text-zinc-400 ${isRetrainingSource === source.id ? 'animate-spin text-primary' : ''}`}
                                      title="Retrain (Clean Slate)"
                                      disabled={isRetrainingSource === source.id}
                                      onClick={async () => {
                                        if(confirm("This will delete all learned knowledge from this source and re-index it from scratch. Proceed?")) {
                                          setIsRetrainingSource(source.id);
                                          try {
                                            const res = await fetch(`/api/chatbots/${id}/data-sources/${source.id}/retrain`, { method: 'POST' });
                                            if (res.ok) {
                                              toast.success("Retraining initiated successfully");
                                              fetchDataSources();
                                            }
                                          } finally {
                                            setIsRetrainingSource(null);
                                          }
                                        }
                                      }}
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-500 text-zinc-400"
                                      onClick={async () => {
                                        if(confirm('Delete this knowledge source?')) {
                                          await fetch(`/api/chatbots/${id}/data-sources/${source.id}`, { method: 'DELETE' });
                                          fetchDataSources();
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Knowledge Sources Section */}
                  {knowledgeSources.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                          <Database className="w-3 h-3" />
                          Knowledge Sources
                        </Label>
                        <Badge variant="outline" className="text-[9px] font-black px-2 py-0 border-zinc-200 text-zinc-400">
                          {knowledgeSources.length} sources
                        </Badge>
                      </div>

                      <div className="border border-zinc-100 rounded-[32px] overflow-hidden bg-zinc-50/30">
                        <table className="w-full text-left">
                          <thead className="bg-zinc-100/50 border-b border-zinc-100">
                            <tr>
                              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Source</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {knowledgeSources.map((ks: any) => (
                              <tr key={ks.id} className="group hover:bg-white transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center">
                                      {ks.type === 'WEBSITE' ? <Globe className="w-4 h-4 text-zinc-400" /> : <FileText className="w-4 h-4 text-zinc-400" />}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-zinc-900 truncate max-w-[240px]">{ks.name}</span>
                                      <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[200px]">{ks.url || ks.type}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <Badge className={`rounded-full px-3 py-0.5 text-[9px] font-black tracking-tighter uppercase w-fit ${
                                      ks.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-200' : 
                                      ks.status === 'PENDING' || ks.status === 'CRAWLING' ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' :
                                      'bg-red-50 text-red-600 border-red-200'
                                    }`}>
                                      {ks.status}
                                    </Badge>
                                    {ks.updatedAt && (
                                      <span className="text-[9px] text-zinc-400 font-medium">
                                        Updated {new Date(ks.updatedAt).toLocaleDateString('tr-TR')}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-500 text-zinc-400"
                                      disabled={isDeletingKS === ks.id}
                                      onClick={() => handleDeleteKnowledgeSource(ks.id)}
                                    >
                                      {isDeletingKS === ks.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Source Quick Access */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-[40px] border-2 border-zinc-100 shadow-xl shadow-black/5 hover:border-zinc-900 transition-all cursor-pointer group bg-white" onClick={() => {
                  setSourceDialogType("WEBSITE");
                  setEditMode(false);
                  setSourceDialogOpen(true);
                }}>
                  <CardContent className="p-10 flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-[24px] bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-950 group-hover:text-white transition-all duration-300">
                      <Globe className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Add Website</h4>
                      <p className="text-xs text-zinc-400 font-medium mt-1">Crawl pages and sitemaps</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[40px] border-2 border-zinc-100 shadow-xl shadow-black/5 hover:border-zinc-950 transition-all cursor-pointer group bg-white" onClick={() => {
                   setSourceDialogType("FILE" as any);
                   setEditMode(false);
                   setSourceDialogOpen(true);
                }}>
                  <CardContent className="p-10 flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-[24px] bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-950 group-hover:text-white transition-all duration-300">
                       <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Add Files</h4>
                      <p className="text-xs text-zinc-400 font-medium mt-1">Upload PDF, DOCX, TXT</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[40px] border-2 border-zinc-100 shadow-xl shadow-black/5 hover:border-zinc-900 transition-all cursor-pointer group bg-white" onClick={() => {
                  setSourceDialogType("TEXT");
                  setEditMode(false);
                  setSourceDialogOpen(true);
                }}>
                  <CardContent className="p-10 flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-[24px] bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-950 group-hover:text-white transition-all duration-300">
                      <Type className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Add Text</h4>
                      <p className="text-xs text-zinc-400 font-medium mt-1">Paste raw content directly</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[40px] border-2 border-zinc-100 shadow-xl shadow-black/5 hover:border-zinc-950 transition-all cursor-pointer group bg-white" onClick={() => {
                   setSourceDialogType("QA" as any);
                   setEditMode(false);
                   setSourceDialogOpen(true);
                }}>
                  <CardContent className="p-10 flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-[24px] bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-950 group-hover:text-white transition-all duration-300">
                       <MessageSquare className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Add Q&A</h4>
                      <p className="text-xs text-zinc-400 font-medium mt-1">Manual question & answer pairs</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <SourceDialog 
                open={sourceDialogOpen}
                onOpenChange={setSourceDialogOpen}
                type={sourceDialogType}
                chatbotId={id}
                onSuccess={() => fetchDataSources()}
                editMode={editMode}
                initialData={selectedSource}
              />

              <MetaSelector 
                open={metaSelectorOpen}
                onOpenChange={setMetaSelectorOpen}
                sessionId={metaSessionId || ""}
                chatbotId={id}
                onSuccess={() => fetchChannels()}
              />
            </div>

            <div className="space-y-8">
              <Card className="rounded-[40px] border-2 border-zinc-100 bg-white p-10 overflow-hidden shadow-2xl shadow-black/5">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-8">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Neural Impact
                </h3>
                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-900">
                      <span>Total Knowledge Weight</span>
                      <span>{(dataSources.reduce((acc, ds) => acc + (ds.fileSize || 0), 0) / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-zinc-950 transition-all duration-1000" 
                        style={{ width: `${Math.min((dataSources.reduce((acc, ds) => acc + (ds.fileSize || 0), 0) / 1024) * 0.5, 100)}%` }} 
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                    Connecting more high-quality data sources improves the precision and accuracy of your agent's responses.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="channels" className="animate-in fade-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[40px] border-2 border-zinc-100 shadow-2xl shadow-black/5 overflow-hidden bg-white">
                <CardHeader className="p-10 pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-950 flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">{t("title")}</CardTitle>
                      <CardDescription className="text-zinc-400 font-medium tracking-tight mt-1">{t("subtitle")}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-6">
                  <ChannelCard 
                    type="WHATSAPP"
                    status={channels.find(c => c.type === "WHATSAPP")?.status || "DISCONNECTED"}
                    name="WhatsApp Business"
                    details={channels.find(c => c.type === "WHATSAPP")?.phoneNumberId}
                    onConnect={() => { setConnectType("WHATSAPP"); setConnectModalOpen(true); }}
                    onDisconnect={() => handleDisconnect(channels.find(c => c.type === "WHATSAPP")?.id)}
                    onConfigure={() => { setConnectType("WHATSAPP"); setConnectModalOpen(true); }}
                  />
                  <ChannelCard 
                    type="INSTAGRAM"
                    status={channels.find(c => c.type === "INSTAGRAM")?.status || "DISCONNECTED"}
                    name="Instagram DM"
                    onConnect={() => { setConnectType("INSTAGRAM"); setConnectModalOpen(true); }}
                    onDisconnect={() => handleDisconnect(channels.find(c => c.type === "INSTAGRAM")?.id)}
                    onConfigure={() => { setConnectType("INSTAGRAM"); setConnectModalOpen(true); }}
                  />
                  <ChannelCard 
                    type="FACEBOOK"
                    status={channels.find(c => c.type === "FACEBOOK")?.status || "DISCONNECTED"}
                    name="Facebook Messenger"
                    onConnect={() => { setConnectType("FACEBOOK"); setConnectModalOpen(true); }}
                    onDisconnect={() => handleDisconnect(channels.find(c => c.type === "FACEBOOK")?.id)}
                    onConfigure={() => { setConnectType("FACEBOOK"); setConnectModalOpen(true); }}
                  />
                  <div className="h-px bg-zinc-100 my-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChannelCard 
                      type="SHOPIFY"
                      status={channels.find(c => c.type === "SHOPIFY")?.status || "DISCONNECTED"}
                      name="Shopify"
                      onConnect={() => { setConnectType("SHOPIFY"); setConnectModalOpen(true); }}
                      onDisconnect={() => handleDisconnect(channels.find(c => c.type === "SHOPIFY")?.id)}
                    />
                    <ChannelCard 
                      type="WOOCOMMERCE"
                      status={channels.find(c => c.type === "WOOCOMMERCE")?.status || "DISCONNECTED"}
                      name="WooCommerce"
                      onConnect={() => { setConnectType("WOOCOMMERCE"); setConnectModalOpen(true); }}
                      onDisconnect={() => handleDisconnect(channels.find(c => c.type === "WOOCOMMERCE")?.id)}
                    />
                    <ChannelCard 
                      type="GOOGLE_CALENDAR"
                      status={channels.find(c => c.type === "GOOGLE_CALENDAR")?.status || "DISCONNECTED"}
                      name="Google Calendar"
                      onConnect={() => { setConnectType("GOOGLE_CALENDAR"); setConnectModalOpen(true); }}
                      onDisconnect={() => handleDisconnect(channels.find(c => c.type === "GOOGLE_CALENDAR")?.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
               <Card className="rounded-[40px] border-2 border-zinc-100 bg-zinc-950 p-10 overflow-hidden shadow-2xl shadow-black/5 text-white">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-8">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    {t("setup.title")}
                  </h3>
                  <div className="space-y-6">
                    <p className="text-sm font-medium text-zinc-400 leading-relaxed">
                      {t("setup.description")}
                    </p>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <Label className="text-[9px] font-black uppercase text-zinc-500">{t("setup.urlLabel")}</Label>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-[10px] text-white font-mono truncate">
                          {mounted ? window.location.origin : ""}/api/channels/meta/[type]
                        </code>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 italic mt-4">
                      {t("setup.note")}
                    </p>
                  </div>
               </Card>

               <Card className="rounded-[40px] border-2 border-zinc-100 bg-white p-10 overflow-hidden shadow-2xl shadow-black/5">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-8">
                    <Bot className="w-3 h-3 text-zinc-950" />
                    Interface Mode
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {["FLOAT", "POPUP", "INLINE"].map((m) => (
                      <Button
                        key={m}
                        variant={chatbot?.widgetMode === m ? "default" : "outline"}
                        className="rounded-2xl text-[10px] font-bold h-12"
                        onClick={async () => {
                          const res = await fetch(`/api/chatbots/${id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ widgetMode: m })
                          });
                          if(res.ok) window.location.reload();
                        }}
                      >
                        {m}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium mt-6 leading-relaxed">
                    Choose how the widget appears on your website. <strong>Float</strong> is the standard bubble, 
                    <strong>Popup</strong> is a centered modal, and <strong>Inline</strong> embeds directly in your content.
                  </p>
               </Card>
            </div>
          </div>

          <ConnectModal 
            open={connectModalOpen}
            onOpenChange={setConnectModalOpen}
            type={connectType}
            chatbotId={id}
            onSuccess={fetchChannels}
          />
        </TabsContent>

        {/* URL List Dialog — OUTSIDE Tabs so it works from any tab */}
          <Dialog open={urlListDialogOpen} onOpenChange={setUrlListDialogOpen}>
            <DialogContent className="max-w-2xl rounded-[32px] p-0 overflow-hidden border-2 border-zinc-100">
              <DialogHeader className="p-8 pb-0">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <List className="w-5 h-5 text-zinc-400" />
                  Discovered Pages
                </DialogTitle>
                <DialogDescription className="font-medium text-zinc-400 tracking-tight">
                  Status of individual URLs from {selectedSource?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="p-8">
                <ScrollArea className="h-[400px] pr-4">
                  {isLoadingUrls ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <p className="text-xs font-bold uppercase tracking-widest">Fetching page manifest...</p>
                    </div>
                  ) : sourceUrls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                      <Globe className="w-12 h-12 mb-4 opacity-10" />
                      <p className="text-sm font-medium italic">No pages indexed yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sourceUrls.map((url: any) => (
                        <div key={url.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100 group transition-all hover:bg-white hover:shadow-md">
                          <div className="flex items-center gap-4 overflow-hidden flex-1">
                            {url.status === 'COMPLETED' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                            ) : url.status === 'ERROR' ? (
                              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                            ) : (
                              <Clock className="w-5 h-5 text-blue-500 animate-pulse shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-900 truncate flex-1">
                                  {url.title || url.url}
                                </span>
                                {url.charCount && (
                                  <Badge variant="outline" className="text-[9px] font-black px-1.5 py-0 border-zinc-200 text-zinc-400 bg-white shrink-0">
                                    {(url.charCount / 1000).toFixed(1)}k chars
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 font-medium truncate italic">{url.url}</span>
                              {url.status === 'ERROR' && url.errorMessage && (
                                <span className="text-[10px] text-red-500 font-bold mt-1 bg-red-50 px-2 py-0.5 rounded-lg w-fit">
                                  {url.errorMessage}
                                </span>
                              )}
                            </div>
                          </div>
                          <Link href={url.url} target="_blank" className="p-2 hover:bg-zinc-100 rounded-xl transition-colors shrink-0">
                            <ExternalLink className="w-4 h-4 text-zinc-400" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          {/* Schedule Dialog */}
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogContent className="max-w-md rounded-[32px] p-8 border-2 border-zinc-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-zinc-400" />
                  Auto-Sync Schedule
                </DialogTitle>
                <DialogDescription className="font-medium text-zinc-400 tracking-tight">
                  Automate knowledge refresh for {selectedSource?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Frequency</Label>
                  <Select 
                    defaultValue={selectedSource?.crawlSchedule || "none"} 
                    onValueChange={async (val) => {
                      setIsUpdatingSchedule(true);
                      try {
                        const res = await fetch(`/api/chatbots/${id}/data-sources/${selectedSource?.id}/schedule`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ schedule: val })
                        });
                        if (res.ok) {
                          toast.success(`Sync schedule updated to ${val}`);
                          fetchDataSources();
                          setScheduleDialogOpen(false);
                        }
                      } finally {
                        setIsUpdatingSchedule(false);
                      }
                    }}
                  >
                    <SelectTrigger className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-medium">
                      <SelectValue placeholder="Select Frequency" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-zinc-200">
                      <SelectItem value="none">Manual Only</SelectItem>
                      <SelectItem value="daily">Daily (Midnight Istanbul)</SelectItem>
                      <SelectItem value="weekly">Weekly (Sunday Midnight)</SelectItem>
                      <SelectItem value="monthly">Monthly (1st at Midnight)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed italic">
                  * All automated syncs occur at 00:00 Istanbul time to minimize impact on production data.
                </p>
              </div>
              <DialogFooter>
                 <Button variant="ghost" onClick={() => setScheduleDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      </Tabs>
      {/* Neural View Modal */}
      <Dialog open={viewContentOpen} onOpenChange={setViewContentOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0 overflow-hidden rounded-[40px] border-zinc-100 shadow-2xl">
          <DialogHeader className="p-8 border-b border-zinc-100 bg-zinc-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-950 flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Neural Knowledge Audit</DialogTitle>
                <DialogDescription className="text-zinc-400 font-medium">Viewing extracted intelligence from <span className="text-zinc-900 font-bold">{viewingSource?.name}</span></DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {isLoadingContent ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Extracting Knowledge...</p>
              </div>
            ) : (
              <ScrollArea className="h-full p-8 bg-white">
                <div className="font-mono text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap selection:bg-primary selection:text-white">
                  {sourceContent || "No readable content found for this source."}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter className="p-6 border-t border-zinc-100 bg-zinc-50/50">
            <Button onClick={() => setViewContentOpen(false)} className="rounded-2xl h-12 px-8 font-bold bg-zinc-950 text-white hover:bg-zinc-900">
              Done Auditing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Suspense } from "react";

export default function WrappedSettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 text-zinc-300 animate-spin" /></div>}>
      <SettingsPage />
    </Suspense>
  );
}
