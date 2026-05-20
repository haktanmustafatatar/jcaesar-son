"use client";

import { useLocale } from "next-intl";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function SlaPage() {
  const currentLocale = useLocale();
  const isTr = currentLocale === "tr";

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans antialiased text-zinc-900">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-32 space-y-16 animate-in fade-in duration-500">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/5 border border-black/5 text-zinc-800 text-xs font-black uppercase tracking-widest">
            <ShieldAlert className="w-3.5 h-3.5" />
            {isTr ? "TAAHHÜT" : "COMMITMENT"}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-950">
            {isTr ? "Hizmet Sözleşmesi (SLA)" : "Service Level Agreement (SLA)"}
          </h1>
        </div>

        <Card className="rounded-[32px] border border-black/5 bg-white shadow-xl p-8 lg:p-12 space-y-6 text-sm text-zinc-600 leading-relaxed font-medium">
          {isTr ? (
            <>
              <h3 className="text-xl font-black text-zinc-950">1. Çalışma Süresi Garantisi</h3>
              <p>J.Caesar, kurumsal Enterprise planı kapsamındaki kullanıcılarına %99.9 oranında çalışma süresi (Uptime SLA) garanti eder. Platform kesintileri gerçek zamanlı status portalımız üzerinden şeffaf şekilde yayınlanır.</p>
              
              <h3 className="text-xl font-black text-zinc-950">2. Teknik Destek Reaksiyon Süresi</h3>
              <p>Kritik seviyedeki (Severity 1) altyapı sorunlarında Enterprise müşterilerimize 1 saat içinde müdahale ve öncelikli mühendis ataması sağlanır. Diğer planlardaki standart yanıt süreleri kullanım kılavuzunda belirtilmiştir.</p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-black text-zinc-950">1. Uptime Guarantees</h3>
              <p>J.Caesar commits to maintaining a solid 99.9% platform availability threshold for active Enterprise agreements, backed by transparent monitoring setups.</p>
              
              <h3 className="text-xl font-black text-zinc-950">2. Response SLA Targets</h3>
              <p>Under Severity 1 incidents, our dedicated systems trigger high-priority alerts notifying engineers within 1 hour to resolve any blocking infrastructural failures.</p>
            </>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  );
}
