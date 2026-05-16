"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Star, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EnterpriseForm } from "./enterprise-form";

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);
  const [isEnterpriseFormOpen, setIsEnterpriseFormOpen] = useState(false);
  const t = useTranslations("Landing.Pricing");

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/plans");
      if (res.ok) {
        const data = await res.json();
        setDbPlans(data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCheckout = async (planId: string) => {
    setIsCheckoutLoading(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, isYearly }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        if (res.status === 401) {
          window.location.href = "/sign-in";
        } else {
          alert(data.error || "Checkout failed");
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsCheckoutLoading(null);
    }
  };

  const plans = useMemo(() => {
    if (dbPlans.length === 0) return [];

    return dbPlans
      .sort((a, b) => {
        if (a.slug === "enterprise") return 1;
        if (b.slug === "enterprise") return -1;
        return (a.priceMonthly || 0) - (b.priceMonthly || 0);
      })
      .map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || t(`plans.${p.name}.description`),
      monthlyPrice: p.priceMonthly,
      yearlyPrice: p.priceYearly,
      features: Array.isArray(p.features) && p.features.length > 0 ? p.features : [
        `${p.chatbotLimit} AI Chatbots`,
        `${p.messageLimit.toLocaleString()} Messages / mo`,
        "Knowledge Base & RAG",
        "Analytics Dashboard"
      ],
      cta: p.slug === "enterprise" ? "İletişime Geç" : t("plans.Elite.cta"),
      isEnterprise: p.slug === "enterprise",
      popular: p.isPopular,
      color: p.isPopular ? "primary" : "zinc"
    }));
  }, [t, dbPlans]);

  return (
    <section id="pricing" className="py-32 bg-zinc-50/50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-black/5 text-zinc-500 text-[10px] font-black uppercase tracking-widest"
          >
            <Star className="w-3 h-3 fill-zinc-400" />
            {t("badge")}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter text-zinc-900 leading-[0.95]"
          >
             {t("title")} <br />
             <span className="text-primary italic">{t("subtitle")}</span>
          </motion.h2>
          
          {/* Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-6 pt-4"
          >
            <span className={`text-sm font-bold transition-colors ${!isYearly ? "text-zinc-900" : "text-zinc-400"}`}>{t("monthly")}</span>
            <div className="relative p-1 bg-zinc-200 rounded-full w-14 h-8 flex items-center">
               <motion.div 
                  animate={{ x: isYearly ? 24 : 0 }}
                  className="w-6 h-6 bg-white rounded-full shadow-sm cursor-pointer"
                  onClick={() => setIsYearly(!isYearly)}
               />
            </div>
            <span className={`text-sm font-bold transition-colors ${isYearly ? "text-zinc-900" : "text-zinc-400"}`}>{t("yearly")}</span>
            {isYearly && (
              <Badge className="bg-emerald-500 text-white border-none rounded-full py-1 px-3 text-[10px] font-black animate-pulse">{t("save")}</Badge>
            )}
          </motion.div>
        </div>

        {/* Plans Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
              className={`group relative p-10 rounded-[48px] border bg-white flex flex-col transition-all duration-500 ${
                plan.popular
                  ? "border-primary/20 shadow-[0_48px_96px_-24px_rgba(0,0,0,0.12)] ring-1 ring-primary/10 lg:-translate-y-4"
                  : "border-black/5 hover:border-black/10 hover:shadow-xl"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                   <Badge className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-xl shadow-primary/30">{t("popular")}</Badge>
                </div>
              )}

              <div className="mb-10 space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-zinc-900 uppercase tracking-tighter">{plan.name}</h3>
                <p className="text-sm font-medium text-zinc-500">{plan.description}</p>
              </div>

              <div className="mb-10 min-h-[80px] flex items-end">
                {plan.isEnterprise ? (
                  <div className="text-4xl font-black tracking-tighter text-zinc-900 leading-none">Özel Teklif<br/><span className="text-sm text-zinc-400 font-bold uppercase tracking-widest italic">Kurumsal Altyapı</span></div>
                ) : plan.monthlyPrice ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black tracking-tighter text-zinc-900">
                        ₺{isYearly 
                          ? (plan.yearlyPrice / 12).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) 
                          : (plan.monthlyPrice || 0).toLocaleString('tr-TR')}
                      </span>
                      <span className="text-zinc-400 font-bold text-sm">{t("perMonth")}</span>
                    </div>
                    {isYearly && plan.yearlyPrice && (
                      <div className="absolute -bottom-6 left-0 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                        Yıllık faturalandırılır: ₺{plan.yearlyPrice.toLocaleString('tr-TR')}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-5xl font-black tracking-tighter text-zinc-900 leading-none">{t("contact")}<br/><span className="text-lg text-zinc-400">{t("architecture")}</span></div>
                )}
              </div>

              <div className="space-y-6 mb-12 flex-1">
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t("everythingIn", { name: plan.name })}</p>
                 <ul className="space-y-4">
                   {plan.features.map((feature) => (
                     <li key={feature} className="flex items-start gap-3">
                       <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.popular ? 'bg-primary/10 text-primary' : 'bg-zinc-100 text-zinc-400'}`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                       </div>
                       <span className="text-sm font-bold text-zinc-700">{feature}</span>
                     </li>
                   ))}
                 </ul>
              </div>

              <Button
                onClick={() => {
                  if (plan.isEnterprise) {
                    setIsEnterpriseFormOpen(true);
                  } else if (plan.id) {
                    handleCheckout(plan.id);
                  }
                }}
                disabled={!!isCheckoutLoading}
                className={`w-full h-16 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all active:scale-95 group/btn ${
                  plan.popular
                    ? "bg-zinc-950 text-white hover:bg-zinc-900 shadow-2xl shadow-zinc-950/20"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {isCheckoutLoading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <>
                    {plan.cta}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              
              {plan.popular && (
                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                   <ShieldCheck className="w-4 h-4" />
                   {t("security")}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Background Decorative */}
      <div className="absolute top-0 right-0 w-[60%] h-[100%] bg-zinc-100/50 -rotate-12 translate-x-1/2 -z-10 rounded-[100px]" />

      <EnterpriseForm open={isEnterpriseFormOpen} onOpenChange={setIsEnterpriseFormOpen} />
    </section>
  );
}
