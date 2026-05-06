"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isSignedIn } = useAuth();
  const [mounted, setMounted] = useState(false);
  const tCommon = useTranslations("Common");
  const t = useTranslations("Landing.Navigation");

  const navLinks = [
    { href: "#features", label: t("features") },
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#pricing", label: t("pricing") },
    { href: "#faq", label: t("faq") },
  ];

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? "py-3 bg-white/70 backdrop-blur-2xl border-b border-black/[0.03] shadow-lg shadow-black/[0.02]" 
          : "py-6 bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center bg-white/30 backdrop-blur-sm rounded-3xl px-6 py-2 border border-white/20 shadow-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-40 h-12 md:w-52 md:h-16 overflow-hidden transition-all duration-500 group-hover:scale-105">
              <Image 
                src="/logo.svg" 
                alt="JCaesar Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-bold text-zinc-600 hover:text-primary transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          {/* Auth Actions & Language Switcher */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <div className="w-px h-6 bg-black/10 mx-2" />
            {mounted && (
              <>
                {isSignedIn ? (
                  <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                      <Button variant="ghost" className="font-bold text-sm h-10 px-6 rounded-xl hover:bg-primary/5 hover:text-primary transition-all">
                        {t("dashboard")}
                      </Button>
                    </Link>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Link href="/sign-in">
                      <Button variant="ghost" className="font-bold text-sm h-10 px-6 rounded-xl hover:bg-primary/5 transition-all">
                        {tCommon("login")}
                      </Button>
                    </Link>
                    <Link href="/sign-up">
                      <Button className="font-bold text-sm h-11 px-8 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-950/20 transition-all group active:scale-95">
                        {tCommon("getStarted")}
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            title="Menu"
            className="md:hidden p-2 text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 backdrop-blur-xl border-b border-black/[0.05] overflow-hidden"
          >
            <div className="px-6 py-8 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-lg font-bold text-zinc-800 hover:text-primary transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-black/[0.05]" />
              {/* Language Switcher — Mobile */}
              <div className="pt-1">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Dil / Language</p>
                <LanguageSwitcher />
              </div>
              <hr className="border-black/[0.05]" />
              <div className="flex flex-col gap-3 pt-2">
                <Link href="/sign-in" className="w-full">
                  <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-black/10">
                    {tCommon("login")}
                  </Button>
                </Link>
                <Link href="/sign-up" className="w-full">
                  <Button className="w-full h-12 rounded-xl font-bold bg-primary text-white">
                    {tCommon("getStarted")}
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
