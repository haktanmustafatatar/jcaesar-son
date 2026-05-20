"use client";

import { useLocale } from "next-intl";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Sparkles, Target, Zap } from "lucide-react";

export default function AboutPage() {
  const currentLocale = useLocale();

  const isTr = currentLocale === "tr";
  const title = isTr ? "J.Caesar Stratejisi" : "J.Caesar Strategy";
  const desc = isTr 
    ? "İş dünyasının yeni otonomi çağı için yüksek sadakatli yapay zeka ajanlarına öncülük ediyoruz."
    : "Pioneering high-fidelity AI agents for the new autonomous era of global business.";

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans antialiased text-zinc-900">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-32 space-y-16 animate-in fade-in duration-500">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/5 border border-black/5 text-zinc-800 text-xs font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            {isTr ? "MİSYONUMUZ" : "OUR MISSION"}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-950">
            {title}
          </h1>
          <p className="text-zinc-500 text-base font-medium leading-relaxed">
            {desc}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
          <Card className="rounded-[32px] border border-black/5 bg-white shadow-md p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-zinc-950">{isTr ? "Hassas RAG Altyapısı" : "Precision RAG Engine"}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {isTr 
                ? "Yapay zeka halüsinasyonlarını sıfıra indirerek müşteri deneyimini garantiye alıyoruz."
                : "Eliminating hallucination vectors completely to guarantee predictable conversational replies."}
            </p>
          </Card>

          <Card className="rounded-[32px] border border-black/5 bg-white shadow-md p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-zinc-950">{isTr ? "Kurumsal Güvenlik" : "Enterprise Security"}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {isTr 
                ? "Müşteri verilerini ve dökümanlarını AES-256 ve izole şemalar ile tam koruma altına alıyoruz."
                : "Securing end-user parameters with high-level AES-256 standards and multi-tenant isolated databases."}
            </p>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
