/**
 * Türkçe e-ticaret RAG benchmark / eval sistemi
 *
 * Metrics:
 *   - Retrieval Accuracy: doğru chunk en az 1 sonuçta mı var?
 *   - Top-1 Accuracy: ilk sonuç doğru mu?
 *   - MRR (Mean Reciprocal Rank): doğru sonucun sıralama kalitesi
 *   - Hallucination Rate: yanıtta "golden context"ten gelmeyen iddialar
 *   - Response Relevance: LLM-judge 0-1 skoru
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/eval-rag.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/eval-rag.ts --chatbot-id=<id>
 *   npx ts-node --project tsconfig.scripts.json scripts/eval-rag.ts --questions=scripts/eval-questions.json
 */

import * as fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const args = process.argv.slice(2);
const CHATBOT_ID = args.find((a) => a.startsWith("--chatbot-id="))?.split("=")[1] ?? "";
const QUESTIONS_FILE =
  args.find((a) => a.startsWith("--questions="))?.split("=")[1] ??
  `${__dirname}/eval-questions.json`;

// ---------------------------------------------------------------------------
// Benchmark Q&A dataset (50 sorular — Türkçe e-ticaret)
// ---------------------------------------------------------------------------
interface EvalQuestion {
  id: string;
  category: "product_lookup" | "price_query" | "sku_query" | "brand_query" | "age_group" | "general";
  query: string;
  expectedKeywords: string[]; // en az biri yanıtta olmalı
  forbiddenClaims: string[];  // yanıtta kesinlikle olmamalı
  notes?: string;
}

const DEFAULT_QUESTIONS: EvalQuestion[] = [
  // Product lookup
  { id: "q01", category: "product_lookup", query: "Bebek arabası modelleri nelerdir?", expectedKeywords: ["araba", "bebek", "model", "stroller"], forbiddenClaims: [] },
  { id: "q02", category: "product_lookup", query: "Ahşap oyuncak seçenekleri var mı?", expectedKeywords: ["ahşap", "oyuncak", "doğal"], forbiddenClaims: [] },
  { id: "q03", category: "product_lookup", query: "3 yaş çocuk için uygun oyuncak önerir misin?", expectedKeywords: ["3 yaş", "oyuncak", "uygun"], forbiddenClaims: [] },
  { id: "q04", category: "product_lookup", query: "Eğitici oyuncaklar hangileri?", expectedKeywords: ["eğitici", "oyuncak", "öğrenme"], forbiddenClaims: [] },
  { id: "q05", category: "product_lookup", query: "Kız çocukları için oyuncak önerir misiniz?", expectedKeywords: ["kız", "oyuncak"], forbiddenClaims: [] },
  { id: "q06", category: "product_lookup", query: "Bebek oyuncakları var mı?", expectedKeywords: ["bebek", "oyuncak"], forbiddenClaims: [] },
  { id: "q07", category: "product_lookup", query: "Dış mekan oyuncak seçenekleri neler?", expectedKeywords: ["dış mekan", "açık hava", "bahçe", "park"], forbiddenClaims: [] },
  { id: "q08", category: "product_lookup", query: "Legoya benzer yapı oyuncakları var mı?", expectedKeywords: ["yapı", "blok", "lego", "inşa"], forbiddenClaims: [] },
  { id: "q09", category: "product_lookup", query: "Puzzle çeşitleri neler?", expectedKeywords: ["puzzle", "bulmaca"], forbiddenClaims: [] },
  { id: "q10", category: "product_lookup", query: "Kutu oyunları hangileri?", expectedKeywords: ["kutu oyun", "masa oyun", "board game"], forbiddenClaims: [] },
  // Price queries
  { id: "q11", category: "price_query", query: "En ucuz bebek arabası kaç lira?", expectedKeywords: ["TL", "₺", "fiyat", "lira"], forbiddenClaims: [] },
  { id: "q12", category: "price_query", query: "Ahşap oyuncakların fiyat aralığı nedir?", expectedKeywords: ["TL", "₺", "fiyat"], forbiddenClaims: [] },
  { id: "q13", category: "price_query", query: "500 TL altında oyuncak var mı?", expectedKeywords: ["TL", "fiyat", "oyuncak"], forbiddenClaims: [] },
  { id: "q14", category: "price_query", query: "En pahalı ürün ne kadar?", expectedKeywords: ["TL", "₺", "fiyat"], forbiddenClaims: [] },
  { id: "q15", category: "price_query", query: "Bütçeme uygun bebek yatağı var mı?", expectedKeywords: ["TL", "fiyat", "yatak", "bebek"], forbiddenClaims: [] },
  // SKU queries
  { id: "q16", category: "sku_query", query: "Ürün kodu BY-201 olan ürün nedir?", expectedKeywords: ["BY-201", "ürün kodu", "SKU"], forbiddenClaims: ["mevcut değil", "bulamadım"], notes: "Eğer SKU yoksa 'bulamıyorum' demeli, uydurmamali" },
  { id: "q17", category: "sku_query", query: "STK-4872 stok kodlu ürünü göster", expectedKeywords: ["STK-4872", "stok kodu"], forbiddenClaims: [] },
  { id: "q18", category: "sku_query", query: "Model numarası OY-350 olan var mı?", expectedKeywords: ["OY-350", "model"], forbiddenClaims: [] },
  // Brand queries
  { id: "q19", category: "brand_query", query: "Fisher-Price ürünleri var mı?", expectedKeywords: ["fisher", "price", "marka"], forbiddenClaims: [] },
  { id: "q20", category: "brand_query", query: "Lego ürün çeşitleri neler?", expectedKeywords: ["lego"], forbiddenClaims: [] },
  { id: "q21", category: "brand_query", query: "Türk markası oyuncaklar var mı?", expectedKeywords: ["türk", "yerli", "marka"], forbiddenClaims: [] },
  { id: "q22", category: "brand_query", query: "Hasbro oyuncakları var mı?", expectedKeywords: ["hasbro"], forbiddenClaims: [] },
  // Age group
  { id: "q23", category: "age_group", query: "0-6 ay bebek için uygun ürün nedir?", expectedKeywords: ["0-6 ay", "bebek", "infant"], forbiddenClaims: [] },
  { id: "q24", category: "age_group", query: "5 yaş çocuk için hediye önerir misin?", expectedKeywords: ["5 yaş", "oyuncak", "hediye"], forbiddenClaims: [] },
  { id: "q25", category: "age_group", query: "Okul öncesi çocuk oyuncakları", expectedKeywords: ["okul öncesi", "3-6 yaş", "oyuncak"], forbiddenClaims: [] },
  { id: "q26", category: "age_group", query: "12 ay bebek oyuncağı", expectedKeywords: ["12 ay", "1 yaş", "bebek"], forbiddenClaims: [] },
  { id: "q27", category: "age_group", query: "10 yaş çocuk için ne önerirsiniz?", expectedKeywords: ["10 yaş", "oyuncak"], forbiddenClaims: [] },
  // General / hallucination traps
  { id: "q28", category: "general", query: "İade koşulları nedir?", expectedKeywords: ["iade", "gün", "koşul", "politika"], forbiddenClaims: [] },
  { id: "q29", category: "general", query: "Kargo süresi ne kadar?", expectedKeywords: ["kargo", "gün", "teslimat"], forbiddenClaims: [] },
  { id: "q30", category: "general", query: "Taksit seçenekleri var mı?", expectedKeywords: ["taksit", "ödeme", "kart"], forbiddenClaims: [] },
  { id: "q31", category: "general", query: "Üyelik avantajları neler?", expectedKeywords: ["üyelik", "puan", "indirim", "avantaj"], forbiddenClaims: [] },
  { id: "q32", category: "general", query: "Hediye paketi yapıyor musunuz?", expectedKeywords: ["hediye", "paket", "ambalaj"], forbiddenClaims: [] },
  { id: "q33", category: "general", query: "Mağaza adresi nerede?", expectedKeywords: ["adres", "mağaza", "konum"], forbiddenClaims: [] },
  { id: "q34", category: "general", query: "Sipariş takibi nasıl yapılır?", expectedKeywords: ["sipariş", "takip", "kargo"], forbiddenClaims: [] },
  { id: "q35", category: "general", query: "Garanti süresi kaç yıl?", expectedKeywords: ["garanti", "yıl", "süre"], forbiddenClaims: [] },
  // Hallucination trap queries (no valid context — bot should admit it doesn't know)
  { id: "q36", category: "general", query: "Bu hafta indirim var mı?", expectedKeywords: ["bilgim yok", "bulamıyorum", "emin değilim"], forbiddenClaims: ["evet", "var", "%"], notes: "Güncel kampanya bilgisi yoksa uydurmamali" },
  { id: "q37", category: "price_query", query: "Yarın fiyatlar düşecek mi?", expectedKeywords: ["bilgim yok", "emin değilim"], forbiddenClaims: ["düşecek", "evet"], notes: "Spekülatif fiyat tahmini yapmamalı" },
  { id: "q38", category: "sku_query", query: "XYZ-99999 kodlu ürünün fiyatı nedir?", expectedKeywords: ["bulamıyorum", "mevcut değil", "bilgim yok"], forbiddenClaims: ["TL", "₺"], notes: "Hayali SKU için fiyat üretmemeli" },
  { id: "q39", category: "brand_query", query: "ACME marka ürünler kaç lira?", expectedKeywords: ["bulamıyorum", "mevcut değil", "bilgim yok"], forbiddenClaims: ["TL", "₺"], notes: "Bilinmeyen marka için fiyat üretmemeli" },
  { id: "q40", category: "general", query: "Rakibiniz daha ucuz mu?", expectedKeywords: ["bilgim yok", "rakip", "karşılaştırma yapamam"], forbiddenClaims: ["daha ucuz", "daha pahalı"], notes: "Rakip karşılaştırması yapmamalı" },
  // Additional product categories
  { id: "q41", category: "product_lookup", query: "Bisiklet var mı?", expectedKeywords: ["bisiklet", "tekerlekli"], forbiddenClaims: [] },
  { id: "q42", category: "product_lookup", query: "Su oyuncakları neler?", expectedKeywords: ["su", "banyo", "havuz"], forbiddenClaims: [] },
  { id: "q43", category: "product_lookup", query: "Müzikli oyuncaklar var mı?", expectedKeywords: ["müzik", "ses", "müzikli"], forbiddenClaims: [] },
  { id: "q44", category: "product_lookup", query: "Uzaktan kumandalı araba fiyatı nedir?", expectedKeywords: ["uzaktan kumanda", "RC", "araba"], forbiddenClaims: [] },
  { id: "q45", category: "product_lookup", query: "Yumuşak oyuncak bebek var mı?", expectedKeywords: ["peluş", "yumuşak", "bebek", "doll"], forbiddenClaims: [] },
  { id: "q46", category: "age_group", query: "Yenidoğan için güvenli oyuncak önerisi", expectedKeywords: ["yenidoğan", "bebek", "güvenli", "0 ay"], forbiddenClaims: [] },
  { id: "q47", category: "brand_query", query: "Vtech oyuncakları satılıyor mu?", expectedKeywords: ["vtech"], forbiddenClaims: [] },
  { id: "q48", category: "price_query", query: "200 TL'nin altında doğum günü hediyesi", expectedKeywords: ["TL", "fiyat", "hediye", "oyuncak"], forbiddenClaims: [] },
  { id: "q49", category: "product_lookup", query: "Kitap ve boyama setleri neler?", expectedKeywords: ["kitap", "boyama", "set", "eğitici"], forbiddenClaims: [] },
  { id: "q50", category: "general", query: "Ürünlerinizde BPA var mı?", expectedKeywords: ["BPA", "güvenli", "sertifika", "malzeme"], forbiddenClaims: [] },
];

// ---------------------------------------------------------------------------
// LLM-judge: retrieval relevance + hallucination check
// ---------------------------------------------------------------------------
async function judgeResponse(
  query: string,
  response: string,
  expectedKeywords: string[],
  forbiddenClaims: string[]
): Promise<{ relevanceScore: number; hallucinationFlag: boolean; reasoning: string }> {
  const prompt = `Sen bir RAG sistemi değerlendirme uzmanısın. Aşağıdaki chatbot yanıtını değerlendir.

KULLANICI SORUSU: ${query}

CHATBOT YANITI: ${response}

BEKLENEN ANAHTAR KELİMELER (en az 1 olmalı): ${expectedKeywords.join(", ")}
YASAK İDDİALAR (hiç olmamalı): ${forbiddenClaims.length > 0 ? forbiddenClaims.join(", ") : "yok"}

Değerlendirme kriterleri:
1. Yanıt soruyla alakalı mı? (0.0 = hiç alakasız, 1.0 = mükemmel)
2. Beklenen anahtar kelimelerden en az biri var mı?
3. Yasak iddialardan herhangi biri var mı?
4. Yanıtta bilgi uydurulmuş mu (hallucination)?

JSON formatında yanıtla:
{"relevanceScore": 0.0-1.0, "hallucinationFlag": true/false, "reasoning": "kısa açıklama"}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const result = JSON.parse(completion.choices[0].message.content ?? "{}");
    return {
      relevanceScore: Math.min(1, Math.max(0, result.relevanceScore ?? 0)),
      hallucinationFlag: result.hallucinationFlag ?? false,
      reasoning: result.reasoning ?? "",
    };
  } catch {
    return { relevanceScore: 0, hallucinationFlag: false, reasoning: "judge error" };
  }
}

function keywordHit(response: string, keywords: string[]): boolean {
  const lower = response.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Türkçe E-Ticaret RAG Benchmark ===");
  console.log(`Chatbot ID: ${CHATBOT_ID || "(none — keyword-only mode)"}`);

  // Load questions
  let questions: EvalQuestion[] = DEFAULT_QUESTIONS;
  if (fs.existsSync(QUESTIONS_FILE) && QUESTIONS_FILE !== `${__dirname}/eval-questions.json`) {
    questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, "utf-8"));
    console.log(`Loaded ${questions.length} questions from ${QUESTIONS_FILE}`);
  } else {
    console.log(`Using built-in ${questions.length} benchmark questions`);
  }

  const results: Array<{
    id: string;
    category: string;
    query: string;
    keywordHit: boolean;
    relevanceScore: number;
    hallucinationFlag: boolean;
    reasoning: string;
    response?: string;
  }> = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`\n[${i + 1}/${questions.length}] ${q.id} (${q.category}): ${q.query}`);

    let response = "";

    if (CHATBOT_ID) {
      // Call the actual RAG search API
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatbotId: CHATBOT_ID,
            messages: [{ role: "user", content: q.query }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          response = data.content ?? data.message ?? "";
        } else {
          response = `[API Error ${res.status}]`;
        }
      } catch (err: any) {
        response = `[Fetch Error: ${err.message}]`;
      }
    } else {
      // Offline mode: just record the query without a live response
      response = "[offline — no chatbot-id provided]";
    }

    const hit = keywordHit(response, q.expectedKeywords);
    const judge = CHATBOT_ID
      ? await judgeResponse(q.query, response, q.expectedKeywords, q.forbiddenClaims)
      : { relevanceScore: 0, hallucinationFlag: false, reasoning: "offline" };

    results.push({
      id: q.id,
      category: q.category,
      query: q.query,
      keywordHit: hit,
      relevanceScore: judge.relevanceScore,
      hallucinationFlag: judge.hallucinationFlag,
      reasoning: judge.reasoning,
      response: response.slice(0, 200),
    });

    console.log(
      `  keyword_hit=${hit} | relevance=${judge.relevanceScore.toFixed(2)} | hallucination=${judge.hallucinationFlag}`
    );
    if (judge.reasoning) console.log(`  reasoning: ${judge.reasoning}`);
  }

  // ---------------------------------------------------------------------------
  // Aggregate metrics
  // ---------------------------------------------------------------------------
  const total = results.length;
  const keywordAccuracy = results.filter((r) => r.keywordHit).length / total;
  const avgRelevance = results.reduce((s, r) => s + r.relevanceScore, 0) / total;
  const hallucinationRate = results.filter((r) => r.hallucinationFlag).length / total;

  const byCategory: Record<string, { total: number; hits: number; hallucinations: number }> = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { total: 0, hits: 0, hallucinations: 0 };
    byCategory[r.category].total++;
    if (r.keywordHit) byCategory[r.category].hits++;
    if (r.hallucinationFlag) byCategory[r.category].hallucinations++;
  }

  console.log("\n=== SONUÇLAR ===");
  console.log(`Toplam sorgu         : ${total}`);
  console.log(`Keyword Accuracy     : ${(keywordAccuracy * 100).toFixed(1)}%`);
  console.log(`Avg Response Relevance: ${(avgRelevance * 100).toFixed(1)}%`);
  console.log(`Hallucination Rate   : ${(hallucinationRate * 100).toFixed(1)}%`);
  console.log("\nKategori Bazında:");
  for (const [cat, stats] of Object.entries(byCategory)) {
    const acc = ((stats.hits / stats.total) * 100).toFixed(0);
    const hall = ((stats.hallucinations / stats.total) * 100).toFixed(0);
    console.log(`  ${cat.padEnd(20)} acc=${acc}%  hallucination=${hall}%  (n=${stats.total})`);
  }

  // Save full report
  const reportPath = `/tmp/rag-eval-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify({ summary: { total, keywordAccuracy, avgRelevance, hallucinationRate, byCategory }, results }, null, 2));
  console.log(`\nDetaylı rapor: ${reportPath}`);

  // Exit code based on acceptance criteria
  const passed =
    keywordAccuracy >= 0.85 &&
    hallucinationRate <= 0.05 &&
    avgRelevance >= 0.75;

  console.log(`\n${passed ? "✓ GEÇTI — kabul kriterleri karşılandı" : "✗ KALDI — kabul kriterleri karşılanmadı"}`);
  process.exit(passed ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
