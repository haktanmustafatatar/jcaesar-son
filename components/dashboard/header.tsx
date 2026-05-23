"use client";

import { Link, usePathname } from "@/i18n/routing";
import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSidebar } from "./mobile-sidebar";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "./notification-center";

export function DashboardHeader() {
  const pathname = usePathname();
  const t = useTranslations("Dashboard");
  const segments = pathname.split("/").filter(Boolean);
  
  // segments[0] in usePathname from routing is relative to locale
  // e.g. if URL is /tr/dashboard, usePathname returns /dashboard 
  // splits to ["dashboard"]
  const currentSection = segments[1] || "dashboard";

  const breadcrumbMap: Record<string, string> = {
    dashboard: t("sidebar.dashboard"),
    chatbots: t("sidebar.chatbots"),
    conversations: t("sidebar.conversations"),
    analytics: t("sidebar.analytics"),
    settings: t("sidebar.settings"),
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/5">
      <div className="flex items-center justify-between h-16 px-6 lg:px-8">
        {/* Left */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu */}
          <MobileSidebar />

          {/* Breadcrumb */}
          <nav className="hidden sm:flex items-center gap-2 text-sm font-bold">
            <Link
              href="/dashboard"
              className="text-zinc-500 hover:text-zinc-950 transition-colors"
            >
              {t("sidebar.dashboard")}
            </Link>
            {segments.length > 1 && (
              <>
                <span className="text-zinc-300">/</span>
                <span className="text-zinc-950">
                  {breadcrumbMap[currentSection] || currentSection}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Search removed as per request */}

          <LanguageSwitcher />

          <NotificationCenter />
        </div>
      </div>
    </header>
  );
}
