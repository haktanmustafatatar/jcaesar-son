"use client";

import { useLocale } from "next-intl";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function SecurityPage() {
  const currentLocale = useLocale();
  const isTr = currentLocale === "tr";

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans antialiased text-zinc-900">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-32 space-y-16 animate-in fade-in duration-500">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/5 border border-black/5 text-zinc-800 text-xs font-black uppercase tracking-widest">
            <ShieldAlert className="w-3.5 h-3.5" />
            {isTr ? "KORUMA" : "SECURITY"}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-950">
            {isTr ? "Güvenlik Duvarı (Safe Haven)" : "Security Safe Haven"}
          </h1>
        </div>

        <Card className="rounded-[32px] border border-black/5 bg-white shadow-xl p-8 lg:p-12 space-y-6 text-sm text-zinc-600 leading-relaxed font-medium">
          {isTr ? (
            <>
              <h3 className="text-xl font-black text-zinc-950">1. ISO/IEC 27001 Standartları</h3>
              <p>J.Caesar mimarisi, bilgi güvenliği yönetim standartlarını (ISO 27001) tam olarak entegre eder. Verileriniz, aktarım sırasında (TLS 1.3) ve saklanırken (AES-256) endüstriyel kriptografik şifreleme yöntemleriyle korunur.</p>
              
              <h3 className="text-xl font-black text-zinc-950">2. Ağ Güvenliği & CORS Kısıtlamaları</h3>
              <p>Bot yerleştirme scriptleriniz ve API uç noktalarınız sadece yetkilendirdiğiniz alan adlarından (Origin validation) gelen sorguları kabul eder. Bu sayede gömme kodunuzun başka web sitelerinde izinsiz kullanılması engellenir.</p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-black text-zinc-950">1. Cryptographic Standardizations</h3>
              <p>J.Caesar architectures are developed in strict alignment with ISO/IEC 27001 specifications. Communication pipelines utilize TLS 1.3 transport security, with backend volumes encrypted using solid AES-256 standardizations.</p>
              
              <h3 className="text-xl font-black text-zinc-950">2. Origin Protections</h3>
              <p>Your chatbot integration tokens utilize strict CORS filters. Third-party domains are prevented from executing your RAG nodes or calling internal custom action parameters.</p>
            </>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  );
}
