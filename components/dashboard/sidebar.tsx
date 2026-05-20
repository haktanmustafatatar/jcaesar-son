"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useUser, UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Settings,
  Plus,
  Database,
  ChevronLeft,
  ChevronRight,
  Share2,
  Users,
  CalendarDays,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslations("Dashboard.sidebar");

  const chatbotIdMatch = pathname.match(/\/dashboard\/chatbots\/([^\/]+)/);
  const chatbotId = chatbotIdMatch ? chatbotIdMatch[1] : null;
  const isNewChatbot = chatbotId === "new";

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/chatbots", label: t("chatbots"), icon: Bot },
  ];

  const operationItems = [
    { href: "/dashboard/leads", label: "Müşteriler (CRM)", icon: Users },
    { href: "/dashboard/calendar", label: "Takvim & Randevu", icon: CalendarDays },
  ];

  const chatbotNavItems = chatbotId && !isNewChatbot ? [
    { href: `/dashboard/chatbots/${chatbotId}`, label: t("overview") || "Overview", icon: BarChart3 },
    { href: `/dashboard/chatbots/${chatbotId}/integrations`, label: t("integrations") || "Integrations", icon: Share2 },
    { href: `/dashboard/chatbots/${chatbotId}/settings`, label: t("settings"), icon: Settings },
    { href: `/dashboard/chatbots/${chatbotId}/embed`, label: t("embed") || "Embed", icon: Plus },
  ] : [];

  const footerNavItems = [
    { href: "/dashboard/inbox", label: t("conversations"), icon: MessageSquare },
    { href: "/dashboard/analytics", label: t("analytics"), icon: BarChart3 },
    { href: "/dashboard/docs", label: "Kullanıcı Kılavuzu", icon: BookOpen },
    { href: "/dashboard/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-black/5 transition-all duration-300 hidden lg:block",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-black/5">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 w-full",
              collapsed && "justify-center"
            )}
          >
            <div className={cn("relative overflow-hidden transition-all duration-500", 
              collapsed ? "w-12 h-12" : "w-52 h-16"
            )}>
              <Image 
                src="/logo.svg" 
                alt="JCaesar Logo" 
                fill
                className="object-contain object-left"
              />
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("h-8 w-8", collapsed && "hidden")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Collapse Toggle (when collapsed) */}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="m-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {/* New Chatbot Button */}
        <div className={cn("p-4", collapsed && "px-2")}>
          <Link href="/dashboard/chatbots/new">
            <Button
              className={cn(
                "bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl h-11 transition-all shadow-lg shadow-black/5",
                collapsed ? "w-full px-0" : "w-full"
              )}
            >
              <Plus className="w-4 h-4" />
              {!collapsed && <span className="ml-2 font-bold">{t("newChatbot")}</span>}
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-8 overflow-y-auto scrollbar-hide">
          {/* Main Section */}
          <div className="space-y-1">
            {!collapsed && <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Main</p>}
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                    isActive
                      ? "bg-zinc-950 text-white shadow-lg shadow-black/5"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950",
                    collapsed && "justify-center px-1"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-zinc-400")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Operations Section */}
          <div className="space-y-1">
            {!collapsed && <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Operations</p>}
            {operationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                    isActive
                      ? "bg-zinc-950 text-white shadow-lg shadow-black/5"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950",
                    collapsed && "justify-center px-1"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-zinc-400")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Chatbot Specific Section */}
          {chatbotNavItems.length > 0 && (
            <div className="space-y-1">
              {!collapsed && <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Agent</p>}
              {chatbotNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950",
                      collapsed && "justify-center px-1"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-zinc-400")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Footer Section */}
          <div className="space-y-1">
            {!collapsed && <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">System</p>}
            {footerNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                    isActive
                      ? "bg-zinc-950 text-white shadow-lg shadow-black/5"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950",
                    collapsed && "justify-center px-1"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-zinc-400")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-black/5 bg-zinc-50/50">
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed && "justify-center"
            )}
          >
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 rounded-xl",
                },
              }}
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-950 truncate">
                  {user?.fullName || user?.primaryEmailAddress?.emailAddress}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Free Plan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
