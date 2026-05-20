"use client";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Settings,
  Menu,
  Users,
  CalendarDays,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useTranslations("Dashboard.sidebar");

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/chatbots", label: t("chatbots"), icon: Bot },
  ];

  const operationsItems = [
    { href: "/dashboard/leads", label: "Müşteriler (CRM)", icon: Users },
    { href: "/dashboard/calendar", label: "Takvim & Randevu", icon: CalendarDays },
  ];

  const footerNavItems = [
    { href: "/dashboard/inbox", label: t("conversations"), icon: MessageSquare },
    { href: "/dashboard/analytics", label: t("analytics"), icon: BarChart3 },
    { href: "/dashboard/docs", label: "Kullanıcı Kılavuzu", icon: BookOpen },
    { href: "/dashboard/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <SheetHeader className="p-4 border-b border-black/5">
          <SheetTitle className="flex items-center gap-3">
             <div className="relative w-40 h-12 overflow-hidden">
                <Image 
                  src="/logo.svg" 
                  alt="JCaesar Logo" 
                  fill
                  className="object-contain object-left"
                />
             </div>
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-[calc(100vh-65px)] overflow-y-auto">
          <nav className="flex-1 px-3 py-4 space-y-6">
            
            {/* Main */}
            <div className="space-y-1">
              <p className="px-3 mb-2 text-[9px] font-black uppercase tracking-widest text-zinc-400">Main</p>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                      isActive
                        ? "bg-zinc-950 text-white shadow-lg shadow-black/5"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-zinc-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Operations */}
            <div className="space-y-1">
              <p className="px-3 mb-2 text-[9px] font-black uppercase tracking-widest text-zinc-400">Operations</p>
              {operationsItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                      isActive
                        ? "bg-zinc-950 text-white shadow-lg shadow-black/5"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-zinc-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* System */}
            <div className="space-y-1">
              <p className="px-3 mb-2 text-[9px] font-black uppercase tracking-widest text-zinc-400">System</p>
              {footerNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                      isActive
                        ? "bg-zinc-950 text-white shadow-lg shadow-black/5"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-zinc-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
