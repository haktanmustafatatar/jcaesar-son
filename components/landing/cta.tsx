"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function CTA() {
  const t = useTranslations("Landing.CTA");

  return (
    <section className="py-24 lg:py-40 bg-zinc-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-12">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="space-y-6"
        >
          <h2 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9]">
            {t("title")} <br />
            <span className="text-primary italic">{t("subtitle")}</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-6"
        >
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-white text-zinc-950 hover:bg-zinc-200 px-10 h-16 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all active:scale-95 group shadow-2xl shadow-white/5"
            >
              {t("primary")}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="outline"
              size="lg"
              className="h-16 px-10 rounded-[24px] font-black text-sm uppercase tracking-widest border-white/10 bg-transparent text-white hover:bg-white/10 transition-all active:scale-95 translate-y-0.5"
            >
              {t("secondary")}
            </Button>
          </Link>
        </motion.div>

        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           viewport={{ once: true }}
           transition={{ delay: 0.3 }}
           className="flex items-center justify-center gap-8 pt-8 border-t border-white/5"
        >
           <div className="flex items-center gap-2 group cursor-pointer">
              <Zap className="w-5 h-5 text-primary fill-primary/20" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">{t("instant")}</span>
           </div>
           <div className="flex items-center gap-2 group cursor-pointer">
              <Zap className="w-5 h-5 text-primary fill-primary/20" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">{t("security")}</span>
           </div>
        </motion.div>
      </div>
    </section>
  );
}
