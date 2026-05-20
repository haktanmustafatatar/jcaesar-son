"use client";

import { motion } from "framer-motion";
import { 
  MessageSquare, 
  ShoppingBag, 
  Slack, 
  Instagram, 
  Facebook, 
  Calendar, 
  CreditCard, 
  LifeBuoy, 
  Cpu, 
  ChevronRight,
  Database,
  CalendarDays
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const integrations = [
  {
    name: "WhatsApp Entegrasyonu",
    description: "Müşterilerinizle en popüler mesajlaşma kanalı olan WhatsApp üzerinden 7/24 kesintisiz AI destekli diyaloglar yürütün.",
    icon: MessageSquare,
    color: "from-emerald-500/10 to-emerald-600/5 text-emerald-400 border-emerald-500/10",
  },
  {
    name: "Instagram DM Entegrasyonu",
    description: "Instagram DM kutunuza gelen soruları anında yanıtlayın, hikaye yanıtları ve yorumları otomatik satışa dönüştürün.",
    icon: Instagram,
    color: "from-pink-500/10 to-rose-500/5 text-pink-400 border-pink-500/10",
  },
  {
    name: "Facebook Messenger",
    description: "Facebook sayfalarınız üzerinden gelen tüm müşteri sorularını yapay zeka asistanınızla saniyeler içinde cevaplayın.",
    icon: Facebook,
    color: "from-blue-500/10 to-indigo-500/5 text-blue-400 border-blue-500/10",
  },
  {
    name: "Shopify Entegrasyonu",
    description: "Shopify mağazanızı bağlayarak AI'ın ürünlerinizi önermesini, sepet hatırlatmaları yapmasını ve sipariş durumu sunmasını sağlayın.",
    icon: ShoppingBag,
    color: "from-lime-500/10 to-emerald-500/5 text-lime-400 border-lime-500/10",
  },
  {
    name: "WooCommerce Entegrasyonu",
    description: "WooCommerce altyapılı e-ticaret sitenizi bağlayın, ürün kataloğunuzu yapay zekanın satış gücüyle birleştirin.",
    icon: ShoppingBag,
    color: "from-purple-500/10 to-pink-500/5 text-purple-400 border-purple-500/10",
  },
  {
    name: "Yerleşik Takvim & Rezervasyon",
    description: "Sistemde kurulu yerleşik takvim ile işletmenizin çalışma saatlerine ve personel kapasitesine göre rezervasyonları yönetin.",
    icon: CalendarDays,
    color: "from-amber-500/10 to-orange-500/5 text-amber-400 border-amber-500/10",
  },
  {
    name: "Google Takvim Entegrasyonu",
    description: "Randevularınızı Google Calendar hesabınızla tam senkronize tutun; tüm ekibinizin takvimi otomatik güncellensin.",
    icon: Calendar,
    color: "from-blue-500/10 to-cyan-500/5 text-blue-400 border-blue-500/10",
  },
  {
    name: "Calendly & Randevular",
    description: "Mevcut Calendly hesap linklerinizi bağlayarak yapay zekanın sohbet esnasında randevuları sizin adınıza planlamasını sağlayın.",
    icon: Calendar,
    color: "from-cyan-500/10 to-teal-500/5 text-cyan-400 border-cyan-500/10",
  },
  {
    name: "Özel API & Webhook Geliştirici Arayüzü",
    description: "Tamamen esnek API uçları ve Webhook altyapısıyla botunuzu kendi ERP, CRM veya şirket içi veritabanınıza bağlayın.",
    icon: Cpu,
    color: "from-orange-500/10 to-red-500/5 text-orange-400 border-orange-500/10",
  }
];

export function LogoCarousel() {
  return (
    <section className="py-28 bg-zinc-950 text-white relative overflow-hidden">
      {/* Visual background polish grids */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(226,91,49,0.03),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none brightness-150" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10 space-y-16">
        
        {/* Header content description */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="outline" className="rounded-full border-zinc-800 bg-zinc-900/50 text-primary px-4 py-1.5 font-bold text-[10px] uppercase tracking-[0.2em]">
            Ekosistem & Entegrasyonlar
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-white">
            İşletmenizin kullandığı araçlarla tam uyum.
          </h2>
          <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-xl mx-auto">
            Sistemde yerleşik bulunan profesyonel CRM ve Takvim, Randevu, Rezervasyon yönetimine ek olarak mevcut iş araçlarınızı saniyeler içinde bağlayın.
          </p>
        </div>

        {/* Dynamic Glassmorphic integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8">
          {integrations.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
              className={cn(
                "rounded-[32px] p-8 border bg-gradient-to-br transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/5 flex flex-col justify-between group",
                item.color
              )}
            >
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-zinc-950 transition-all duration-500">
                  <item.icon className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{item.name}</h3>
                  <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-2">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-8 group-hover:text-primary transition-colors">
                <span>Hemen Bağla</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
