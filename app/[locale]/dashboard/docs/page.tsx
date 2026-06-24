"use client";

import { useLocale } from "next-intl";
import {
  BookOpen,
  HelpCircle,
  Bot,
  Globe,
  Settings,
  Zap,
  MessageSquare,
  ShoppingBag,
  ShoppingCart,
  Instagram,
  Facebook,
  CheckCircle,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Copy,
  ArrowRight,
  Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function DocsPage() {
  const locale = useLocale();
  const isTR = locale === "tr";

  const t = {
    badge: isTR ? "J.Caesar Bilgi Merkezi" : "J.Caesar Knowledge Hub",
    title: isTR ? "Kullanıcı Kılavuzu" : "User Guide",
    subtitle: isTR ? "& Platformu Keşfet" : "& Platform Guide",
    desc: isTR
      ? "J.Caesar platformunu adım adım öğrenin. Bot kurma, kanal bağlama, e-ticaret entegrasyonları ve sık sorulan sorular burada."
      : "Learn J.Caesar step by step. Bot creation, channel setup, e-commerce integrations, and frequently asked questions — all here.",
    tabs: {
      overview: isTR ? "Genel Bakış" : "Overview",
      bots: isTR ? "Bot Oluşturma" : "Bot Creation",
      channels: isTR ? "Kanallar" : "Channels",
      integrations: isTR ? "Entegrasyonlar" : "Integrations",
      faq: "SSS / FAQ",
    },
  };

  const overviewCards = [
    {
      icon: <Bot className="w-6 h-6 text-blue-500" />,
      bg: "bg-blue-50",
      title: isTR ? "Chatbot Kur, Eğit" : "Create & Train Bots",
      desc: isTR
        ? "Dakikalar içinde AI ajanı oluştur. PDF, URL veya metin yükle ve botunu eğit."
        : "Create an AI agent in minutes. Upload PDFs, URLs, or text and train your bot.",
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-emerald-500" />,
      bg: "bg-emerald-50",
      title: isTR ? "Kanalları Bağla" : "Connect Channels",
      desc: isTR
        ? "WhatsApp, Instagram, Telegram, Facebook Messenger, Slack kanallarına entegre ol."
        : "Integrate with WhatsApp, Instagram, Telegram, Facebook Messenger, and Slack.",
    },
    {
      icon: <ShoppingBag className="w-6 h-6 text-purple-500" />,
      bg: "bg-purple-50",
      title: isTR ? "E-Ticaret Entegrasyonu" : "E-Commerce Integration",
      desc: isTR
        ? "Shopify ve WooCommerce mağazanı bağla. Bot ürün arar, sipariş takibi yapar."
        : "Connect Shopify or WooCommerce. The bot searches products and tracks orders.",
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      bg: "bg-amber-50",
      title: isTR ? "Özel API & Webhook" : "Custom API & Webhooks",
      desc: isTR
        ? "Harici sistemlerinizden canlı veri çeken webhook araçları tanımla."
        : "Define webhook tools that pull live data from your own backend systems.",
    },
  ];

  const botSteps = [
    {
      num: "01",
      title: isTR ? "\"Yeni Chatbot\" Butonuna Tıkla" : "Click \"New Chatbot\"",
      desc: isTR
        ? "Sol menüden Chatbots sayfasına git ve sağ üstteki \"+ New Bot\" butonuna tıkla."
        : "Go to the Chatbots page from the left menu and click the \"+ New Bot\" button at the top right.",
    },
    {
      num: "02",
      title: isTR ? "Bot Adı ve Kişiliğini Belirle" : "Set Name & Personality",
      desc: isTR
        ? "Botunuza isim ver, karşılama mesajı ve AI talimatlarını (sistem promptu) yaz. Dili ve yanıt tonunu belirle."
        : "Give your bot a name, set a welcome message, and write AI instructions (system prompt). Set language and tone.",
    },
    {
      num: "03",
      title: isTR ? "Knowledge Base Ekle" : "Add Knowledge Base",
      desc: isTR
        ? "\"Sources\" sekmesinden URL gir, PDF yükle veya doğrudan metin yapıştır. Bot bu verileri kullanarak cevap verir."
        : "From the \"Sources\" tab, enter a URL, upload a PDF, or paste text. The bot uses this data to answer questions.",
    },
    {
      num: "04",
      title: isTR ? "Botu Test Et" : "Test Your Bot",
      desc: isTR
        ? "\"Test\" butonuna tıklayarak botunla konuş. Cevapların doğruluğunu kontrol et ve gerekirse kaynakları güncelle."
        : "Click \"Test\" to chat with your bot. Verify answer accuracy and update sources if needed.",
    },
    {
      num: "05",
      title: isTR ? "Kanala Bağla ve Yayınla" : "Connect Channel & Go Live",
      desc: isTR
        ? "\"Settings → Channels\" sekmesinden WhatsApp, Instagram veya istediğin kanalı bağla. Bot anında yayına girer."
        : "From \"Settings → Channels\", connect WhatsApp, Instagram, or any desired channel. The bot goes live immediately.",
    },
  ];

  const channelGuides = [
    {
      icon: <MessageSquare className="w-5 h-5 text-emerald-500" />,
      bg: "bg-emerald-50",
      name: "WhatsApp Business",
      badge: "Meta OAuth",
      steps: isTR
        ? [
            "J.Caesar Settings → Channels → WhatsApp'a tıkla",
            "\"Login with Facebook\" butonuna bas",
            "Meta hesabınla giriş yap ve WhatsApp Business hesabını seç",
            "Telefon numaranı onayla — bot otomatik bağlanır",
          ]
        : [
            "Go to J.Caesar Settings → Channels → Click WhatsApp",
            "Click the \"Login with Facebook\" button",
            "Log in with your Meta account and select your WhatsApp Business account",
            "Verify your phone number — bot connects automatically",
          ],
    },
    {
      icon: <Instagram className="w-5 h-5 text-pink-500" />,
      bg: "bg-pink-50",
      name: "Instagram DM",
      badge: "Meta OAuth",
      steps: isTR
        ? [
            "Instagram hesabın Profesyonel Hesap (İşletme veya İçerik Üretici) olmalı",
            "J.Caesar Settings → Channels → Instagram → Login with Facebook",
            "Meta'dan Instagram sayfanı seç ve \"Mesajlara Erişime İzin Ver\" onayını ver",
            "Instagram App Review onayı bekleniyor olabilir — bu normal",
          ]
        : [
            "Your Instagram account must be a Professional Account (Business or Creator)",
            "J.Caesar Settings → Channels → Instagram → Login with Facebook",
            "Select your Instagram page and grant \"Allow Access to Messages\"",
            "Instagram App Review approval may be pending — this is normal",
          ],
    },
    {
      icon: <Facebook className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50",
      name: "Facebook Messenger",
      badge: "Meta OAuth",
      steps: isTR
        ? [
            "Facebook Sayfana sahip olman gerekli (kişisel profil değil)",
            "J.Caesar Settings → Channels → Facebook → Login with Facebook",
            "Sayfanı seç ve Messenger erişimini onayla",
            "Bot artık Facebook Sayfanın gelen mesajlarını cevaplayacak",
          ]
        : [
            "You need a Facebook Page (not a personal profile)",
            "J.Caesar Settings → Channels → Facebook → Login with Facebook",
            "Select your page and confirm Messenger access",
            "The bot will now reply to messages on your Facebook Page",
          ],
    },
    {
      icon: <Globe className="w-5 h-5 text-indigo-500" />,
      bg: "bg-indigo-50",
      name: "Web Widget",
      badge: isTR ? "Embed Kodu" : "Embed Code",
      steps: isTR
        ? [
            "J.Caesar Settings → Widget sekmesini aç",
            "Renk, konum ve karşılama mesajını özelleştir",
            "Embed kodunu kopyala (<script> etiketi)",
            "Web sitendeki </body> etiketinden hemen önce yapıştır",
          ]
        : [
            "Open J.Caesar Settings → Widget tab",
            "Customize color, position, and welcome message",
            "Copy the embed code (<script> tag)",
            "Paste it just before the </body> tag on your website",
          ],
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-sky-500" />,
      bg: "bg-sky-50",
      name: "Telegram",
      badge: "BotFather",
      steps: isTR
        ? [
            "Telegram'da @BotFather'ı aç → /newbot komutunu gönder",
            "Botuna isim ver ve kullanıcı adı seç → token'ı kopyala",
            "J.Caesar Settings → Channels → Telegram → Token'ı yapıştır",
            "Bağlan — her bot için ayrı webhook otomatik kaydedilir",
          ]
        : [
            "Open @BotFather on Telegram → Send /newbot command",
            "Name your bot and pick a username → copy the token",
            "J.Caesar Settings → Channels → Telegram → Paste the token",
            "Connect — a unique webhook is auto-registered per bot",
          ],
    },
  ];

  const integrationGuides = [
    {
      icon: <ShoppingBag className="w-6 h-6 text-[#95BF47]" />,
      bg: "bg-lime-50",
      name: "Shopify",
      steps: isTR
        ? [
            "Shopify Admin → Ayarlar → Uygulamalar → Özel uygulamalar geliştir",
            "Uygulama oluştur → Admin API kapsamlarını yapılandır (read_products, read_orders)",
            "Kur → Admin API access token'ı kopyala",
            "J.Caesar Settings → Channels → Shopify → Domain ve token'ı gir",
          ]
        : [
            "Shopify Admin → Settings → Apps → Develop apps",
            "Create app → Configure Admin API scopes (read_products, read_orders)",
            "Install → Copy the Admin API access token",
            "J.Caesar Settings → Channels → Shopify → Enter domain and token",
          ],
    },
    {
      icon: <ShoppingCart className="w-6 h-6 text-[#96588a]" />,
      bg: "bg-purple-50",
      name: "WooCommerce",
      steps: isTR
        ? [
            "WooCommerce → Ayarlar → Gelişmiş → REST API",
            "\"Anahtar Ekle\" → İzinleri \"Okuma\" olarak ayarla → Oluştur",
            "Consumer Key ve Consumer Secret'ı kopyala",
            "J.Caesar Settings → Channels → WooCommerce → Bilgileri gir",
          ]
        : [
            "WooCommerce → Settings → Advanced → REST API",
            "\"Add Key\" → Set permissions to \"Read\" → Generate",
            "Copy the Consumer Key and Consumer Secret",
            "J.Caesar Settings → Channels → WooCommerce → Enter credentials",
          ],
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      bg: "bg-amber-50",
      name: isTR ? "Özel API / Webhook Araçları" : "Custom API / Webhook Tools",
      steps: isTR
        ? [
            "Chatbot Settings → AI Tools → \"Webhook Ekle\"",
            "HTTP Method (GET/POST), URL ve header'ları tanımla",
            "Dinamik parametreleri {{siparis_id}} formatında belirt",
            "Bot konuşma sırasında bu değerleri kullanıcıdan alır ve API'yi çağırır",
          ]
        : [
            "Chatbot Settings → AI Tools → \"Add Webhook\"",
            "Define HTTP Method (GET/POST), URL, and headers",
            "Specify dynamic parameters in {{order_id}} format",
            "The bot collects these values from the user during conversation and calls your API",
          ],
    },
  ];

  const faqItems = [
    {
      q: isTR ? "Bot neden cevap vermiyor?" : "Why isn't the bot responding?",
      a: isTR
        ? "Kanalın durumunu kontrol et (Settings → Channels → CONNECTED olmalı). WhatsApp/Instagram için webhook'un doğru konfigüre edildiğinden emin ol."
        : "Check channel status (Settings → Channels → must show CONNECTED). For WhatsApp/Instagram, ensure the webhook is correctly configured.",
    },
    {
      q: isTR ? "Knowledge base nasıl güncellenir?" : "How do I update the knowledge base?",
      a: isTR
        ? "Chatbot Settings → Sources sekmesinden yeni kaynak ekleyebilir veya mevcut kaynağı silebilirsin. Değişiklikler otomatik olarak yeniden index'lenir."
        : "From Chatbot Settings → Sources tab, add new sources or delete existing ones. Changes are automatically re-indexed.",
    },
    {
      q: isTR ? "Mesaj limitim doldu, ne yapmalıyım?" : "My message limit is full, what should I do?",
      a: isTR
        ? "Settings → Billing sekmesinden planını yükselt veya ek mesaj paketi satın al. Ek kredi anında hesabına eklenir."
        : "From Settings → Billing, upgrade your plan or purchase extra message credits. Additional credits are added to your account instantly.",
    },
    {
      q: isTR ? "İnsan desteğine nasıl yönlendirilir?" : "How is handoff to a human triggered?",
      a: isTR
        ? "Kullanıcı 'insan ile konuşmak istiyorum' dediğinde bot otomatik olarak 'transfer_to_human' aracını çalıştırır. AI duraklar ve operatör bildirimi gelir."
        : "When the user says they want to speak to a human, the bot automatically triggers the 'transfer_to_human' tool. AI pauses and an operator notification is sent.",
    },
    {
      q: isTR ? "Birden fazla bot oluşturabilir miyim?" : "Can I create multiple bots?",
      a: isTR
        ? "Evet! Planınıza göre birden fazla chatbot oluşturabilirsiniz. Her bot kendi kaynakları, kanalları ve ayarlarıyla bağımsız çalışır."
        : "Yes! Depending on your plan, you can create multiple chatbots. Each bot operates independently with its own sources, channels, and settings.",
    },
    {
      q: isTR ? "Hangi dosya formatları destekleniyor?" : "Which file formats are supported?",
      a: isTR
        ? "PDF, TXT, DOCX formatları destekleniyor. Ayrıca web URL'si ve doğrudan metin yapıştırma da kullanılabilir."
        : "PDF, TXT, and DOCX formats are supported. You can also use web URLs or paste text directly.",
    },
    {
      q: isTR ? "Bot yanlış cevap verirse ne yapmalıyım?" : "What if the bot gives a wrong answer?",
      a: isTR
        ? "Sources sekmesinden ilgili kaynağı güncelle veya doğrudan Q&A kart ekle. Q&A kartları her zaman en yüksek önceliğe sahiptir."
        : "Update the relevant source in the Sources tab or add a direct Q&A card. Q&A cards always have the highest priority.",
    },
    {
      q: isTR ? "Telegram'da birden fazla bot bağlayabilir miyim?" : "Can I connect multiple Telegram bots?",
      a: isTR
        ? "Evet. Her chatbot için ayrı bir Telegram botu oluşturabilirsiniz. Her bot, BotFather'dan aldığı token ile ayrı bir webhook URL'ine kayıt edilir."
        : "Yes. You can create a separate Telegram bot for each chatbot. Each bot is registered to a unique webhook URL with its BotFather token.",
    },
    {
      q: isTR ? "Randevu sistemi nasıl çalışır?" : "How does the appointment system work?",
      a: isTR
        ? "Takvim sayfasından randevuları yönet. Google Takvim'i bağlayarak çakışma kontrolü yapabilirsin. Müşteriler booking linki üzerinden randevu alabilir."
        : "Manage appointments from the Calendar page. Connect Google Calendar for collision detection. Customers can book through your booking link.",
    },
    {
      q: isTR ? "Veri güvende mi?" : "Is my data secure?",
      a: isTR
        ? "Tüm API anahtarları şifrelenerek saklanır. Webhook'lar imza doğrulama ile korunur. Tüm iletişim HTTPS üzerinden gerçekleşir."
        : "All API keys are stored encrypted. Webhooks are protected with signature verification. All communication is over HTTPS.",
    },
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Hero Header */}
      <div className="relative rounded-[40px] overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-10 md:p-14 shadow-2xl shadow-black/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10 space-y-4">
          <Badge className="bg-white/10 text-white border-none font-bold px-4 py-1 rounded-full text-xs">
            <BookOpen className="w-3 h-3 mr-2" />
            {t.badge}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            {t.title} <span className="text-blue-400">{t.subtitle}</span>
          </h1>
          <p className="text-zinc-400 font-medium max-w-xl leading-relaxed">{t.desc}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-5 rounded-2xl bg-muted/50 p-1 h-12">
          <TabsTrigger value="overview" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow">
            {t.tabs.overview}
          </TabsTrigger>
          <TabsTrigger value="bots" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow">
            {t.tabs.bots}
          </TabsTrigger>
          <TabsTrigger value="channels" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow">
            {t.tabs.channels}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow">
            {t.tabs.integrations}
          </TabsTrigger>
          <TabsTrigger value="faq" className="rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow">
            {t.tabs.faq}
          </TabsTrigger>
        </TabsList>

        {/* ── GENEL BAKIŞ ── */}
        <TabsContent value="overview" className="mt-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {overviewCards.map((card, i) => (
              <Card key={i} className="rounded-[32px] border-black/5 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8 flex gap-5">
                  <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center shrink-0`}>
                    {card.icon}
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-black text-zinc-900">{card.title}</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">{card.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-[32px] border-black/5 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h3 className="font-black text-zinc-900 text-lg">
                  {isTR ? "J.Caesar ile neler yapabilirsiniz?" : "What can you do with J.Caesar?"}
                </h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {(isTR
                  ? [
                      "7/24 otomatik müşteri hizmeti",
                      "WhatsApp, Instagram, Telegram'da AI bot",
                      "Shopify & WooCommerce sipariş takibi",
                      "Google Takvim entegrasyonu ile randevu",
                      "CRM — müşteri kaydı ve kanban görünümü",
                      "Özel API araçları ile harici veri çekme",
                    ]
                  : [
                      "24/7 automated customer service",
                      "AI bot on WhatsApp, Instagram, Telegram",
                      "Shopify & WooCommerce order tracking",
                      "Google Calendar-integrated scheduling",
                      "CRM — lead capture and kanban view",
                      "Custom API tools to pull external data",
                    ]
                ).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BOT OLUŞTURMA ── */}
        <TabsContent value="bots" className="mt-8 space-y-6">
          <div className="space-y-4">
            {botSteps.map((step, i) => (
              <Card key={i} className="rounded-[28px] border-black/5 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-7 flex gap-6 items-start">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-lg shrink-0">
                    {step.num}
                  </div>
                  <div className="space-y-1 pt-1">
                    <h3 className="font-black text-zinc-900 text-base">{step.title}</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">{step.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-[28px] border-amber-100 bg-amber-50">
            <CardContent className="p-6 flex gap-4">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-900 text-sm">
                  {isTR ? "İpucu: Sistem Promptu" : "Tip: System Prompt"}
                </p>
                <p className="text-sm text-amber-800 font-medium leading-relaxed">
                  {isTR
                    ? "Bot talimatlarına (sistem promptu) iş alanını, yanıt tonunu ve ne yapmaması gerektiğini açıkça yaz. Örn: \"Sen bir e-ticaret asistanısın. Politika dışı konularda yorum yapma.\""
                    : "In the bot instructions (system prompt), clearly state the business context, response tone, and what it should NOT do. Example: \"You are an e-commerce assistant. Do not comment on off-topic subjects.\""}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── KANALLAR ── */}
        <TabsContent value="channels" className="mt-8 space-y-6">
          {channelGuides.map((guide, i) => (
            <Card key={i} className="rounded-[32px] border-black/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="p-7 pb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${guide.bg} flex items-center justify-center`}>
                    {guide.icon}
                  </div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg font-black">{guide.name}</CardTitle>
                    <Badge className="bg-zinc-100 text-zinc-600 border-none font-bold rounded-lg text-xs">
                      {guide.badge}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-7 pb-7">
                <ol className="space-y-3">
                  {guide.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-zinc-700 font-medium">
                      <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {j + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── ENTEGRASYONLAR ── */}
        <TabsContent value="integrations" className="mt-8 space-y-6">
          {integrationGuides.map((guide, i) => (
            <Card key={i} className="rounded-[32px] border-black/5 hover:shadow-xl transition-all duration-300">
              <CardHeader className="p-7 pb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${guide.bg} flex items-center justify-center`}>
                    {guide.icon}
                  </div>
                  <CardTitle className="text-lg font-black">{guide.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-7 pb-7">
                <ol className="space-y-3">
                  {guide.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-zinc-700 font-medium">
                      <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {j + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}

          <Card className="rounded-[28px] border-blue-100 bg-blue-50">
            <CardContent className="p-6 flex gap-4">
              <Package className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-blue-900 text-sm">
                  {isTR ? "Trendyol Entegrasyonu" : "Trendyol Integration"}
                </p>
                <p className="text-sm text-blue-800 font-medium leading-relaxed">
                  {isTR
                    ? "Trendyol mağazanı bağlamak için Settings → Channels → Trendyol sayfasından Satıcı ID, API Anahtarı ve API Şifreni gir. Bot sipariş sorgulama ve ürün araması yapabilir."
                    : "To connect your Trendyol store, go to Settings → Channels → Trendyol and enter your Supplier ID, API Key, and API Secret. The bot can then query orders and search products."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SSS ── */}
        <TabsContent value="faq" className="mt-8 space-y-4">
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <Card key={i} className="rounded-[24px] border-black/5 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="font-black text-zinc-900 text-sm">{item.q}</p>
                  </div>
                  <div className="pl-7">
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">{item.a}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-[28px] border-zinc-100 bg-zinc-950 text-white">
            <CardContent className="p-8 text-center space-y-4">
              <h3 className="font-black text-xl">
                {isTR ? "Hâlâ sorunuz mu var?" : "Still have questions?"}
              </h3>
              <p className="text-zinc-400 font-medium text-sm">
                {isTR
                  ? "Destek ekibimize ulaşın veya chatbot'unuzu açarak denemeye başlayın."
                  : "Contact our support team or start experimenting with your chatbot."}
              </p>
              <a
                href="mailto:support@jcaesars.com"
                className="inline-flex items-center gap-2 bg-white text-zinc-900 font-black text-sm px-6 py-3 rounded-2xl hover:bg-zinc-100 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                support@jcaesars.com
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
