"use client";

import { useState, useEffect } from "react";
import { 
  Check, 
  Zap, 
  Shield, 
  Globe, 
  MessageSquare, 
  ArrowRight,
  Bot,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Ticket } from "lucide-react";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function PricingPage() {
  const t = useTranslations("Landing.Pricing");
  const params = useParams();
  const locale = (params?.locale as string) || "tr";

  const [isYearly, setIsYearly] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error(locale === "tr" ? "Lütfen bir kupon kodu girin" : "Please enter a coupon code");
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.discountPercent) {
          // It's a discount coupon! Set the state so it is passed to Stripe Checkout
          setAppliedCoupon({ code: data.code, percent: data.discountPercent });
          toast.success(data.message || (locale === "tr" ? "İndirim kuponu başarıyla uygulandı!" : "Discount coupon successfully applied!"));
          setCouponCode("");
        } else {
          // It's a trial bypass coupon! Keep original redirect behavior
          toast.success(data.message || (locale === "tr" ? "Kupon başarıyla uygulandı! Deneme süreniz başlatılıyor..." : "Coupon applied! Initiating trial..."));
          setCouponCode("");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        }
      } else {
        toast.error(data.error || (locale === "tr" ? "Kupon uygulanamadı" : "Failed to apply coupon"));
      }
    } catch (err) {
      toast.error(locale === "tr" ? "Ağ hatası" : "Network error");
    } finally {
      setIsRedeeming(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/plans");
      if (res.ok) {
        setPlans(await res.json());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    const toastId = toast.loading(locale === "tr" ? "Ödeme sayfası hazırlanıyor..." : "Preparing checkout...");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          planId, 
          interval: isYearly ? "yearly" : "monthly",
          couponCode: appliedCoupon?.code || undefined
        }),
      });

      const data = await res.json();
      toast.dismiss(toastId);

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        if (res.status === 401) {
          toast.error(locale === "tr" ? "Ödeme yapmak için lütfen giriş yapın." : "Please sign in to proceed with checkout.");
          setTimeout(() => {
            window.location.href = "/sign-in";
          }, 1500);
        } else {
          toast.error(data.error || (locale === "tr" ? "Ödeme başlatılamadı." : "Payment could not be initiated."));
        }
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(locale === "tr" ? "Ağ hatası oluştu, ödeme başlatılamadı." : "A network error occurred. Failed to initiate payment.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-950" />
      </div>
    );
  }

  const currencySymbol = locale === "tr" ? "₺" : "$";

  const getPlanKey = (slug: string) => {
    const s = slug.toLowerCase();
    if (s === "starter") return "Starter";
    if (s === "professional" || s === "elite") return "Elite";
    if (s === "enterprise") return "Enterprise";
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950 py-20 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-20 relative">
        {/* Background Gradients */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-zinc-100 rounded-full blur-[100px] opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-zinc-100 rounded-full blur-[100px] opacity-50" />

        {/* Header */}
        <div className="text-center space-y-6 relative">
          <Badge className="rounded-full bg-zinc-950 text-white border-none px-4 py-1.5 font-bold text-[10px] uppercase tracking-[0.2em]">
            {t("badge")}
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] max-w-4xl mx-auto">
            {t("title")}
          </h1>
          <p className="text-xl text-zinc-500 font-medium max-w-2xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>

          <div className="flex items-center justify-center gap-4 pt-6">
            <span className={`text-sm font-bold transition-colors ${!isYearly ? 'text-zinc-950' : 'text-zinc-400'}`}>
              {t("monthly")}
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm font-bold transition-colors ${isYearly ? 'text-zinc-950' : 'text-zinc-400'}`}>
              {t("yearly")} <span className="text-emerald-500 ml-1">{t("save")}</span>
            </span>
          </div>

          {/* Coupon Redemption Box */}
          <div className="max-w-md mx-auto p-8 rounded-[32px] bg-zinc-50 border border-zinc-100 shadow-xl space-y-4 text-left mt-8">
            <div className="flex items-center gap-3 text-zinc-950 font-black">
              <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
              <span>{locale === "tr" ? "Promosyon Kuponunuz Var mı?" : "Have a Promotional Coupon?"}</span>
            </div>
            <p className="text-xs font-medium text-zinc-500 leading-relaxed">
              {locale === "tr" 
                ? "Faturalandırma adımlarını atlayarak deneme süresini başlatmak veya indirim uygulamak için kupon kodunuzu girin."
                : "Redeem your promotional trial code to bypass billing gateways immediately."}
            </p>
            <div className="flex gap-2">
              <Input 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={locale === "tr" ? "KUPON KODU" : "ENTER CODE"}
                className="h-12 rounded-xl bg-white border-zinc-200 font-mono tracking-wider uppercase font-bold pl-4 focus:bg-white"
              />
              <Button 
                onClick={handleRedeemCoupon}
                disabled={isRedeeming}
                className="h-12 rounded-xl bg-zinc-950 text-white hover:bg-zinc-900 px-6 font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                {isRedeeming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  locale === "tr" ? "Uygula" : "Redeem"
                )}
              </Button>
            </div>

            {/* Success Applied Coupon State Display */}
            {appliedCoupon && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-black text-xs text-center animate-in fade-in duration-500">
                {locale === "tr" 
                  ? `Tebrikler! "%${appliedCoupon.percent}" indirim kuponu (${appliedCoupon.code}) başarıyla tanımlandı. Ödemenizde uygulanacaktır.`
                  : `Success! "${appliedCoupon.percent}%" discount code (${appliedCoupon.code}) applied. It will reflect on checkout.`}
              </div>
            )}
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative pt-8">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`
                relative rounded-[40px] p-10 flex flex-col justify-between transition-all border-2
                ${plan.isPopular 
                  ? "bg-zinc-950 text-white border-zinc-950 shadow-2xl shadow-zinc-400/50 scale-[1.05] z-10" 
                  : "bg-white text-zinc-950 border-zinc-100 hover:border-zinc-200 shadow-xl shadow-zinc-100/50"}
              `}
            >
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-xl shadow-emerald-500/20">
                  {t("popular")}
                </div>
              )}

              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-black tracking-tight uppercase tracking-tighter">
                    {t.has(`plans.${getPlanKey(plan.slug)}.name`) 
                      ? t(`plans.${getPlanKey(plan.slug)}.name`) 
                      : plan.name}
                  </h3>
                  <p className={`text-sm font-medium mt-2 leading-relaxed ${plan.isPopular ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t.has(`plans.${getPlanKey(plan.slug)}.description`) 
                      ? t(`plans.${getPlanKey(plan.slug)}.description`) 
                      : plan.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-black tracking-tighter">
                    {currencySymbol}
                    {isYearly 
                      ? Math.floor(plan.priceYearly / 12).toLocaleString(locale === "tr" ? "tr-TR" : "en-US") 
                      : plan.priceMonthly.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                  </span>
                  <span className={`text-sm font-bold ${plan.isPopular ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t("perMonth")}
                  </span>
                </div>

                <div className="space-y-4 pt-6 border-t border-zinc-100/10">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${plan.isPopular ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {t("everythingIn", { name: plan.name })}
                  </p>
                  {(() => {
                    const planKey = getPlanKey(plan.slug);
                    const localizedFeatures: string[] = [];
                    let fIdx = 0;
                    while (true) {
                      const key = `plans.${planKey}.features.${fIdx}`;
                      if (t.has(key)) {
                        localizedFeatures.push(t(key));
                        fIdx++;
                      } else {
                        break;
                      }
                    }
                    const featuresToRender = localizedFeatures.length > 0 
                      ? localizedFeatures 
                      : (Array.isArray(plan.features) && plan.features.length > 0 ? plan.features : [
                          `${plan.chatbotLimit} AI Chatbots`,
                          `${plan.messageLimit.toLocaleString()} Messages / mo`,
                          "Knowledge Base & RAG",
                          "Analytics Dashboard"
                        ]);
                    return featuresToRender.map((feature: string, fIdx: number) => (
                      <div key={fIdx} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.isPopular ? 'bg-emerald-500' : 'bg-zinc-100'}`}>
                          <Check className={`w-3 h-3 ${plan.isPopular ? 'text-zinc-950' : 'text-zinc-600'}`} />
                        </div>
                        <span className="text-sm font-bold tracking-tight">{feature}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="mt-10">
                <Button 
                  onClick={() => handleSubscribe(plan.id)}
                  className={`
                    w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95
                    ${plan.isPopular 
                      ? "bg-white text-zinc-950 hover:bg-zinc-100" 
                      : "bg-zinc-950 text-white hover:bg-zinc-900"}
                  `}
                >
                  {plan.slug === "enterprise" ? t("plans.Enterprise.cta") : t("plans.Elite.cta")}
                </Button>
                <p className={`text-center text-[10px] font-bold uppercase tracking-widest mt-4 ${plan.isPopular ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {locale === "tr" ? "Kredi Kartı Gerekmez" : "No Credit Card Required"}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-12 pt-20">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black">
              {locale === "tr" ? "Sıkça Sorulan Sorular" : "Frequently Asked Questions"}
            </h2>
            <p className="text-zinc-500 font-medium">
              {locale === "tr" ? "JCaesar hakkında bilmeniz gereken her şey" : "Everything you need to know about JCaesar"}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
             <FaqItem 
               q={locale === "tr" ? "Planımı daha sonra değiştirebilir miyim?" : "Can I change my plan later?"} 
               a={locale === "tr" 
                 ? "Evet, istediğiniz zaman kontrol panelinizdeki ayarlar bölümünden planınızı yükseltebilir veya düşürebilirsiniz."
                 : "Yes, you can upgrade or downgrade your plan at any time from your dashboard settings."} 
             />
             <FaqItem 
               q={locale === "tr" ? "Limitlerime ulaştığımda ne olur?" : "What happens if I hit my token limit?"} 
               a={locale === "tr"
                 ? "Yapay zeka asistanınız geçici olarak duraklatılır. Ekstra mesaj paketleri satın alabilir veya planınızı yükseltebilirsiniz."
                 : "Your chatbot will temporarily pause. You can purchase one-time token packs or upgrade your plan."} 
             />
             <FaqItem 
               q={locale === "tr" ? "Ücretsiz deneme süresi var mı?" : "Is there a free trial?"} 
               a={locale === "tr"
                 ? "Starter planımız, kişisel kullanım ve test amaçlı olarak sınırlı sayıda mesajla tamamen ücretsizdir."
                 : "Our Starter plan is free forever for personal use with a limited number of messages."} 
             />
             <FaqItem 
               q={locale === "tr" ? "Özel yapay zeka modelleri kullanabilir miyim?" : "Can I use custom AI models?"} 
               a={locale === "tr"
                 ? "Kurumsal (Enterprise) plan kullanıcılarımız kendi özel ince ayarlanmış modellerini veya özel API uç noktalarını bağlayabilirler."
                 : "Enterprise plan users can connect their own fine-tuned models or custom API endpoints."} 
             />
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: any) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-black text-zinc-900">{q}</h4>
      <p className="text-xs font-medium text-zinc-500 leading-relaxed">{a}</p>
    </div>
  );
}
