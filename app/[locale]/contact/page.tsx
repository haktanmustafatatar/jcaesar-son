"use client";

import { useLocale } from "next-intl";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { Card } from "@/components/ui/card";
import { Mail, Sparkles } from "lucide-react";

export default function ContactPage() {
  const currentLocale = useLocale();
  const isTr = currentLocale === "tr";

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans antialiased text-zinc-900">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-32 space-y-16 animate-in fade-in duration-500">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/5 border border-black/5 text-zinc-800 text-xs font-black uppercase tracking-widest">
            <Mail className="w-3.5 h-3.5" />
            {isTr ? "İLETİŞİM" : "CONTACT"}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-950">
            {isTr ? "Strateji Masası İle Görüşün" : "Contact Strategy Desk"}
          </h1>
          <p className="text-zinc-500 text-base font-medium leading-relaxed">
            {isTr 
              ? "Kurumsal çözümler, özel RAG hatları ve lisanslama teklifleri için ekibimizle doğrudan iletişime geçin."
              : "Connect with our AI strategists to negotiate dedicated SLA boundaries, hosting environments, or enterprise deals."}
          </p>
        </div>

        <div className="max-w-md mx-auto pt-8">
          <Card className="rounded-[32px] border border-black/5 bg-white shadow-xl p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">E-Posta Adresimiz</p>
              <h3 className="text-2xl font-black text-zinc-950 hover:text-indigo-600 transition-colors">
                <a href="mailto:strategy@jcaesar.com">strategy@jcaesar.com</a>
              </h3>
            </div>
            <p className="text-zinc-400 text-xs font-medium">
              {isTr 
                ? "Tüm kurumsal e-posta taleplerine 24 saat içinde geri dönüş sağlıyoruz."
                : "All strategic mail queries are processed within 24 working hours."}
            </p>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
