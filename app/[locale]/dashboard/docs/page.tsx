"use client";

import { useLocale } from "next-intl";
import { 
  BookOpen, 
  HelpCircle, 
  Bot, 
  Database, 
  Cpu, 
  Users, 
  Calendar, 
  Terminal, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  Mail,
  CheckCircle,
  FileCode,
  Globe,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Localized translations for the Documentation Page
const DOCS_DATA: Record<string, any> = {
  tr: {
    badge: "J.Caesar Bilgi Merkezi",
    title: "Kullanıcı Kılavuzu &",
    subtitle: "Geliştirici Dokümantasyonu",
    desc: "J.Caesar platformunun tüm özelliklerini keşfedin. Yapay zekayı eğitmeyi, özel API entegrasyonlarını, CRM & Takvim otomasyonlarını ve çoklu dil yönetimini adım adım öğrenin.",
    tabs: {
      overview: "Genel Bakış",
      rag: "Yapay Zeka & RAG Altyapısı",
      webhooks: "Özel API / Webhook Entegrasyonu",
      channels: "CRM, E-Ticaret & Kanallar",
      smtp: "E-Posta & SMTP Ayarları"
    },
    sections: {
      overview: {
        t1: "1. Anında Chatbot Kurulumu",
        d1: "Yapay zeka ajanı oluşturmak sadece birkaç saniye sürer. Ajanın kişiliğini, renk temasını, karşılama mesajlarını ve davranış protokollerini markanıza göre özelleştirin.",
        t2: "2. Akıllı RAG (Bilgi Tabanı) Eğitimi",
        d2: "PDF, TXT, DOCX dosyalarını yükleyin veya web sitenizin URL'sini girin. Crawler motorumuz sayfaları derinlemesine tarar ve verileri vektör veri tabanına gömer.",
        t3: "3. CRM & Otomatik Randevu",
        d3: "Yapay zeka, konuşmalar esnasında müşteri adı, e-postası ve telefonu gibi bilgileri otomatik olarak yakalayarak CRM tablonuza kaydeder ve doğrudan randevuları bağlar.",
        t4: "4. Entegrasyonlar ve API",
        d4: "WhatsApp, Instagram, Messenger, Shopify ve WooCommerce mağazalarınızı anında yapay zekaya bağlayarak otonom bir satış temsilcisi yaratın."
      },
      rag: {
        title: "RAG (Erişimle Artırılmış Üretim) Altyapısı",
        desc: "J.Caesar, yapay zekanın hayal görmesini (hallucination) önlemek için gelişmiş bir RAG sistemi kullanır.",
        steps: [
          {
            title: "Web Sitelerinin Taranması",
            content: "Crawler motorumuz, sitemap veya doğrudan URL üzerinden hedefleri analiz eder. Her sayfanın ana metnini gereksiz HTML, reklam ve alt bilgi elemanlarından temizleyerek sisteme kaydeder."
          },
          {
            title: "Vektör Bölümleme (Chunking)",
            content: "Tüm metinler, semantik bağlamın korunması amacıyla 1000 karakterlik bloklara bölünür. Bloklar arasında 200 karakterlik bir çakışma (overlap) bırakılarak cümlenin ve bağlamın kesilmesi önlenir."
          },
          {
            title: "Özel Soru-Cevap (Direct Q&A)",
            content: "Spesifik durumlar için (örn. İade politikaları veya kargo ücretleri) doğrudan Soru-Cevap kartları ekleyebilirsiniz. Bu kartlar, yapay zeka tarafından doğrudan en yüksek öncelikli veri olarak işlenir."
          }
        ]
      },
      webhooks: {
        title: "Geliştirici Rehberi: Özel API & Webhook Tanımlama",
        desc: "Yapay zeka ajanınızın konuşma sırasında harici sistemlerinizden (örn. Sipariş takibi, bakiye sorgulama) canlı veri çekmesini sağlayın.",
        step1: "1. Değişken Tanımlama",
        step1_d: "API tetikleme sırasında kullanıcıdan alınacak dinamik girdileri {{değisken_adı}} şeklinde belirleyin (Örn: {{siparis_id}}). Yapay zeka bu bilgiyi konuşma içinde müşteriden otonom olarak talep eder.",
        step2: "2. İstek & Yanıt Akışı",
        step2_d: "HTTP Method (GET/POST), URL ve Gerekli Authorization Header'larını girin. Yapay zekaya döneceğiniz JSON formatı düz bir metin olmalıdır. Yapay zeka dönen bu JSON verisini analiz ederek müşteriye doğal bir dille yanıt verir.",
        format: "// Örnek JSON Yanıtı Formatı",
        security: "⚠️ Kritik Güvenlik Talimatları",
        sec_items: [
          "Veri gizliliği için tüm uç noktalarınızın HTTPS protokolü ile korunduğundan emin olun.",
          "Yetkisiz istekleri önlemek için API ayarlarınıza 'Authorization: Bearer token_adı' şeklinde bir anahtar ekleyin.",
          "Yapay zeka platformunun bekleme süresi aşımına (timeout) uğramaması için API yanıtlarınızın 10 saniyenin altında döndüğünden emin olun."
        ]
      },
      channels: {
        title: "Omnichannel & CRM Entegrasyonları",
        desc: "Platform genelindeki e-ticaret ve sosyal medya kanallarını kurarak yapay zekayı her yere yayınlayın.",
        woo: "WooCommerce Entegrasyonu",
        woo_d: "WooCommerce API Anahtarı ve Tüketici Parolasını girerek botunuza ürün kataloğunuzu, fiyatlarını ve stok durumlarını otonom olarak okuma yetkisi verin.",
        shopify: "Shopify Entegrasyonu",
        shopify_d: "Shopify mağaza alan adınızı ve Access Token bilgilerinizi bağlayın. Yapay zeka anında Shopify mağaza kataloğunuzla senkronize olur.",
        social: "Sosyal Medya & WhatsApp Business",
        social_d: "WhatsApp Cloud API, Instagram Direct ve Facebook Messenger hesaplarınızı Meta Developer portalı üzerinden webhook adreslerimize yönlendirerek 7/24 otonom mesajlaşmayı başlatın."
      },
      smtp: {
        title: "Sistem Alarm Altyapısı & SMTP Konfigürasyonu",
        desc: "Kritik limit aşımı durumlarında ve yapay zeka hatalarında admin olarak anında mail altyapısını kurun.",
        smtp_title: "SMTP Kurulumu",
        smtp_d: "Ortam değişkenlerinizde (environment variables) SMTP_HOST, SMTP_USER, SMTP_PASS ve SMTP_PORT ayarlarını yapılandırın. Sistemimiz otomatik olarak limitsiz uyarı e-postaları yollayacaktır.",
        limits: "Otomatik Plan Limit Uyarıları",
        limits_d: "Kullanıcılar paketlerinin %80 ve %100 limitlerine yaklaştıklarında, sistem arayüz üzerinden gerçek zamanlı uyarının yanında, kayıtlı e-posta adreslerine şık bir HTML yükseltme maili atar."
      }
    }
  },
  en: {
    badge: "J.Caesar Knowledge Hub",
    title: "User Guide &",
    subtitle: "Developer Documentation",
    desc: "Explore all J.Caesar platform capabilities. Learn step-by-step how to train your AI agents, create custom APIs, configure CRM & Calendars, and leverage multilingual support.",
    tabs: {
      overview: "Overview",
      rag: "AI & RAG Infrastructure",
      webhooks: "Custom API & Webhooks",
      channels: "CRM, E-Commerce & Channels",
      smtp: "E-Mail & SMTP Configurations"
    },
    sections: {
      overview: {
        t1: "1. Instant Chatbot Deployment",
        d1: "Create a customized AI agent in a couple of clicks. Tweak their personality, color themes, welcome prompts, and conversational rules to perfectly fit your brand identity.",
        t2: "2. Intelligent RAG Knowledge Training",
        d2: "Upload PDFs, Word docs, raw text, or enter your website URL. Our system recursively scrapes web pages to parse knowledge and converts them into high-dimensional vector embeddings.",
        t3: "3. CRM & Automated Scheduling",
        d3: "During conversations, the AI agent dynamically extracts lead contact details (name, email, phone) and registers them inside your CRM and Booking panels.",
        t4: "4. Integrations & API Channels",
        d4: "Connect WooCommerce, Shopify, WhatsApp, Instagram, and Facebook Messenger to deploy an autonomous 24/7 sales representative for your brand."
      },
      rag: {
        title: "RAG (Retrieval-Augmented Generation) Workflows",
        desc: "J.Caesar employs robust RAG parameters to eliminate hallucination, grounding replies purely in your official knowledge.",
        steps: [
          {
            title: "Web Scraping Process",
            content: "Our crawler recursively indexes sitemaps or pages, stripping out tracking scripts, CSS, navigation, and advertising wrappers to preserve clean context."
          },
          {
            title: "Semantic Chunking",
            content: "Parsed knowledge is chunked into 1000-character segments with a 200-character overlap boundary, ensuring sentences and semantics aren't clipped during query retrieval."
          },
          {
            title: "Direct Q&A overrides",
            content: "Set direct Question & Answer keys for legal disclaimers, refunds, or exact pricing. Direct Q&A lists always possess higher priority than standard vector searches."
          }
        ]
      },
      webhooks: {
        title: "Developer Guide: Custom Webhooks & Actions",
        desc: "Empower your AI agents to query external microservices (e.g. tracking orders, pulling live databases) on the fly.",
        step1: "1. Defining Input Variables",
        step1_d: "Declare dynamic parameters in the payload format using the {{variable_name}} syntax (e.g., {{order_id}}). The AI agent will autonomously prompt the user for these inputs inside chats.",
        step2: "2. Executing HTTP Callouts",
        step2_d: "Set up the Request Method (GET/POST), URL, and Authorization headers. Provide simple JSON payloads back to the chatbot interface. The AI will translate your API response into natural language.",
        format: "// Sample API Response Format",
        security: "⚠️ Crucial Security Guidelines",
        sec_items: [
          "Always verify your backend endpoints utilize SSL/HTTPS for encrypted transport.",
          "Inject an Authorization header in custom api tabs (e.g. Bearer token) to validate JCaesar request origins.",
          "Ensure your custom endpoints respond within 10 seconds to avoid gateway timeouts."
        ]
      },
      channels: {
        title: "Omnichannel Integrations & CRM Systems",
        desc: "Configure platform connectors to distribute your intelligent agents everywhere.",
        woo: "WooCommerce Setup",
        woo_d: "Inject WooCommerce REST API keys to synchronize stock limits, active pricing, and catalog items.",
        shopify: "Shopify Syncing",
        shopify_d: "Configure your Shopify custom app token and domain. JCaesar automatically polls inventory details.",
        social: "Social Channels & WhatsApp Business",
        social_d: "Bind WhatsApp Business Cloud API, Instagram DMs, and Facebook Messenger using Meta Developer webhooks for automated messaging."
      },
      smtp: {
        title: "System Error Alerts & SMTP Configuration",
        desc: "Set up SMTP pipelines to receive platform warning logs and send upgrade reminders.",
        smtp_title: "SMTP Server",
        smtp_d: "Inject SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_PORT into your environment keys. The system handles all verification e-mails automatically.",
        limits: "Automated Usage Threshold Reminders",
        limits_d: "When accounts cross 80% or 100% of their plan allocations, SMTP triggers real-time HTML upgrade requests directly to their registered mail address."
      }
    }
  }
};

export default function DocsPage() {
  const currentLocale = useLocale();
  const lang = DOCS_DATA[currentLocale] || DOCS_DATA["tr"]; // Fallback to TR if not mapped

  return (
    <div className="max-w-6xl mx-auto pb-40 space-y-12 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="relative rounded-[40px] bg-gradient-to-r from-zinc-900 to-black p-12 overflow-hidden shadow-2xl border border-zinc-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            {lang.badge}
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-none">
            {lang.title} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">{lang.subtitle}</span>
          </h1>
          <p className="text-zinc-400 text-base font-medium leading-relaxed">
            {lang.desc}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        
        {/* Navigation Tabs */}
        <TabsList className="bg-zinc-100 border p-1 rounded-2xl h-14 gap-2 w-full justify-start overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="rounded-xl font-bold px-5 data-[state=active]:bg-zinc-950 data-[state=active]:text-white transition-all">{lang.tabs.overview}</TabsTrigger>
          <TabsTrigger value="rag" className="rounded-xl font-bold px-5 data-[state=active]:bg-zinc-950 data-[state=active]:text-white transition-all">{lang.tabs.rag}</TabsTrigger>
          <TabsTrigger value="webhooks" className="rounded-xl font-bold px-5 data-[state=active]:bg-zinc-950 data-[state=active]:text-white transition-all">{lang.tabs.webhooks}</TabsTrigger>
          <TabsTrigger value="channels" className="rounded-xl font-bold px-5 data-[state=active]:bg-zinc-950 data-[state=active]:text-white transition-all">{lang.tabs.channels}</TabsTrigger>
          <TabsTrigger value="smtp" className="rounded-xl font-bold px-5 data-[state=active]:bg-zinc-950 data-[state=active]:text-white transition-all">{lang.tabs.smtp}</TabsTrigger>
        </TabsList>

        {/* OVERVIEW CONTENT */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-[32px] border border-black/5 shadow-md bg-white p-8 space-y-4 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-zinc-950">{lang.sections.overview.t1}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{lang.sections.overview.d1}</p>
            </Card>

            <Card className="rounded-[32px] border border-black/5 shadow-md bg-white p-8 space-y-4 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-zinc-950">{lang.sections.overview.t2}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{lang.sections.overview.d2}</p>
            </Card>

            <Card className="rounded-[32px] border border-black/5 shadow-md bg-white p-8 space-y-4 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-zinc-950">{lang.sections.overview.t3}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{lang.sections.overview.d3}</p>
            </Card>

            <Card className="rounded-[32px] border border-black/5 shadow-md bg-white p-8 space-y-4 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-zinc-950">{lang.sections.overview.t4}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{lang.sections.overview.d4}</p>
            </Card>
          </div>
        </TabsContent>

        {/* AI TRAINING & RAG CONTENT */}
        <TabsContent value="rag" className="space-y-6">
          <Card className="rounded-[32px] border border-black/5 shadow-lg bg-white p-8 space-y-6">
            <div>
              <h3 className="text-2xl font-black text-zinc-950">{lang.sections.rag.title}</h3>
              <p className="text-zinc-500 text-sm mt-1">{lang.sections.rag.desc}</p>
            </div>
            
            <div className="space-y-4 text-sm text-zinc-600">
              {lang.sections.rag.steps.map((step: any, idx: number) => (
                <div key={idx} className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-2">
                  <h4 className="font-black text-zinc-800 text-base flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                    {step.title}
                  </h4>
                  <p className="leading-relaxed pl-7">{step.content}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* CUSTOM API CONTENT */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card className="rounded-[32px] border border-black/5 shadow-lg bg-white p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-zinc-950">{lang.sections.webhooks.title}</h3>
                <p className="text-zinc-500 text-sm">{lang.sections.webhooks.desc}</p>
              </div>
            </div>

            <div className="space-y-6 text-sm text-zinc-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-2">
                  <h4 className="font-bold text-zinc-800">{lang.sections.webhooks.step1}</h4>
                  <p className="text-zinc-500">{lang.sections.webhooks.step1_d}</p>
                </div>

                <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-2">
                  <h4 className="font-bold text-zinc-800">{lang.sections.webhooks.step2}</h4>
                  <p className="text-zinc-500">{lang.sections.webhooks.step2_d}</p>
                </div>
              </div>

              <div className="bg-zinc-950 text-zinc-200 p-6 rounded-2xl font-mono text-xs space-y-4">
                <div>
                  <span className="text-indigo-400">{lang.sections.webhooks.format}</span>
                  <pre className="mt-2 text-zinc-400">{`{
  "status": "success",
  "data": {
    "orderId": "TR-1982",
    "deliveryDate": "2026-05-22",
    "carrier": "Aras Kargo"
  }
}`}</pre>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-900 space-y-3">
                <h5 className="font-black flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-600" />
                  {lang.sections.webhooks.security}
                </h5>
                <ul className="list-disc list-inside space-y-2 text-xs font-medium">
                  {lang.sections.webhooks.sec_items.map((sec: string, i: number) => (
                    <li key={i}>{sec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* CRM, SHOPIFY, CHANNELS CONTENT */}
        <TabsContent value="channels" className="space-y-6">
          <Card className="rounded-[32px] border border-black/5 shadow-lg bg-white p-8 space-y-6">
            <div>
              <h3 className="text-2xl font-black text-zinc-950">{lang.sections.channels.title}</h3>
              <p className="text-zinc-500 text-sm mt-1">{lang.sections.channels.desc}</p>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-2">
                <h4 className="font-black text-zinc-800 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  {lang.sections.channels.woo}
                </h4>
                <p className="text-zinc-500 text-sm pl-7">{lang.sections.channels.woo_d}</p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-2">
                <h4 className="font-black text-zinc-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  {lang.sections.channels.shopify}
                </h4>
                <p className="text-zinc-500 text-sm pl-7">{lang.sections.channels.shopify_d}</p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-2">
                <h4 className="font-black text-zinc-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  {lang.sections.channels.social}
                </h4>
                <p className="text-zinc-500 text-sm pl-7">{lang.sections.channels.social_d}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* SMTP & MAIL ALERTING CONTENT */}
        <TabsContent value="smtp" className="space-y-6">
          <Card className="rounded-[32px] border border-black/5 shadow-lg bg-white p-8 space-y-6">
            <div>
              <h3 className="text-2xl font-black text-zinc-950">{lang.sections.smtp.title}</h3>
              <p className="text-zinc-500 text-sm mt-1">{lang.sections.smtp.desc}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-zinc-600">
              <div className="space-y-3">
                <h4 className="font-bold text-zinc-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-500" /> {lang.sections.smtp.smtp_title}
                </h4>
                <p className="leading-relaxed">{lang.sections.smtp.smtp_d}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-zinc-800 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-500" /> {lang.sections.smtp.limits}
                </h4>
                <p className="leading-relaxed">{lang.sections.smtp.limits_d}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
