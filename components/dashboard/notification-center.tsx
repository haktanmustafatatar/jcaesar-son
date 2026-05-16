"use client";

import { useState, useEffect } from "react";
import { Bell, Sparkles, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Failed to mark as read");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "SUGGESTION": return <Sparkles className="w-4 h-4 text-primary" />;
      case "WARNING": return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "CHECK": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-10 w-10 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-all"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-[24px] border-black/5 shadow-2xl bg-white/95 backdrop-blur-xl overflow-hidden">
        <div className="p-5 border-b border-black/5 flex items-center justify-between">
          <h4 className="text-sm font-black uppercase tracking-widest text-zinc-950">Signals</h4>
          {unreadCount > 0 && (
            <Badge className="rounded-lg bg-primary/10 text-primary border-none font-black text-[10px] px-2 py-0.5 uppercase">
              {unreadCount} New
            </Badge>
          )}
        </div>
        <div className="max-h-[350px] overflow-y-auto scrollbar-hide">
          {notifications.length === 0 ? (
            <div className="p-10 text-center space-y-3">
               <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto text-zinc-300">
                  <Bell className="w-6 h-6" />
               </div>
               <p className="text-xs font-bold text-zinc-400">All systems clear. No signals detected.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.03]">
              <AnimatePresence initial={false}>
                {notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-4 hover:bg-zinc-50 transition-colors group relative",
                      !n.read && "bg-primary/[0.02]"
                    )}
                  >
                    <div className="flex gap-4">
                      <div className="mt-1 w-8 h-8 rounded-xl bg-white shadow-sm ring-1 ring-black/[0.03] flex items-center justify-center shrink-0">
                        {getIcon(n.type)}
                      </div>
                      <div className="space-y-1">
                        <p className={cn(
                          "text-xs leading-snug",
                          n.read ? "text-zinc-500 font-medium" : "text-zinc-950 font-black"
                        )}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-3">
                           <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                           {n.link && (
                             <Link 
                                href={n.link as any}
                                onClick={() => {
                                  markAsRead(n.id);
                                  setIsOpen(false);
                                }}
                                className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                             >
                               Optimize Now →
                             </Link>
                           )}
                        </div>
                      </div>
                    </div>
                    {!n.read && (
                      <button 
                        onClick={() => markAsRead(n.id)}
                        className="absolute right-4 top-4 w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Mark as read"
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
        <div className="p-4 bg-zinc-50 border-t border-black/5 text-center">
           <button className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-colors">
              History Archive
           </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
