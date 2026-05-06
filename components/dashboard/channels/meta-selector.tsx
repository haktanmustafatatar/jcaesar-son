"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Loader2, 
  Facebook, 
  Instagram, 
  Phone,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";

interface MetaSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  chatbotId: string;
  onSuccess: () => void;
}

export function MetaSelector({
  open,
  onOpenChange,
  sessionId,
  chatbotId,
  onSuccess
}: MetaSelectorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [pendingChannel, setPendingChannel] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchPendingChannels();
    }
  }, [open]);

  const fetchPendingChannels = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/channels`);
      if (res.ok) {
        const allChannels = await res.json();
        // Find pending Meta channels (from OAuth callback)
        const pending = allChannels.find((c: any) => 
          c.status === "PENDING" && 
          ["WHATSAPP", "INSTAGRAM", "FACEBOOK"].includes(c.type)
        );
        if (pending) {
          setPendingChannel(pending);
        }
        setChannels(allChannels);
      }
    } catch (error) {
      toast.error("Failed to load connection data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedId || !pendingChannel) return;
    setIsSubmitting(true);
    try {
      const config = pendingChannel.config as any;
      
      // Update the channel with the selected page/phone number
      const res = await fetch(`/api/chatbots/${chatbotId}/channels/meta-finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: pendingChannel.id,
          selectedId,
          type: pendingChannel.type,
        }),
      });

      if (res.ok) {
        toast.success("Channel connected successfully!");
        onSuccess();
        onOpenChange(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to finalize connection");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountsList = (): { id: string; name: string; username?: string; pageName?: string }[] => {
    if (!pendingChannel) return [];
    const config = pendingChannel.config as any;

    if (pendingChannel.type === "WHATSAPP") {
      // WhatsApp: show businesses from the OAuth callback
      const businesses = config.businesses || [];
      return businesses.map((b: any) => ({
        id: b.id,
        name: b.name || "WhatsApp Business Account",
      }));
    }

    if (pendingChannel.type === "INSTAGRAM") {
      // Instagram: filter pages that have IG business accounts
      const pages = config.pages || [];
      return pages
        .filter((p: any) => p.instagram_business_account)
        .map((p: any) => ({
          id: p.instagram_business_account?.id || p.id,
          name: p.instagram_business_account?.name || p.instagram_business_account?.username || p.name,
          username: p.instagram_business_account?.username,
          pageName: p.name
        }));
    }

    // Facebook Messenger: show pages
    const pages = config.pages || [];
    return pages.map((p: any) => ({
      id: p.id,
      name: p.name,
    }));
  };

  const accounts = getAccountsList();

  const typeIcons: Record<string, React.ReactNode> = {
    INSTAGRAM: <Instagram className="w-6 h-6 text-pink-500" />,
    FACEBOOK: <Facebook className="w-6 h-6 text-blue-600" />,
    WHATSAPP: <MessageSquare className="w-6 h-6 text-emerald-500" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[32px] border-2 border-zinc-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            {pendingChannel && typeIcons[pendingChannel.type]}
            Select Account
          </DialogTitle>
          <DialogDescription className="font-medium text-zinc-500">
            Choose which {pendingChannel?.type?.toLowerCase() || "social"} account to connect to this chatbot.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Retrieving Assets...</p>
            </div>
          ) : !pendingChannel ? (
            <div className="bg-zinc-50 border border-zinc-100 p-6 rounded-2xl flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-zinc-400 shrink-0 mt-1" />
              <div>
                <p className="text-sm font-bold text-zinc-700">No pending connections found</p>
                <p className="text-xs text-zinc-500 mt-1">Please initiate a Meta OAuth connection first from the Channels tab.</p>
              </div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
              <div>
                <p className="text-sm font-bold text-amber-900">No matching accounts found</p>
                <p className="text-xs text-amber-700 mt-1">
                  {pendingChannel?.type === "INSTAGRAM" 
                    ? "Make sure you have a Professional Instagram account linked to a Facebook Page."
                    : pendingChannel?.type === "WHATSAPP"
                    ? "Make sure you have a WhatsApp Business Account linked to your Facebook Business."
                    : "Make sure you have at least one Facebook Page with messaging enabled."}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedId(acc.id)}
                  className={`
                    w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all
                    ${selectedId === acc.id 
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                      : "border-zinc-100 hover:border-zinc-200 bg-zinc-50/50"}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center font-bold text-zinc-400">
                      {acc.name?.charAt(0) || "A"}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-zinc-900">{acc.name}</p>
                      {acc.username && <p className="text-[10px] font-medium text-zinc-400">@{acc.username}</p>}
                      {acc.pageName && <p className="text-[10px] font-medium text-zinc-400">via {acc.pageName}</p>}
                    </div>
                  </div>
                  {selectedId === acc.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            Cancel
          </Button>
          <Button 
            onClick={handleFinalize} 
            disabled={!selectedId || isSubmitting}
            className="rounded-xl px-8 font-bold bg-zinc-950 hover:bg-zinc-900 shadow-lg shadow-black/10"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
