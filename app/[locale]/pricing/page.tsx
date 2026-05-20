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

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
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
        toast.success(data.message || "Coupon redeemed successfully!");
        setCouponCode("");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        toast.error(data.error || "Failed to redeem coupon");
      }
    } catch (err) {
      toast.error("Network error");
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
    // This will redirect to Stripe Checkout
    toast.loading("Preparing checkout...");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval: isYearly ? "yearly" : "monthly" }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (error) {
      toast.error("Failed to initiate checkout");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-950" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950 py-20 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-20 relative">
        {/* Background Gradients */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-zinc-100 rounded-full blur-[100px] opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-zinc-100 rounded-full blur-[100px] opacity-50" />

        {/* Header */}
        <div className="text-center space-y-6 relative">
          <Badge className="rounded-full bg-zinc-950 text-white border-none px-4 py-1 font-bold text-[10px] uppercase tracking-[0.2em]">
            Pricing Plans
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
            Scale your intelligence.
          </h1>
          <p className="text-xl text-zinc-500 font-medium max-w-2xl mx-auto">
            Choose a plan that fits your business needs. Upgrade, downgrade, or cancel at any time.
          </p>

          <div className="flex items-center justify-center gap-4 pt-6">
            <span className={`text-sm font-bold ${!isYearly ? 'text-zinc-950' : 'text-zinc-400'}`}>Monthly</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm font-bold ${isYearly ? 'text-zinc-950' : 'text-zinc-400'}`}>
              Yearly <span className="text-emerald-500 ml-1">(Save 20%)</span>
            </span>
          </div>

          {/* Coupon Redemption Box */}
          <div className="max-w-md mx-auto p-8 rounded-[32px] bg-zinc-50 border border-zinc-100 shadow-xl space-y-4 text-left">
            <div className="flex items-center gap-3 text-zinc-950 font-black">
              <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
              <span>Have a Promotional Coupon?</span>
            </div>
            <p className="text-xs font-medium text-zinc-500">
              Redeem your promotional trial code to bypass billing gateways immediately.
            </p>
            <div className="flex gap-2">
              <Input 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="ENTER CODE"
                className="h-12 rounded-xl bg-white border-zinc-200 font-mono tracking-wider uppercase font-bold pl-4 focus:bg-white"
              />
              <Button 
                onClick={handleRedeemCoupon}
                disabled={isRedeeming}
                className="h-12 rounded-xl bg-zinc-950 text-white hover:bg-zinc-900 px-6 font-bold flex items-center gap-2"
              >
                {isRedeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
              </Button>
            </div>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
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
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{plan.name}</h3>
                  <p className={`text-sm font-medium mt-2 ${plan.isPopular ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black">
                    ${isYearly ? Math.floor(plan.priceYearly / 12) : plan.priceMonthly}
                  </span>
                  <span className={`text-sm font-bold ${plan.isPopular ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    / month
                  </span>
                </div>

                <div className="space-y-4 pt-6 border-t border-zinc-100/10">
                  {plan.features.map((feature: string, fIdx: number) => (
                    <div key={fIdx} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.isPopular ? 'bg-emerald-500' : 'bg-zinc-100'}`}>
                        <Check className={`w-3 h-3 ${plan.isPopular ? 'text-white' : 'text-zinc-600'}`} />
                      </div>
                      <span className="text-sm font-bold tracking-tight">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10">
                <Button 
                  onClick={() => handleSubscribe(plan.id)}
                  className={`
                    w-full h-16 rounded-2xl font-black text-lg transition-all
                    ${plan.isPopular 
                      ? "bg-white text-zinc-950 hover:bg-zinc-100" 
                      : "bg-zinc-950 text-white hover:bg-zinc-900"}
                  `}
                >
                  Get Started
                </Button>
                <p className={`text-center text-[10px] font-bold uppercase tracking-widest mt-4 ${plan.isPopular ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  No Credit Card Required
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-12 pt-20">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black">Frequently Asked Questions</h2>
            <p className="text-zinc-500 font-medium">Everything you need to know about JCaesar</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <FaqItem 
               q="Can I change my plan later?" 
               a="Yes, you can upgrade or downgrade your plan at any time from your dashboard settings." 
             />
             <FaqItem 
               q="What happens if I hit my token limit?" 
               a="Your chatbot will temporarily pause. You can purchase one-time token packs or upgrade your plan." 
             />
             <FaqItem 
               q="Is there a free trial?" 
               a="Our Starter plan is free forever for personal use with a limited number of messages." 
             />
             <FaqItem 
               q="Can I use custom AI models?" 
               a="Enterprise plan users can connect their own fine-tuned models or custom API endpoints." 
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
