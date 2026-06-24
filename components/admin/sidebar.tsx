"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  Key,
  Coins,
  Package,
  Share2,
  Activity,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Database,
  Cpu,
  Zap,
  Globe,
  Lock,
  History,
  MessageSquare,
  Ticket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const t = useTranslations("Admin.sidebar");

  const navItems = [
    { href: "/admin", label: t("overview"), icon: LayoutDashboard, category: t("categories.core") },
    { href: "/admin/users", label: t("users"), icon: Users, category: t("categories.core") },
    { href: "/admin/chatbots", label: t("chatbots"), icon: Cpu, category: t("categories.core") },
    
    { href: "/admin/plans", label: t("plans"), icon: Package, category: t("categories.commerce") },
    { href: "/admin/tokens", label: t("tokens"), icon: Coins, category: t("categories.commerce") },
    { href: "/admin/coupons", label: "Kuponlar", icon: Ticket, category: t("categories.commerce") },
    { href: "/admin/leads", label: "Talepler", icon: MessageSquare, category: t("categories.commerce") },
    
    { href: "/admin/channels", label: "Kanallar", icon: Share2, category: t("categories.system") },
    { href: "/admin/api-keys", label: t("apiKeys"), icon: Key, category: t("categories.system") },
    { href: "/admin/system", label: t("system"), icon: Database, category: t("categories.system") },
    { href: "/admin/audit", label: t("auditLogs"), icon: History, category: t("categories.system") },
    { href: "/admin/settings", label: t("settings"), icon: Settings, category: t("categories.system") },
  ];

  useEffect(() => {
    fetch("/api/admin/health")
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: "error" }));
  }, []);

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-500 border-r border-white/5 bg-zinc-950 text-white flex flex-col group/sidebar shadow-2xl overflow-hidden",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Glossy Header Effect */}
      <div className="absolute top-0 left-0 w-full h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(226,91,49,0.1),transparent)] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center justify-between p-6 mb-4 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="flex items-center gap-4 w-full"
            >
              <div className="relative w-56 h-14 overflow-hidden shrink-0">
                <Image 
                  src="/logo.svg" 
                  alt="JCaesar Logo" 
                  fill
                  className="object-contain object-left invert brightness-0"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isCollapsed && (
          <div className="relative w-12 h-12 overflow-hidden mx-auto">
             <Image 
               src="/logo.svg" 
               alt="JCaesar Logo" 
               fill
               className="object-contain invert brightness-0"
             />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-8 overflow-y-auto scrollbar-hide py-4">
        {[t("categories.core"), t("categories.commerce"), t("categories.system")].map(category => (
           <div key={category} className="space-y-2">
             {!isCollapsed && (
               <p className="px-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">{category}</p>
             )}
             <div className="space-y-1">
               {navItems.filter(item => item.category === category).map((item) => {
                 const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                 return (
                   <Link
                     key={item.href}
                     href={item.href as any}
                     className={cn(
                       "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 relative group",
                       isActive
                         ? "text-white bg-white/5 shadow-inner"
                         : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                     )}
                   >
                     {isActive && (
                       <motion.div 
                         layoutId="active-pill" 
                         className="absolute left-0 w-1 h-6 bg-primary rounded-full" 
                         transition={{ type: "spring", stiffness: 300, damping: 30 }}
                       />
                     )}
                     <item.icon className={cn(
                       "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                       isActive ? "text-primary" : "text-zinc-500"
                     )} />
                     {!isCollapsed && <span>{item.label}</span>}
                     {item.href === "/admin/system" && !isCollapsed && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-glow shadow-green-500/50" />
                     )}
                   </Link>
                 );
               })}
             </div>
           </div>
        ))}
      </nav>

      {/* Footer System Status */}
      <div className={cn(
        "p-6 border-t border-white/5 space-y-6 bg-zinc-900/10 backdrop-blur-3xl relative z-10",
        isCollapsed && "items-center"
      )}>
        {!isCollapsed && (
           <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t("status.global")}</span>
                 <Badge variant="outline" className="rounded-full h-5 text-[9px] font-black uppercase text-green-500 border-green-500/20 bg-green-500/10">{t("status.stable")}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <div className="bg-white/5 p-3 rounded-2xl flex flex-col gap-1">
                    <Database className="w-3 h-3 text-blue-400" />
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t("status.dbSync")}</span>
                    <span className="text-[10px] font-bold text-white">99.9%</span>
                 </div>
                 <div className="bg-white/5 p-3 rounded-2xl flex flex-col gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t("status.load")}</span>
                    <span className="text-[10px] font-bold text-white">{t("status.low")}</span>
                 </div>
              </div>
           </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative group/user">
             <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-10 h-10 rounded-2xl", } }} />
             <div className="absolute inset-0 bg-primary/20 rounded-2xl blur group-hover/user:opacity-100 opacity-0 transition-opacity" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">{t("role")}</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t("access")}</p>
            </div>
          )}
          <button 
             onClick={() => setIsCollapsed(!isCollapsed)}
             className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
          >
             {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
