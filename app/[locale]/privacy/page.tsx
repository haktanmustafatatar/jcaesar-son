"use client";

import { useLocale } from "next-intl";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  const currentLocale = useLocale();
  const isTr = currentLocale === "tr";

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans antialiased text-zinc-900">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-32 space-y-16 animate-in fade-in duration-500">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/5 border border-black/5 text-zinc-800 text-xs font-black uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5" />
            {isTr ? "MEVZUAT" : "COMPLIANCE"}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-950">
            {isTr ? "Gizlilik Politikası" : "Privacy Policy"}
          </h1>
        </div>

        <Card className="rounded-[32px] border border-black/5 bg-white shadow-xl p-8 lg:p-12 space-y-6 text-sm text-zinc-600 leading-relaxed font-medium">
          {isTr ? (
            <>
              <h3 className="text-xl font-black text-zinc-950">1. Veri Güvenliği ve Kapsam</h3>
              <p>J.Caesar platformu, kullanıcı dökümanlarını ve müşteri verilerini en yüksek gizlilik standartlarında korur. Tüm veri tabanı sorguları ve depolanan RAG dökümanları, müşteri bazlı izole şemalarda (multi-tenant isolation) tutulur.</p>
              
              <h3 className="text-xl font-black text-zinc-950">2. Toplanan Bilgiler</h3>
              <p>Sadece platform verimliliği, faturalandırma takibi ve yapay zeka ajanlarının eğitimi için sağladığınız URL verileri ve PDF dökümanları sisteme kaydedilir. Bu veriler kesinlikle üçüncü taraf LLM modellerinin genel eğitimi için paylaşılmaz.</p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-black text-zinc-950">1. Data Sovereignty and Security</h3>
              <p>J.Caesar secures all user assets and chat histories under high-end privacy boundaries. Your vector indices and database layers are isolated inside private schemas to avoid data leak risks.</p>
              
              <h3 className="text-xl font-black text-zinc-950">2. Ingested Data Boundaries</h3>
              <p>Ingested website URLs, files, and contact metrics are explicitly used for your active AI agent training and direct analytics dashboards. We never share customer data for generalized LLM training.</p>
            </>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  );
}
