"use client";

import { useLocale } from "next-intl";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Globe, 
  MessageSquare, 
  ShoppingBag, 
  Smartphone, 
  Terminal, 
  ArrowUpRight, 
  Sparkles,
  Zap
} from "lucide-react";
import Link from "next/link";

const TRANSLATIONS: Record<string, any> = {
  tr: {
    title: "Güçlü Entegrasyonlar",
    desc: "J.Caesar otonom ajanlarınızı e-ticaret sitelerinize, CRM platformlarınıza ve sosyal medya kanallarınıza anında bağlayın.",
    badge: "Çoklu Kanal Bağlantıları",
    custom_api: "Özel API & Webhooks",
    custom_api_desc: "Kendi uç noktalarınızı bağlayarak yapay zekanın canlı stok ve fiyat çekmesini sağlayın.",
    woo_desc: "WooCommerce mağaza kataloğunuzu yapay zekaya entegre edin.",
    shopify_desc: "Shopify ürün stok ve sipariş sorgularını otonomlaştırın.",
    social_desc: "WhatsApp Business, Instagram ve Messenger mesajlarını 7/24 otomatikleştirin."
  },
  en: {
    title: "Powerful Integrations",
    desc: "Connect your J.Caesar autonomous agents directly to your e-commerce, CRM, and messaging ecosystems instantly.",
    badge: "Omnichannel Connectors",
    custom_api: "Custom API & Webhooks",
    custom_api_desc: "Bridge your own custom HTTP endpoints to feed live inventory and user metrics to the AI.",
    woo_desc: "Synergize WooCommerce product listings and pricing logic.",
    shopify_desc: "Automate Shopify tracking and order queries.",
    social_desc: "Deploy automated workflows for WhatsApp, Instagram, and Messenger."
  }
};

export default function IntegrationsPage() {
  const currentLocale = useLocale();
  const t = TRANSLATIONS[currentLocale] || TRANSLATIONS["tr"];

  const list = [
    {
      title: t.custom_api,
      desc: t.custom_api_desc,
      icon: Terminal,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      href: "/docs"
    },
    {
      title: "WooCommerce",
      desc: t.woo_desc,
      icon: Globe,
      color: "bg-purple-50 text-purple-600 border-purple-100",
      href: "/docs"
    },
    {
      title: "Shopify",
      desc: t.shopify_desc,
      icon: ShoppingBag,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      href: "/docs"
    },
    {
      title: "WhatsApp Business",
      desc: t.social_desc,
      icon: Smartphone,
      color: "bg-teal-50 text-teal-600 border-teal-100",
      href: "/docs"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans antialiased text-zinc-900">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-32 space-y-16">
        
        {/* Banner */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/5 border border-black/5 text-zinc-800 text-xs font-black uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5" />
            {t.badge}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-950">
            {t.title}
          </h1>
          <p className="text-zinc-500 text-base lg:text-lg font-medium leading-relaxed">
            {t.desc}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {list.map((item, idx) => (
            <Card key={idx} className="rounded-[32px] border border-black/5 bg-white shadow-md p-8 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
              <CardContent className="p-0 space-y-6">
                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-zinc-950 flex items-center justify-between">
                    {item.title}
                    <ArrowUpRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
                  </h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
                <Link href={item.href} className="inline-flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest hover:underline pt-2">
                  Dokümantasyonu İncele <ArrowUpRight className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

      </main>

      <Footer />
    </div>
  );
}
