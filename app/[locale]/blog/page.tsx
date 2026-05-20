"use client";

import { useLocale } from "next-intl";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Sparkles } from "lucide-react";

export default function BlogPage() {
  const currentLocale = useLocale();
  const isTr = currentLocale === "tr";

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans antialiased text-zinc-900">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-32 space-y-16 animate-in fade-in duration-500">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/5 border border-black/5 text-zinc-800 text-xs font-black uppercase tracking-widest">
            <BookOpen className="w-3.5 h-3.5" />
            {isTr ? "KÜTÜPHANE" : "KNOWLEDGE BASE"}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-950">
            {isTr ? "J.Caesar Blog & Analiz" : "J.Caesar Insights"}
          </h1>
          <p className="text-zinc-500 text-base font-medium leading-relaxed">
            {isTr 
              ? "Yapay zeka otonomisi, müşteri desteği otomasyonları ve kurumsal RAG modelleri hakkında son yazılarımız."
              : "Read our latest articles on autonomous agents, corporate RAG structures, and SaaS optimizations."}
          </p>
        </div>

        <div className="space-y-6 pt-8">
          <Card className="rounded-[32px] border border-black/5 bg-white shadow-md p-8 hover:shadow-xl transition-all duration-300">
            <h3 className="text-2xl font-black text-zinc-950 hover:text-primary cursor-pointer transition-colors">
              {isTr ? "Müşteri Destek Sistemlerinde Halüsinasyonları Nasıl %0'a İndirirsiniz?" : "How to Tame AI Hallucinations in Customer Operations?"}
            </h3>
            <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
              {isTr 
                ? "RAG (Retrieval-Augmented Generation) altyapısının semantik chunking ve strict overlap ayarlarıyla en güvenilir yanıtları kurgulamanın yollarını keşfedin."
                : "Explore how semantic chunking and strict overlap ratios prevent LLMs from inventing customer replies."}
            </p>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
