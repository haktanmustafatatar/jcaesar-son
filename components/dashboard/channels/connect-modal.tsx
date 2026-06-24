"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MessageSquare, 
  Instagram, 
  Facebook, 
  Key, 
  ShieldCheck,
  Loader2,
  Globe,
  ShoppingBag,
  ShoppingCart,
  Lock,
  Link2,
  AlertCircle
} from "lucide-react";

import { toast } from "sonner";

interface ConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "SHOPIFY" | "WOOCOMMERCE" | "GOOGLE_CALENDAR" | "TELEGRAM" | "SLACK" | "TRENDYOL" | null;
  chatbotId: string;
  onSuccess: () => void;
}

export function ConnectModal({
  open,
  onOpenChange,
  type,
  chatbotId,
  onSuccess
}: ConnectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bird channel fields
  const [birdChannelId, setBirdChannelId] = useState("");
  const [birdChannelName, setBirdChannelName] = useState("");

  // Shopify fields
  const [shopDomain, setShopDomain] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");

  // WooCommerce fields
  const [wooBaseUrl, setWooBaseUrl] = useState("");
  const [wooConsumerKey, setWooConsumerKey] = useState("");
  const [wooConsumerSecret, setWooConsumerSecret] = useState("");

  // Google Calendar fields
  const [calClientId, setCalClientId] = useState("");
  const [calClientSecret, setCalClientSecret] = useState("");
  const [calRefreshToken, setCalRefreshToken] = useState("");

  // Trendyol fields
  const [trendyolSupplierId, setTrendyolSupplierId] = useState("");
  const [trendyolApiKey, setTrendyolApiKey] = useState("");
  const [trendyolApiSecret, setTrendyolApiSecret] = useState("");

  // Telegram fields
  const [telegramBotToken, setTelegramBotToken] = useState("");

  // Slack fields
  const [slackBotToken, setSlackBotToken] = useState("");
  const [slackChannelId, setSlackChannelId] = useState("");
  const [slackChannelName, setSlackChannelName] = useState("");

  const titles: Record<string, string> = {
    WHATSAPP: "Connect WhatsApp Business",
    INSTAGRAM: "Connect Instagram DM",
    FACEBOOK: "Connect Facebook Messenger",
    SHOPIFY: "Connect Shopify Store",
    WOOCOMMERCE: "Connect WooCommerce",
    GOOGLE_CALENDAR: "Google Calendar Booking",
    TELEGRAM: "Connect Telegram Bot",
    SLACK: "Connect Slack Workspace",
    TRENDYOL: "Trendyol Mağazasını Bağla",
  };

  const descriptions: Record<string, string> = {
    WHATSAPP: "Link your WhatsApp Business account using the secure Meta OAuth flow.",
    INSTAGRAM: "Connect your Instagram Professional DM account to your AI agent.",
    FACEBOOK: "Allow your agent to respond to Facebook Page messages automatically.",
    SHOPIFY: "Integrate your Shopify store so the AI can search products, check stock, and answer customer questions in real-time.",
    WOOCOMMERCE: "Connect your WooCommerce store to sync your product catalog and enable intelligent inventory lookups.",
    GOOGLE_CALENDAR: "Allow the AI to book appointments directly to your primary calendar.",
    TELEGRAM: "Connect your Telegram bot created via BotFather to enable AI-powered messaging.",
    SLACK: "Connect a Slack channel so your AI agent can respond to workspace messages.",
    TRENDYOL: "Trendyol satıcı hesabınızı bağlayarak AI'nın ürün araması ve sipariş sorgulama yapmasını sağlayın.",
  };

  const isMetaType = type === "WHATSAPP" || type === "INSTAGRAM" || type === "FACEBOOK";

  const resetForm = () => {
    setShopDomain("");
    setShopifyToken("");
    setWooBaseUrl("");
    setWooConsumerKey("");
    setWooConsumerSecret("");
    setCalClientId("");
    setCalClientSecret("");
    setCalRefreshToken("");
    setTrendyolSupplierId("");
    setTrendyolApiKey("");
    setTrendyolApiSecret("");
    setTelegramBotToken("");
    setSlackBotToken("");
    setSlackChannelId("");
    setSlackChannelName("");
    setError(null);
  };

  const handleTelegramConnect = async () => {
    if (!telegramBotToken) { setError("Bot token is required"); return; }
    setIsLoading(true); setError(null);
    try {
      const res = await fetch("/api/channels/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, botToken: telegramBotToken }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Telegram @${data.botUsername} connected!`);
        onSuccess(); onOpenChange(false); resetForm();
      } else {
        setError(data.error || "Failed to connect Telegram.");
      }
    } catch { setError("Connection failed."); }
    finally { setIsLoading(false); }
  };

  const handleSlackConnect = async () => {
    if (!slackBotToken || !slackChannelId) { setError("Bot token and channel ID are required"); return; }
    setIsLoading(true); setError(null);
    try {
      const res = await fetch("/api/channels/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, botToken: slackBotToken, channelId: slackChannelId, channelName: slackChannelName }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Slack connected to ${data.workspace}!`);
        onSuccess(); onOpenChange(false); resetForm();
      } else {
        setError(data.error || "Failed to connect Slack.");
      }
    } catch { setError("Connection failed."); }
    finally { setIsLoading(false); }
  };

  const handleMetaConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const platform = type?.toLowerCase() || "whatsapp";
      let endpoint: string;
      if (platform === "instagram") {
        endpoint = `/api/auth/meta/instagram/authorize?chatbotId=${chatbotId}`;
      } else if (platform === "facebook") {
        // Use dedicated Messenger authorize route
        endpoint = `/api/auth/meta/messenger/authorize?chatbotId=${chatbotId}`;
      } else if (platform === "whatsapp") {
        // Dedicated WhatsApp Embedded Signup authorize route
        endpoint = `/api/auth/meta/whatsapp/authorize?chatbotId=${chatbotId}`;
      } else {
        endpoint = `/api/auth/meta?chatbotId=${chatbotId}&platform=${platform}`;
      }
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
          return;
        }
      }
      setError("Failed to initiate Meta OAuth. Please check that META_APP_ID is configured.");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShopifyConnect = async () => {
    if (!shopDomain || !shopifyToken) {
      setError("Store domain and access token are required");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/channels/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, shopDomain, accessToken: shopifyToken }),
      });
      if (res.ok) {
        toast.success("Shopify store connected successfully!");
        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to connect Shopify. Please verify your credentials.");
      }
    } catch (err) {
      setError("Connection failed. Please check your network.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWooConnect = async () => {
    if (!wooBaseUrl || !wooConsumerKey || !wooConsumerSecret) {
      setError("All WooCommerce fields are required");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/channels/woocommerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, baseUrl: wooBaseUrl, consumerKey: wooConsumerKey, consumerSecret: wooConsumerSecret }),
      });
      if (res.ok) {
        toast.success("WooCommerce store connected successfully!");
        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to connect WooCommerce. Please verify your credentials.");
      }
    } catch (err) {
      setError("Connection failed. Please check your network.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/google/authorize?chatbotId=${chatbotId}`);
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to initiate Google Calendar connection.");
      }
    } catch (err) {
      setError("Connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrendyolConnect = async () => {
    if (!trendyolSupplierId || !trendyolApiKey || !trendyolApiSecret) {
      setError("Supplier ID, API Key ve API Secret zorunludur");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/channels/trendyol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, supplierId: trendyolSupplierId, apiKey: trendyolApiKey, apiSecret: trendyolApiSecret }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Trendyol mağazası bağlandı!");
        onSuccess(); onOpenChange(false); resetForm();
      } else {
        setError(data.error || "Trendyol bağlantısı başarısız.");
      }
    } catch { setError("Bağlantı hatası."); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = () => {
    if (isMetaType) return handleMetaConnect();
    if (type === "SHOPIFY") return handleShopifyConnect();
    if (type === "WOOCOMMERCE") return handleWooConnect();
    if (type === "GOOGLE_CALENDAR") return handleCalendarConnect();
    if (type === "TELEGRAM") return handleTelegramConnect();
    if (type === "SLACK") return handleSlackConnect();
    if (type === "TRENDYOL") return handleTrendyolConnect();
  };

  const iconMap: Record<string, React.ReactNode> = {
    WHATSAPP: <MessageSquare className="w-8 h-8 text-white" />,
    INSTAGRAM: <Instagram className="w-8 h-8 text-white" />,
    FACEBOOK: <Facebook className="w-8 h-8 text-white" />,
    SHOPIFY: <ShoppingBag className="w-8 h-8 text-white" />,
    WOOCOMMERCE: <ShoppingCart className="w-8 h-8 text-white" />,
    GOOGLE_CALENDAR: <ShieldCheck className="w-8 h-8 text-white" />,
    TELEGRAM: <Key className="w-8 h-8 text-white" />,
    SLACK: <Link2 className="w-8 h-8 text-white" />,
    TRENDYOL: <ShoppingBag className="w-8 h-8 text-white" />,
  };

  const iconBgMap: Record<string, string> = {
    WHATSAPP: "bg-emerald-500",
    INSTAGRAM: "bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500",
    FACEBOOK: "bg-[#1877F2]",
    SHOPIFY: "bg-[#95bf47]",
    WOOCOMMERCE: "bg-[#96588a]",
    GOOGLE_CALENDAR: "bg-[#4285F4]",
    TELEGRAM: "bg-[#229ED9]",
    SLACK: "bg-[#4A154B]",
    TRENDYOL: "bg-[#F27A1A]",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-[520px] rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="p-10 space-y-8">
          <DialogHeader className="space-y-4">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xl ${iconBgMap[type || "WHATSAPP"]}`}>
              {type && iconMap[type]}
            </div>
            <div className="text-center space-y-2">
              <DialogTitle className="text-2xl font-black tracking-tight text-zinc-900">{type ? titles[type] : ""}</DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium">{type ? descriptions[type] : ""}</DialogDescription>
            </div>
          </DialogHeader>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 animate-in fade-in duration-300">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Meta OAuth */}
          {isMetaType && (
            <div className="space-y-6">
              <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-zinc-950 flex items-center justify-center text-white shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">Secure OAuth Connection</p>
                  <p className="text-xs text-zinc-500 font-medium leading-relaxed mt-1">
                    Meta will allow you to select which pages or business accounts to connect. No login credentials will be stored on our servers.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-16 rounded-3xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <Facebook className="w-6 h-6 fill-white" />
                    Login with Facebook
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Shopify */}
          {type === "SHOPIFY" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">
                  Store Domain
                </Label>
                <div className="relative">
                  <Input 
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-medium focus:bg-white transition-all shadow-none"
                    placeholder="mystore.myshopify.com" 
                  />
                  <Globe className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">
                  Admin API Access Token
                </Label>
                <div className="relative">
                  <Input 
                    value={shopifyToken}
                    onChange={(e) => setShopifyToken(e.target.value)}
                    type="password"
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-mono text-xs focus:bg-white transition-all shadow-none"
                    placeholder="shpat_..." 
                  />
                  <Key className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                  <strong>How to get your token:</strong> Go to Shopify Admin → Settings → Apps → Develop apps → Create an app → Configure Admin API scopes (read_products) → Install → Copy the Admin API access token.
                </p>
              </div>
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || !shopDomain || !shopifyToken}
                className="w-full h-16 rounded-3xl bg-zinc-950 hover:bg-zinc-900 text-white font-black text-lg shadow-2xl shadow-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <Link2 className="w-5 h-5 mr-2" />
                    Connect Shopify
                  </>
                )}
              </Button>
            </div>
          )}

          {/* WooCommerce */}
          {type === "WOOCOMMERCE" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">
                  Site URL
                </Label>
                <div className="relative">
                  <Input 
                    value={wooBaseUrl}
                    onChange={(e) => setWooBaseUrl(e.target.value)}
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-medium focus:bg-white transition-all shadow-none"
                    placeholder="https://mystore.com" 
                  />
                  <Globe className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">
                  Consumer Key
                </Label>
                <div className="relative">
                  <Input 
                    value={wooConsumerKey}
                    onChange={(e) => setWooConsumerKey(e.target.value)}
                    type="password"
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-mono text-xs focus:bg-white transition-all shadow-none"
                    placeholder="ck_..." 
                  />
                  <Key className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">
                  Consumer Secret
                </Label>
                <div className="relative">
                  <Input 
                    value={wooConsumerSecret}
                    onChange={(e) => setWooConsumerSecret(e.target.value)}
                    type="password"
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-mono text-xs focus:bg-white transition-all shadow-none"
                    placeholder="cs_..." 
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                <p className="text-[11px] text-purple-800 font-medium leading-relaxed">
                  <strong>How to get your keys:</strong> Go to WooCommerce → Settings → Advanced → REST API → Add Key → Set permissions to Read → Generate. Copy the Consumer Key and Secret.
                </p>
              </div>
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || !wooBaseUrl || !wooConsumerKey || !wooConsumerSecret}
                className="w-full h-16 rounded-3xl bg-[#96588a] hover:bg-[#7d4874] text-white font-black text-lg shadow-2xl shadow-purple-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <Link2 className="w-5 h-5 mr-2" />
                    Connect WooCommerce
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Telegram */}
          {type === "TELEGRAM" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Bot Token</Label>
                <div className="relative">
                  <Input
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    type="password"
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-mono text-xs focus:bg-white transition-all shadow-none"
                    placeholder="1234567890:ABCDEFGhijklmnopqrstuvwxyz"
                  />
                  <Key className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4">
                <p className="text-[11px] text-sky-800 font-medium leading-relaxed">
                  <strong>How to get your token:</strong> Open Telegram → search <strong>@BotFather</strong> → /newbot → follow the steps → copy the token provided.
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !telegramBotToken}
                className="w-full h-16 rounded-3xl bg-[#229ED9] hover:bg-[#1a8fc2] text-white font-black text-lg shadow-2xl shadow-sky-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><Link2 className="w-5 h-5 mr-2" />Connect Telegram</>
                )}
              </Button>
            </div>
          )}

          {/* Slack */}
          {type === "SLACK" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Bot User OAuth Token</Label>
                <div className="relative">
                  <Input
                    value={slackBotToken}
                    onChange={(e) => setSlackBotToken(e.target.value)}
                    type="password"
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-mono text-xs focus:bg-white transition-all shadow-none"
                    placeholder="xoxb-..."
                  />
                  <Key className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Channel ID</Label>
                <div className="relative">
                  <Input
                    value={slackChannelId}
                    onChange={(e) => setSlackChannelId(e.target.value)}
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-mono text-xs focus:bg-white transition-all shadow-none"
                    placeholder="C0XXXXXXXX"
                  />
                  <Globe className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Channel Name (optional)</Label>
                <Input
                  value={slackChannelName}
                  onChange={(e) => setSlackChannelName(e.target.value)}
                  className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-4 font-medium focus:bg-white transition-all shadow-none"
                  placeholder="#general"
                />
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                <p className="text-[11px] text-purple-800 font-medium leading-relaxed">
                  <strong>Setup:</strong> Create a Slack App → Add <em>chat:write</em> & <em>channels:history</em> permissions → Install to workspace → Copy Bot User OAuth Token. Set your Event Subscriptions URL to <strong>/api/webhooks/slack</strong>.
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !slackBotToken || !slackChannelId}
                className="w-full h-16 rounded-3xl bg-[#4A154B] hover:bg-[#3b1039] text-white font-black text-lg shadow-2xl shadow-purple-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><Link2 className="w-5 h-5 mr-2" />Connect Slack</>
                )}
              </Button>
            </div>
          )}

          {/* Trendyol */}
          {type === "TRENDYOL" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Supplier ID</Label>
                <div className="relative">
                  <Input
                    value={trendyolSupplierId}
                    onChange={(e) => setTrendyolSupplierId(e.target.value)}
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-mono text-xs focus:bg-white transition-all shadow-none"
                    placeholder="123456"
                  />
                  <Globe className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">API Key</Label>
                <div className="relative">
                  <Input
                    value={trendyolApiKey}
                    onChange={(e) => setTrendyolApiKey(e.target.value)}
                    type="password"
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-mono text-xs focus:bg-white transition-all shadow-none"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <Key className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">API Secret</Label>
                <div className="relative">
                  <Input
                    value={trendyolApiSecret}
                    onChange={(e) => setTrendyolApiSecret(e.target.value)}
                    type="password"
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 pl-12 font-mono text-xs focus:bg-white transition-all shadow-none"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <p className="text-[11px] text-orange-800 font-medium leading-relaxed">
                  <strong>Bilgileri nereden alırsınız:</strong> Trendyol Satıcı Paneli → Entegrasyon Bilgileri → API Entegrasyonu sayfasından Satıcı ID, API Key ve API Secret bilgilerinizi kopyalayın.
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !trendyolSupplierId || !trendyolApiKey || !trendyolApiSecret}
                className="w-full h-16 rounded-3xl bg-[#F27A1A] hover:bg-[#d96a15] text-white font-black text-lg shadow-2xl shadow-orange-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><Link2 className="w-5 h-5 mr-2" />Trendyol Bağla</>
                )}
              </Button>
            </div>
          )}

          {/* Google Calendar */}
          {type === "GOOGLE_CALENDAR" && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                  <strong>Google Calendar Bağlantısı:</strong> Chatbot'unuzun randevuları doğrudan takviminize kaydedebilmesi ve çakışmaları kontrol edebilmesi için Google hesabınızı bağlayın.
                </p>
              </div>
              <Button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-16 rounded-3xl bg-[#4285F4] hover:bg-[#3367d6] text-white font-black text-lg shadow-2xl shadow-blue-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <Link2 className="w-5 h-5 mr-2" />
                    Google ile Bağlan
                  </>
                )}
              </Button>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
              Secured by JCaesar Intelligence Shield
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
