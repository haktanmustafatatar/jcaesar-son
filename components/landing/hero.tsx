"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, MessageCircle, BarChart3, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

export function Hero() {
  const t = useTranslations("Hero");
  const tCommon = useTranslations("Common");

  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content side */}
          <div className="relative z-10 space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="px-4 py-1.5 rounded-full bg-white/50 backdrop-blur-md border border-black/[0.05] shadow-sm text-primary font-bold text-xs gap-2">
                <Sparkles className="w-3.5 h-3.5 fill-primary/20" />
                {t("badge")}
              </Badge>
            </motion.div>

            <div className="space-y-4">
               <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-zinc-900"
               >
                  {t("title1")} <span className="text-primary translate-y-2 inline-block">{t("titleElite")}</span> <br />
                  {t("title2")}
               </motion.h1>
               <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-zinc-500 font-medium max-w-xl leading-relaxed"
               >
                  {t("description")}
               </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Link href="/sign-up">
                <Button size="lg" className="h-14 px-10 rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800 font-bold text-base shadow-2xl shadow-zinc-950/20 group relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   {tCommon("earlyAccess")}
                   <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-14 px-10 rounded-2xl border-black/10 font-bold text-base hover:bg-white shadow-sm transition-all group">
                <Play className="mr-2 w-5 h-5 fill-zinc-900" />
                {tCommon("demo")}
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="pt-4 flex items-center gap-8 border-t border-black/[0.03]"
            >
               <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-zinc-200" />
                  ))}
               </div>
               <div>
                  <p className="text-sm font-bold text-zinc-800">{t("trusted")}</p>
                  <p className="text-xs text-zinc-400 font-medium tracking-tight uppercase">{t("scaling")}</p>
               </div>
            </motion.div>
          </div>

          {/* Elite Preview side */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative perspective-1000 hidden lg:block"
          >
             {/* Main Dashboard Preview Card */}
             <div className="relative z-10 bg-white/40 backdrop-blur-3xl rounded-[48px] p-2 border border-white/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden">
                <div className="bg-white rounded-[40px] p-8 space-y-8">
                   {/* Mock Header */}
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><BarChart3 className="w-5 h-5" /></div>
                        <div>
                           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{t("intelligence")}</p>
                           <p className="text-lg font-black text-zinc-900 tracking-tight">{t("performance")}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                         <div className="w-2.5 h-2.5 rounded-full bg-zinc-100" />
                         <div className="w-2.5 h-2.5 rounded-full bg-zinc-100" />
                         <div className="w-2.5 h-2.5 rounded-full bg-zinc-100" />
                      </div>
                   </div>

                   {/* Mock Metrics */}
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-3xl bg-zinc-50 border border-black/[0.02] space-y-1">
                         <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{t("resolutions")}</p>
                         <p className="text-2xl font-black text-zinc-900 leading-none">94.2%</p>
                         <div className="h-1 w-full bg-primary/10 rounded-full mt-2 overflow-hidden">
                            <div className="h-full w-[94%] bg-primary rounded-full" />
                         </div>
                      </div>
                      <div className="p-4 rounded-3xl bg-zinc-50 border border-black/[0.02] space-y-1">
                         <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{t("activeAgents")}</p>
                         <p className="text-2xl font-black text-zinc-900 leading-none">12</p>
                         <div className="flex gap-1 mt-2">
                            {[1,1,1,0].map((v, i) => (
                               <div key={i} className={`h-1 flex-1 rounded-full ${v ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
                            ))}
                         </div>
                      </div>
                   </div>

                   {/* Mock Chat UI */}
                   <div className="space-y-4 pt-4 border-t border-black/[0.03]">
                      <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-xl bg-zinc-100 flex-shrink-0" />
                         <div className="p-3 bg-zinc-100 rounded-2xl rounded-tl-sm text-[11px] font-medium text-zinc-600 max-w-[80%]">
                            {t("mockChatQ")}
                         </div>
                      </div>
                      <div className="flex gap-3 justify-end items-end">
                         <div className="p-3 bg-primary text-white rounded-2xl rounded-br-sm text-[11px] font-bold max-w-[80%] shadow-lg shadow-primary/20">
                            {t("mockChatA")}
                         </div>
                         <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary"><Zap className="w-4 h-4 fill-primary" /></div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Floating Elements Around Preview */}
             <motion.div
               animate={{ y: [0, -15, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -top-10 -right-10 w-48 h-48 bg-white rounded-[32px] shadow-2xl p-6 border border-white/50 space-y-4 z-20"
             >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><ShieldCheck className="w-5 h-5" /></div>
                   <div className="h-2 w-16 bg-zinc-100 rounded-full" />
                </div>
                <div className="space-y-2">
                   <div className="h-2.5 w-full bg-zinc-100 rounded-full" />
                   <div className="h-2.5 w-[80%] bg-zinc-100 rounded-full" />
                   <div className="h-2.5 w-[60%] bg-zinc-100 rounded-full" />
                </div>
             </motion.div>

             <motion.div
               animate={{ y: [0, 15, 0] }}
               transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
               className="absolute -bottom-6 -left-20 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-5 border border-white/50 flex items-center gap-4 z-20"
             >
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><MessageCircle className="w-6 h-6" /></div>
                <div>
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">{t("growthRate")}</p>
                   <p className="text-xl font-black text-zinc-900 leading-tight">+240%</p>
                </div>
             </motion.div>

             {/* Background Glows for Preview */}
             <div className="absolute inset-0 bg-primary/20 blur-[100px] -z-10 scale-75 rotate-12" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
