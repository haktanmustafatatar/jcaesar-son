"use client";

import { useLocale } from "next-intl";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { Card } from "@/components/ui/card";
import { Sparkles, Users } from "lucide-react";

export default function CareersPage() {
  const currentLocale = useLocale();
  const isTr = currentLocale === "tr";

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans antialiased text-zinc-900">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-32 space-y-16 animate-in fade-in duration-500">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/5 border border-black/5 text-zinc-800 text-xs font-black uppercase tracking-widest">
            <Users className="w-3.5 h-3.5" />
            {isTr ? "KARİYER" : "CAREERS"}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-950">
            {isTr ? "Geleceği Birlikte İnşa Edelim" : "Join the AI Revolution"}
          </h1>
          <p className="text-zinc-500 text-base font-medium leading-relaxed">
            {isTr 
              ? "J.Caesar'da yüksek performanslı otonom sistemler ve güvenli RAG mimarileri üzerine çalışan global bir ekibiz."
              : "We are building a highly dedicated, remote-first global team crafting predictive models and agentic frameworks."}
          </p>
        </div>

        <div className="space-y-6 pt-8">
          <Card className="rounded-[32px] border border-black/5 bg-white shadow-md p-8 hover:shadow-xl transition-all duration-300">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Engineering</span>
                <h4 className="text-xl font-black text-zinc-950 mt-1">{isTr ? "Yapay Zeka Mimarı (AI Platform Architect)" : "AI Platform Architect"}</h4>
                <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                  {isTr 
                    ? "RAG hatlarını optimize etmek, Pinecone/PostgreSQL veritabanı ölçeklemelerini yönetmek ve otonom sistemleri geliştirmek."
                    : "Tuning retrieval parameters, scaling vectorized architectures, and building deep agentic pipelines."}
                </p>
              </div>
              <span className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600">Remote</span>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
