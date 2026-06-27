"use client";

import { useState } from "react";
import { 
  MessageSquare, 
  Instagram, 
  Facebook, 
  CheckCircle2, 
  XCircle, 
  Settings2, 
  Link2Off,
  Loader2,
  ChevronRight,
  ShoppingBag,
  ShoppingCart,
  Calendar
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface ChannelCardProps {
  type: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "SHOPIFY" | "WOOCOMMERCE" | "GOOGLE_CALENDAR" | "TRENDYOL";
  status: "CONNECTED" | "DISCONNECTED" | "ERROR" | "PENDING";
  name: string;
  details?: string;
  onConnect: () => void;
  onDisconnect?: () => void;
  onConfigure?: () => void;
  onFinishSetup?: () => void;
  isLoading?: boolean;
}

export function ChannelCard({
  type,
  status,
  name,
  details,
  onConnect,
  onDisconnect,
  onConfigure,
  onFinishSetup,
  isLoading = false
}: ChannelCardProps) {
  const t = useTranslations("Dashboard.channels");
  const isConnected = status === "CONNECTED";

  const statusLabels = {
    CONNECTED: t("status.connected"),
    DISCONNECTED: t("status.disconnected"),
    ERROR: t("status.error"),
    PENDING: t("status.pending")
  };

  const icons = {
    WHATSAPP: <MessageSquare className="w-6 h-6 text-emerald-500" />,
    INSTAGRAM: <Instagram className="w-6 h-6 text-pink-500" />,
    FACEBOOK: <Facebook className="w-6 h-6 text-blue-600" />,
    SHOPIFY: <ShoppingBag className="w-6 h-6 text-[#95bf47]" />,
    WOOCOMMERCE: <ShoppingCart className="w-6 h-6 text-[#96588a]" />,
    GOOGLE_CALENDAR: <Calendar className="w-6 h-6 text-[#4285F4]" />,
    TRENDYOL: <ShoppingBag className="w-6 h-6 text-[#F27A1A]" />
  };

  const statusColors = {
    CONNECTED: "bg-green-50 text-green-600 border-green-200",
    DISCONNECTED: "bg-zinc-50 text-zinc-500 border-zinc-200",
    ERROR: "bg-red-50 text-red-600 border-red-200",
    PENDING: "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
  };

  return (
    <Card className="rounded-[32px] border-2 border-zinc-100 bg-white hover:border-zinc-200 transition-all overflow-hidden group">
      <CardContent className="p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:scale-110 transition-transform duration-300">
              {icons[type]}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900">{name}</h3>
                <Badge variant="outline" className={`rounded-full px-2 py-0 text-[10px] font-black uppercase tracking-tighter ${statusColors[status]}`}>
                  {statusLabels[status]}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                {details || (isConnected ? t("subtitle") : t("status.disconnected"))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-2">
                {onConfigure && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-xl h-10 w-10 hover:bg-zinc-100"
                    onClick={onConfigure}
                  >
                    <Settings2 className="w-4 h-4 text-zinc-400" />
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10">
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl border-zinc-200">
                    <DropdownMenuItem 
                      onClick={onDisconnect}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 font-bold text-xs"
                    >
                      <Link2Off className="w-4 h-4 mr-2" />
                      {t("disconnect")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : status === "PENDING" ? (
              <Button 
                onClick={onFinishSetup || onConnect}
                disabled={isLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 px-6 font-bold text-xs shadow-lg shadow-amber-500/20"
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : t("status.pending")}
              </Button>
            ) : (
              <Button 
                onClick={onConnect}
                disabled={isLoading}
                className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl h-10 px-6 font-bold text-xs shadow-lg shadow-black/5"
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : t("connect")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
